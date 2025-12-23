import React from 'react';
import { View, Text, StyleSheet, Image, TextInput, Pressable, KeyboardAvoidingView, Platform, Alert, ScrollView, useWindowDimensions } from 'react-native';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth, app } from '../../utils/firebase';
import { BouncyPressable } from '../../components/BouncyPressable';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, Feather, AntDesign, FontAwesome } from '@expo/vector-icons';
import { setAuthToken } from '../../utils/auth';
import { BASE_URL } from '../../utils/config';

interface AuthScreenProps {
  onBack?: () => void;
  onLogin?: (role: 'customer' | 'staff' | 'admin') => void;
  onSignUp?: () => void;
}

export default function AuthScreen({ onLogin, onSignUp, onBack }: AuthScreenProps) {
  const [phone, setPhone] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [role, setRole] = React.useState<'customer' | 'admin' | 'staff'>('customer');
  const [otp, setOtp] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [referralCode, setReferralCode] = React.useState('');
  // Admin/Staff OTP flow state
  const [adminOtpRequired, setAdminOtpRequired] = React.useState(false);
  const [adminOtp, setAdminOtp] = React.useState('');

  // Firebase Phone Auth state
  const recaptchaVerifier = React.useRef<FirebaseRecaptchaVerifierModal>(null);
  const [verificationId, setVerificationId] = React.useState<string | null>(null);

  const { width, height } = useWindowDimensions();

  // Comprehensive responsive breakpoints
  const isTinyWidth = width < 320;      // Very small phones
  const isCompactWidth = width < 360;   // Small phones  
  const isNormalWidth = width >= 360 && width < 400; // Normal phones
  const isLargeWidth = width >= 400 && width < 768;  // Large phones
  const isTabletWidth = width >= 768;   // Tablets

  // Dynamic scaling functions
  const scale = (size: number) => (width / 375) * size; // 375 is baseline (iPhone X)
  const verticalScale = (size: number) => (height / 812) * size;
  const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

  const isCustomer = role === 'customer';
  const canSubmit = isCustomer
    ? Boolean(phone.trim())
    : adminOtpRequired
      ? Boolean(adminOtp.trim())
      : Boolean(email.trim() && password.trim());

  const submitLabel = loading
    ? 'Please wait...'
    : isCustomer
      ? verificationId
        ? 'Log In'
        : 'Send OTP'
      : adminOtpRequired
        ? 'Verify OTP'
        : 'Log In';

  const fetchJson = async (input: RequestInfo | URL, init?: RequestInit) => {
    const resp = await fetch(input, init);
    const text = await resp.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`HTTP ${resp.status} ${resp.statusText} — ${text?.slice(0, 200)}`);
    }
    if (!resp.ok) {
      const msg = data?.error || data?.message || `HTTP ${resp.status} ${resp.statusText}`;
      throw new Error(msg);
    }
    return data;
  };

  const handleLogin = () => {
    if (!canSubmit || loading) {
      return;
    }
    if (isCustomer) {
      void handleCustomerFlow();
    } else {
      void handlePanelLogin(role);
    }
  };

  const handleCustomerFlow = async () => {
    try {
      setLoading(true);
      const trimmedPhone = phone.trim();
      const fullPhone = trimmedPhone.startsWith('+') ? trimmedPhone : `+91${trimmedPhone}`;

      if (!verificationId) {
        // Step 1: Send OTP via Firebase
        console.log('[Auth] Starting Firebase phone verification for:', fullPhone);
        auth.languageCode = 'en'; // Ensure SMS is in English
        const provider = new PhoneAuthProvider(auth);
        const verId = await provider.verifyPhoneNumber(
          fullPhone,
          recaptchaVerifier.current!
        );

        console.log('[Auth] Received verificationId:', verId);
        setVerificationId(verId);
        Alert.alert('OTP Sent', 'Please check your messages for the verification code.');
        return;
      }

      // Step 2: Verify OTP
      const credential = PhoneAuthProvider.credential(
        verificationId,
        otp.trim()
      );

      const userCredential = await signInWithCredential(auth, credential);
      const idToken = await userCredential.user.getIdToken();

      // Step 3: Send Firebase ID Token to our backend for session
      const customerData = await fetchJson(`${BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: trimmedPhone, // and original phone if needed
          firebaseToken: idToken,
          ...(referralCode.trim() ? { referralCode: referralCode.trim().toUpperCase() } : {}),
        }),
      });

      const token = customerData?.token || customerData?.accessToken || customerData?.jwt || customerData?.data?.token;
      if (token) {
        await setAuthToken(String(token));
      }
      onLogin?.('customer');
    } catch (error: any) {
      if (error?.code === 'auth/invalid-verification-code') {
        Alert.alert('Login failed', 'Invalid OTP code. Please try again.');
      } else {
        Alert.alert('Login failed', error?.message || 'Unable to process request');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePanelLogin = async (panelRole: 'admin' | 'staff') => {
    try {
      setLoading(true);
      const trimmedEmail = email.trim();
      const endpoint = panelRole === 'admin' ? 'admin' : 'staff';

      // If OTP is required and we have it, verify OTP
      if (adminOtpRequired && adminOtp.trim()) {
        const verifyResult = await fetchJson(`${BASE_URL}/api/auth/${endpoint}/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmedEmail, otp: adminOtp.trim() }),
        });

        const token = verifyResult?.token || verifyResult?.accessToken || verifyResult?.jwt || verifyResult?.data?.token;
        if (token) {
          await setAuthToken(String(token));
        }
        setAdminOtpRequired(false);
        setAdminOtp('');
        onLogin?.(panelRole);
        return;
      }

      // First step: send email/password
      const result = await fetchJson(`${BASE_URL}/api/auth/${endpoint}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      // Check if OTP is required
      if (result?.otpRequired) {
        setAdminOtpRequired(true);
        Alert.alert('OTP Sent', result?.message || 'Please check your email for the verification code.');
        return;
      }

      // Otherwise, we got a token directly (staff login or dev mode)
      const token = result?.token || result?.accessToken || result?.jwt || result?.data?.token;
      if (token) {
        await setAuthToken(String(token));
      }

      onLogin?.(panelRole);
    } catch (error: any) {
      Alert.alert('Login failed', error?.message || 'Unable to process request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <BouncyPressable style={styles.backButton} onPress={onBack} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </BouncyPressable>
        <Image
          source={require('../../assets/authpic2.png')}
          style={[styles.hero, { marginTop: verticalScale(60) }]}
          resizeMode="contain"
        />
      </View>

      <View style={[styles.sheetContainer, isTabletWidth && styles.sheetContainerWide]}>
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={[
            styles.sheet,
            {
              paddingHorizontal: scale(28),
              paddingTop: verticalScale(32),
              paddingBottom: verticalScale(40),
            },
            isTabletWidth && styles.sheetLarge,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { fontSize: moderateScale(26) }]}>Log In</Text>

          <View style={[styles.roleRow, isCompactWidth && styles.roleRowCompact]}>
            {(['customer', 'admin', 'staff'] as const).map((item) => {
              const isActive = role === item;
              return (
                <BouncyPressable
                  key={item}
                  style={[styles.roleButton, isActive && styles.roleButtonActive, isCompactWidth && styles.roleButtonCompact]}
                  onPress={() => setRole(item)}
                  hitSlop={6}
                >
                  <Text style={[styles.roleText, isActive && styles.roleTextActive]}>
                    {item.charAt(0).toUpperCase() + item.slice(1)}
                  </Text>
                </BouncyPressable>
              );
            })}
          </View>

          {isCustomer ? (
            <>
              <View style={[styles.inputRow, isCompactWidth && styles.inputRowCompact]}>
                <Ionicons name="call-outline" size={18} color="#4b5563" />
                <Text style={styles.prefix}>+91</Text>
                <Ionicons name="chevron-down" size={14} color="#4b5563" style={styles.prefixCaret} />
                <View style={styles.inputDivider} />
                <TextInput
                  placeholder="Phone Number"
                  placeholderTextColor="#6b7280"
                  keyboardType="phone-pad"
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>

              <View style={[styles.inputRow, isCompactWidth && styles.inputRowCompact]}>
                <Ionicons name="keypad-outline" size={18} color="#4b5563" />
                <TextInput
                  placeholder="OTP"
                  placeholderTextColor="#6b7280"
                  keyboardType="number-pad"
                  style={[styles.input, styles.inputWithIcon]}
                  value={otp}
                  onChangeText={setOtp}
                />
              </View>

              <View style={[styles.inputRow, isCompactWidth && styles.inputRowCompact]}>
                <Ionicons name="pricetag-outline" size={18} color="#4b5563" />
                <TextInput
                  placeholder="Referral Code (optional)"
                  placeholderTextColor="#6b7280"
                  autoCapitalize="characters"
                  style={[styles.input, styles.inputWithIcon]}
                  value={referralCode}
                  onChangeText={(t) => setReferralCode(t.toUpperCase())}
                />
              </View>
            </>
          ) : (
            <>
              <View style={[styles.inputRow, isCompactWidth && styles.inputRowCompact]}>
                <Ionicons name="mail-outline" size={18} color="#4b5563" />
                <TextInput
                  placeholder="Email"
                  placeholderTextColor="#6b7280"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={[styles.input, styles.inputWithIcon]}
                  value={email}
                  onChangeText={setEmail}
                  editable={!adminOtpRequired}
                />
              </View>

              {!adminOtpRequired ? (
                <View style={[styles.inputRow, isCompactWidth && styles.inputRowCompact]}>
                  <Ionicons name="lock-closed-outline" size={18} color="#4b5563" />
                  <TextInput
                    placeholder="Password"
                    placeholderTextColor="#6b7280"
                    secureTextEntry
                    style={[styles.input, styles.inputWithIcon]}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <Feather name="eye-off" size={18} color="#9ca3af" />
                </View>
              ) : (
                <View style={[styles.inputRow, isCompactWidth && styles.inputRowCompact]}>
                  <Ionicons name="keypad-outline" size={18} color="#4b5563" />
                  <TextInput
                    placeholder="Enter OTP from email"
                    placeholderTextColor="#6b7280"
                    keyboardType="number-pad"
                    style={[styles.input, styles.inputWithIcon]}
                    value={adminOtp}
                    onChangeText={setAdminOtp}
                    maxLength={6}
                  />
                </View>
              )}
            </>
          )}

          {!isCustomer && (
            <BouncyPressable style={styles.forgotPress}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </BouncyPressable>
          )}

          <BouncyPressable
            style={[styles.primaryButton, !canSubmit && styles.primaryDisabled]}
            onPress={handleLogin}
            disabled={!canSubmit}
          >
            <Text style={styles.primaryText}>{submitLabel}</Text>
          </BouncyPressable>

          <View style={styles.socialRow}>
            <BouncyPressable style={styles.socialButton}>
              <AntDesign name="google" size={18} color="#f97316" />
            </BouncyPressable>
            <BouncyPressable style={styles.socialButton}>
              <AntDesign name="twitter" size={18} color="#38bdf8" />
            </BouncyPressable>
            <BouncyPressable style={styles.socialButton}>
              <FontAwesome name="facebook" size={18} color="#3b82f6" />
            </BouncyPressable>
          </View>

          <BouncyPressable style={styles.signupRow} onPress={onSignUp}>
            <Text style={styles.signupText}>Don’t have an account? <Text style={styles.signupEmphasis}>Sign Up</Text></Text>
          </BouncyPressable>
        </ScrollView>
      </View>
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={app.options}
        attemptInvisibleVerification={true}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f6f6',
  },
  header: {
    paddingTop: 12,
    paddingHorizontal: 24,
  },
  backButton: {
    position: 'absolute',
    top: 18,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8eeee',
    zIndex: 2,
  },
  hero: {
    width: '100%',
    height: undefined,
    aspectRatio: 2,
    marginTop: 60,
    maxHeight: 200,
  },
  sheetContainer: {
    flex: 1,
    marginTop: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  sheetContainerWide: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 560,
  },
  sheetScroll: {
    flex: 1,
  },
  sheet: {
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 40,
    gap: 22,
    flexGrow: 1,
  },
  sheetLarge: {
    paddingHorizontal: 48,
  },
  sheetCompact: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 28,
    gap: 18,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
  },
  titleCompact: {
    fontSize: 22,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#d1d5db',
    paddingBottom: 16,
  },
  inputRowCompact: {
    paddingBottom: 12,
  },
  prefix: {
    marginLeft: 10,
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  prefixCaret: {
    marginLeft: 4,
  },
  inputDivider: {
    height: 20,
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#d1d5db',
    marginHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
  },
  inputWithIcon: {
    marginLeft: 12,
  },
  forgotPress: {
    alignSelf: 'flex-end',
    marginTop: -4,
  },
  forgotText: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#36ad3c',
    borderRadius: 28,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryDisabled: {
    backgroundColor: '#9dd49f',
  },
  primaryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  roleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  roleRowCompact: {
    gap: 8,
  },
  roleButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#cbd5f5',
    backgroundColor: '#f8fbff',
    paddingVertical: 10,
    alignItems: 'center',
  },
  roleButtonCompact: {
    marginHorizontal: 2,
    paddingVertical: 8,
  },
  roleButtonActive: {
    backgroundColor: '#e0f2ff',
    borderColor: '#38bdf8',
  },
  roleText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  roleTextActive: {
    color: '#0f172a',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  socialButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  signupRow: {
    alignItems: 'center',
    marginTop: -6,
  },
  signupText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  signupEmphasis: {
    color: '#111827',
    fontWeight: '700',
  },
});
