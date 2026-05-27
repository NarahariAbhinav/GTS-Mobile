import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../utils/firebaseConfig';
import { loginWithFirebase } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../utils/theme';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      const result = await loginWithFirebase();
      login(result.user);
      navigation.replace('Dashboard');
    } catch (error: any) {
      let message = 'Login failed. Please check your credentials.';
      if (error?.code === 'auth/user-not-found' || error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential') {
        message = 'Invalid email or password. Please try again.';
      } else if (error?.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      } else if (error?.code === 'auth/network-request-failed') {
        message = 'Network error. Check your internet connection.';
      } else if (error?.response?.data?.error) {
        message = error.response.data.error;
      } else if (error?.message) {
        message = error.message;
      }
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      Alert.alert('Missing Email', 'Please enter your work email address.');
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setForgotModalVisible(false);
      setResetEmail('');
      Alert.alert(
        'Email Sent ✅',
        `A password reset link has been sent to ${resetEmail.trim()}.\n\nCheck your inbox and follow the link to set a new password.`
      );
    } catch (error: any) {
      let message = 'Failed to send reset email.';
      if (error?.code === 'auth/user-not-found') message = 'No account found with this email.';
      else if (error?.code === 'auth/invalid-email') message = 'Please enter a valid email address.';
      Alert.alert('Error', message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>

        {/* Top branding area */}
        <View style={styles.brandArea}>
          <View style={styles.logoBox}>
            <MaterialCommunityIcons name="tshirt-crew-outline" size={32} color={COLORS.cream} />
          </View>
          <Text style={styles.brandTitle}>GTS</Text>
          <Text style={styles.brandSub}>Track every garment, every step</Text>
        </View>

        {/* Login card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>
          <Text style={styles.cardSub}>Enter your work email and password</Text>

          <Text style={styles.fieldLabel}>Work Email</Text>
          <View style={styles.inputRow}>
            <Feather name="mail" size={16} color={COLORS.muted} style={styles.inputIcon} />
            <TextInput
              style={styles.inputField}
              placeholder="yourname@company.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor={COLORS.placeholder}
            />
          </View>

          <View style={styles.passwordLabelRow}>
            <Text style={styles.fieldLabel}>Password</Text>
            <TouchableOpacity onPress={() => { setResetEmail(email); setForgotModalVisible(true); }}>
              <Text style={styles.forgotLink}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.inputRow}>
            <Feather name="lock" size={16} color={COLORS.muted} style={styles.inputIcon} />
            <TextInput
              style={styles.inputField}
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholderTextColor={COLORS.placeholder}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={COLORS.muted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>Sign In</Text>
                <Feather name="arrow-right" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          {/* Sign Up info row */}
          <View style={styles.signUpRow}>
            <Text style={styles.signUpText}>New employee? </Text>
            <TouchableOpacity onPress={() => Alert.alert('Account Access', 'To get access, ask your Admin to create an account for you in the Garment Tracker app.\n\nYou will receive your email and password from them.')}>
              <Text style={styles.signUpLink}>How to get access →</Text>
            </TouchableOpacity>
          </View>
        </View>

      </KeyboardAvoidingView>

      {/* Forgot Password Modal */}
      <Modal visible={forgotModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconBox}>
                <Feather name="key" size={20} color={COLORS.denim} />
              </View>
              <TouchableOpacity onPress={() => setForgotModalVisible(false)}>
                <Feather name="x" size={22} color={COLORS.muted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalTitle}>Reset Password</Text>
            <Text style={styles.modalSub}>Enter your work email and we'll send you a link to reset your password.</Text>

            <Text style={styles.fieldLabel}>Work Email</Text>
            <View style={styles.inputRow}>
              <Feather name="mail" size={16} color={COLORS.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="yourname@company.com"
                value={resetEmail}
                onChangeText={setResetEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor={COLORS.placeholder}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, resetLoading && styles.buttonDisabled]}
              onPress={handleForgotPassword}
              disabled={resetLoading}
              activeOpacity={0.8}
            >
              {resetLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="send" size={16} color="#fff" />
                  <Text style={styles.buttonText}>Send Reset Link</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelLink} onPress={() => setForgotModalVisible(false)}>
              <Text style={styles.cancelLinkText}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.indigo },
  inner: { flex: 1, justifyContent: 'center' },

  brandArea: { alignItems: 'center', marginBottom: 32 },
  logoBox: {
    width: 64, height: 64, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  brandTitle: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  brandSub: { fontSize: 14, color: 'rgba(255,255,255,0.55)', marginTop: 4 },

  card: {
    backgroundColor: COLORS.warmWhite, marginHorizontal: 24, borderRadius: 20,
    padding: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08, shadowRadius: 24, elevation: 10,
  },
  cardTitle: { fontSize: 22, fontWeight: '700', color: COLORS.dark, marginBottom: 4 },
  cardSub: { fontSize: 13, color: COLORS.muted, marginBottom: 24 },

  passwordLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  forgotLink: { fontSize: 12, fontWeight: '600', color: COLORS.copper },

  fieldLabel: {
    fontSize: 11, fontWeight: '600', color: COLORS.muted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.cream, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, marginBottom: 16, paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 8 },
  inputField: { flex: 1, paddingVertical: 14, fontSize: 15, color: COLORS.dark },
  eyeBtn: { paddingLeft: 8 },

  button: {
    width: '100%', backgroundColor: COLORS.copper, padding: 16, borderRadius: 12,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 8,
  },
  buttonDisabled: { backgroundColor: COLORS.muted },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },

  signUpRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 18 },
  signUpText: { fontSize: 13, color: COLORS.muted },
  signUpLink: { fontSize: 13, fontWeight: '700', color: COLORS.denim },

  // Forgot Password Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(3,14,23,0.6)' },
  modalContent: { backgroundColor: COLORS.warmWhite, padding: 28, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#eef3f7', justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.dark, marginBottom: 6 },
  modalSub: { fontSize: 13, color: COLORS.muted, lineHeight: 19, marginBottom: 24 },
  cancelLink: { alignItems: 'center', marginTop: 16 },
  cancelLinkText: { fontSize: 14, color: COLORS.muted, fontWeight: '500' },
});
