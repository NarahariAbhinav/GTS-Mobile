import React from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardScreen from '../screens/DashboardScreen';
import EmployeeWorkspaceScreen from '../screens/EmployeeWorkspaceScreen';

// This wrapper renders the Admin dashboard or Employee workspace
// based on the logged-in user's role
export default function HomeScreenWrapper(props: any) {
  const { isAdmin } = useAuth();

  if (isAdmin) {
    return <DashboardScreen {...props} />;
  }
  return <EmployeeWorkspaceScreen {...props} />;
}
