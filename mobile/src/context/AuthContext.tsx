import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../utils/firebaseConfig';
import { loginWithFirebase } from '../utils/api';

export interface User {
  id: string;
  employee_name: string;
  email: string;
  department: string;
  designation: string;
  role: 'Admin' | 'Employee';
  phone_number?: string;
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isLoading: boolean;   // true while checking persisted session on startup
  login: (userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoggedIn: false,
  isAdmin: false,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listen to Firebase Auth state — fires immediately on app start
    // If Firebase has a saved session (AsyncStorage), it restores it here
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Firebase session found — fetch employee profile from backend
        try {
          const result = await loginWithFirebase();
          setUser(result.user);
        } catch (err) {
          // Profile fetch failed (e.g. backend down) — stay logged out
          console.warn('Auto-login failed:', err);
          setUser(null);
        }
      } else {
        // No Firebase session — show login screen
        setUser(null);
      }
      setIsLoading(false);
    });

    return unsubscribe; // cleanup listener on unmount
  }, []);

  const login = (userData: User) => {
    setUser(userData);
  };

  const logout = async () => {
    await signOut(auth); // clear Firebase session from AsyncStorage
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isLoggedIn: !!user,
    isAdmin: user?.role === 'Admin',
    isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
