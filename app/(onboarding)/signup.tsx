import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CultureTokens, gradients, CardTokens, glass, shadows } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { auth as firebaseAuth } from '@/lib/firebase';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  OAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { SocialButton } from '@/components/ui/SocialButton';
import { PasswordStrengthIndicator } from '@/components/ui/PasswordStrengthIndicator';
import { LinearGradient } from 'expo-linear-gradient';
import * as AppleAuthentication from 'expo-apple-authentication';

export default function SignUpScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1024;
  const topInset = Platform.OS === 'web' ? 0 : insets.top;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [role, setRole] = useState<'user' | 'organizer'>('user');
  
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [globalError, setGlobalError] = useState('');
  
  const [loading, setLoading] = useState(false);

  // Form logic (eager normalization)
  const normalizedName = useMemo(() => name.trim(), [name]);
  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const isValid = useMemo(() => {
    return normalizedName.length > 1 && normalizedEmail.includes('@') && password.length >= 6 && agreed;
  }, [normalizedName, normalizedEmail, password, agreed]);

  const clearErrors = useCallback(() => {
    if (nameError) setNameError('');
    if (emailError) setEmailError('');
    if (passwordError) setPasswordError('');
    if (globalError) setGlobalError('');
  }, [nameError, emailError, passwordError, globalError]);

  const validate = () => {
    let valid = true;
    if (normalizedName.length < 2) {
      setNameError('Please enter your full name.');
      valid = false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setEmailError('Please enter a valid email address.');
      valid = false;
    }
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      valid = false;
    }
    if (!agreed) {
      setGlobalError('You must agree to the Terms of Service to continue.');
      valid = false;
    }
    return valid;
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    clearErrors();
    try {
      if (Platform.OS === 'web') {
        await setPersistence(firebaseAuth, browserLocalPersistence);
        const provider = new GoogleAuthProvider();
        await signInWithPopup(firebaseAuth, provider);
      } else {
        const { GoogleSignin } = require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin');
        GoogleSignin.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID });
        await GoogleSignin.hasPlayServices();
        await GoogleSignin.signIn();
        const tokens = await GoogleSignin.getTokens();
        const credential = GoogleAuthProvider.credential(tokens.idToken);
        await signInWithCredential(firebaseAuth, credential);
      }
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(onboarding)/location');
    } catch (e: any) {
      const code = e?.code;
      if (!['auth/popup-closed-by-user', 'auth/cancelled-popup-request', '-5'].includes(code)) {
        setGlobalError('Google sign-up failed. Please try again.');
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignUp = async () => {
    if (Platform.OS !== 'ios') return;
    setLoading(true);
    clearErrors();
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const provider = new OAuthProvider('apple.com');
      const firebaseCredential = provider.credential({
        idToken: credential.identityToken ?? '',
        rawNonce: credential.authorizationCode ?? '',
      });
      await signInWithCredential(firebaseAuth, firebaseCredential);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(onboarding)/location');
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        setGlobalError('Apple sign-up failed. Please try again.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    clearErrors();
    if (!validate()) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    try {
      if (Platform.OS === 'web') {
        await setPersistence(firebaseAuth, browserLocalPersistence);
      }
      const credential = await createUserWithEmailAndPassword(firebaseAuth, normalizedEmail, password);
      // Try to immediately set the display name on the Firebase user object
      await updateProfile(credential.user, { displayName: normalizedName });
      
      // Force token refresh so custom claims can be generated/inferred if needed
      await credential.user.getIdToken(true);
      
      // Sync to backend DB
      await api.auth.register({ displayName: normalizedName, role });

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.replace('/(onboarding)/location');
    } catch (e: any) {
      const code = e?.code;
      if (code === 'auth/email-already-in-use') {
        setEmailError('An account with this email already exists.');
      } else if (code === 'auth/invalid-email') {
        setEmailError('Please enter a valid email address.');
      } else if (code === 'auth/weak-password') {
        setPasswordError('Password must be at least 6 characters.');
      } else {
        setGlobalError('Registration failed. Please try again.');
      }
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={gradients.culturepassBrand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBg}
      />
      
      {/* Decorative Orbs */}
      {Platform.OS === 'web' ? (
        <>
          <View style={[styles.orb, { top: -100, right: -50, backgroundColor: CultureTokens.indigo, opacity: 0.5, filter: 'blur(50px)' } as any]} />
          <View style={[styles.orb, { bottom: -50, left: -50, backgroundColor: CultureTokens.saffron, opacity: 0.3, filter: 'blur(50px)' } as any]} />
        </>
      ) : null}

      {isDesktop && (
        <View style={styles.desktopBackRow}>
          <Pressable 
            onPress={() => router.replace('/(tabs)')} 
            hitSlop={8} 
            style={[styles.desktopBackBtn, { backgroundColor: glass.overlay.backgroundColor, borderColor: colors.border }]}
          >
            <Ionicons name="chevron-back" size={18} color={colors.textInverse} />
            <Text style={[styles.desktopBackText, { color: colors.textInverse }]}>Back to Discover</Text>
          </Pressable>
        </View>
      )}

      {!isDesktop && (
        <View style={[styles.mobileHeader, { paddingTop: topInset + 12 }]}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} hitSlop={12}>
            <Ionicons name="close" size={28} color={colors.textInverse} />
          </Pressable>
        </View>
      )}

      <KeyboardAvoidingView 
        style={styles.keyboardAvoid} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      >
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          keyboardShouldPersistTaps="handled" 
          contentContainerStyle={[
            styles.scrollContent,
            isDesktop && styles.scrollContentDesktop,
            !isDesktop && { paddingTop: 20 }
          ]}
        >
          <View style={[styles.formContainer, isDesktop && styles.formContainerDesktop, { borderRadius: CardTokens.radiusLarge }]}>
            {Platform.OS === 'ios' || Platform.OS === 'web' ? (
              <BlurView intensity={isDesktop ? 60 : 40} tint="dark" style={[StyleSheet.absoluteFill, styles.formBlur, { borderRadius: CardTokens.radiusLarge, borderColor: colors.borderLight }]} />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.formBlur, { backgroundColor: colors.surface, borderRadius: CardTokens.radiusLarge, borderColor: colors.borderLight }]} />
            )}

            <View style={[styles.formContent, { padding: CardTokens.paddingLarge * 2 }]}>
              <View style={styles.logoRow}>
                <View style={[styles.logoCircle, { backgroundColor: colors.overlay, borderColor: colors.borderLight }]}>
                  <Ionicons name="globe-outline" size={32} color={colors.textInverse} />
                </View>
                <Text style={[styles.brandLabel, { color: colors.textInverse }]}>CulturePass.app</Text>
              </View>

              <Text style={[styles.title, { color: colors.textInverse }]}>Create Account.</Text>
              <Text style={[styles.benefitsRow, { color: CultureTokens.saffron }]}>
                🎉 Free events · Community access · Exclusive perks
              </Text>

              {globalError ? (
                <View style={[styles.errorBanner, { backgroundColor: CultureTokens.coral + '20', borderColor: CultureTokens.coral + '50' }]}>
                  <Ionicons name="alert-circle" size={20} color={CultureTokens.coral} />
                  <Text style={[styles.globalErrorText, { color: CultureTokens.coral }]}>{globalError}</Text>
                </View>
              ) : null}

              <View style={styles.roleToggleGroup}>
                <Text style={[styles.roleLabel, { color: colors.textSecondary }]}>I want to...</Text>
                <View style={styles.roleRow}>
                  <Pressable
                    style={[
                      styles.roleOption, 
                      role === 'user' && { backgroundColor: colors.primaryGlow, borderColor: colors.primary },
                      role !== 'user' && { backgroundColor: 'transparent', borderColor: colors.borderLight }
                    ]}
                    onPress={() => { setRole('user'); if(Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  >
                    <Ionicons name="compass-outline" size={20} color={role === 'user' ? colors.textInverse : colors.textSecondary} />
                    <Text style={[styles.roleOptionText, role === 'user' ? { color: colors.textInverse, fontFamily: 'Poppins_600SemiBold' } : { color: colors.textSecondary }]}>Discover Events</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.roleOption, 
                      role === 'organizer' && { backgroundColor: colors.primaryGlow, borderColor: colors.primary },
                      role !== 'organizer' && { backgroundColor: 'transparent', borderColor: colors.borderLight }
                    ]}
                    onPress={() => { setRole('organizer'); if(Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  >
                    <Ionicons name="calendar-outline" size={20} color={role === 'organizer' ? colors.textInverse : colors.textSecondary} />
                    <Text style={[styles.roleOptionText, role === 'organizer' ? { color: colors.textInverse, fontFamily: 'Poppins_600SemiBold' } : { color: colors.textSecondary }]}>Host Events</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Input
                    label="Full Name"
                    placeholder="Enter your full name"
                    leftIcon="person-outline"
                    value={name}
                    onChangeText={(v) => { setName(v); clearErrors(); }}
                    autoCapitalize="words"
                    returnKeyType="next"
                    error={nameError}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Input
                    label="Email Address"
                    placeholder="you@example.com"
                    leftIcon="mail-outline"
                    value={email}
                    onChangeText={(v) => { setEmail(v); clearErrors(); }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    returnKeyType="next"
                    error={emailError}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Input
                    label="Password"
                    placeholder="Min. 6 characters"
                    leftIcon="lock-closed-outline"
                    value={password}
                    onChangeText={(v) => { setPassword(v); clearErrors(); }}
                    passwordToggle
                    returnKeyType="done"
                    onSubmitEditing={handleSignUp}
                    error={passwordError}
                  />
                  {password.length > 0 && <PasswordStrengthIndicator password={password} />}
                </View>
              </View>

              <View style={styles.optionsRow}>
                <Checkbox
                  checked={agreed}
                  onToggle={(v) => { setAgreed(v); clearErrors(); }}
                  label={
                    <Text style={[styles.checkText, { color: colors.textInverse }]}>
                      I agree to the <Text style={[styles.linkText, { color: CultureTokens.saffron }]} onPress={() => router.push('/legal/terms')}>Terms</Text> & <Text style={[styles.linkText, { color: CultureTokens.saffron }]} onPress={() => router.push('/legal/privacy')}>Privacy</Text>
                    </Text>
                  }
                />
              </View>

              <Button
                variant="primary"
                size="lg"
                fullWidth
                rightIcon="arrow-forward"
                loading={loading}
                disabled={!isValid || loading}
                onPress={handleSignUp}
                style={[styles.submitBtn, shadows.medium, { backgroundColor: CultureTokens.saffron }]}
              >
                Create Account
              </Button>

              <View style={styles.socialDivider}>
                <View style={[styles.divLine, { backgroundColor: colors.borderLight }]} />
                <Text style={[styles.divText, { color: colors.textSecondary }]}>or sign up with</Text>
                <View style={[styles.divLine, { backgroundColor: colors.borderLight }]} />
              </View>

              <View style={styles.socialRow}>
                <SocialButton provider="google" onPress={handleGoogleSignUp} disabled={loading} />
                {Platform.OS === 'ios' ? (
                  <SocialButton provider="apple" onPress={handleAppleSignUp} disabled={loading} />
                ) : (
                  <SocialButton provider="apple" comingSoon disabled={loading} />
                )}
              </View>

              <Pressable style={styles.switchRow} onPress={() => router.replace('/(onboarding)/login')} hitSlop={12}>
                <Text style={[styles.switchText, { color: colors.textSecondary }]}>
                  Already have an account? <Text style={[styles.switchLink, { color: CultureTokens.saffron }]}>Sign In</Text>
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { flex: 1 },
  gradientBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.85 },
  orb: { position: 'absolute', width: 300, height: 300, borderRadius: 150 },
  keyboardAvoid: { flex: 1 },
  mobileHeader: { paddingHorizontal: 20, paddingBottom: 12 },
  desktopBackRow: { position: 'absolute', top: 32, left: 40, zIndex: 10 },
  desktopBackBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1 },
  desktopBackText: { fontSize: 14, fontFamily: 'Poppins_500Medium' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 60, justifyContent: 'center' },
  scrollContentDesktop: { paddingVertical: 60 },
  formContainer: { width: '100%', maxWidth: 460, alignSelf: 'center', overflow: 'hidden' },
  formContainerDesktop: { maxWidth: 520 },
  formBlur: { borderWidth: 1 },
  formContent: { paddingTop: 40 },
  logoRow: { alignItems: 'center', marginBottom: 20 },
  logoCircle: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1 },
  brandLabel: { fontSize: 12, fontFamily: 'Poppins_700Bold', letterSpacing: 3, textTransform: 'uppercase' },
  title: { fontSize: 34, fontFamily: 'Poppins_700Bold', textAlign: 'center', marginBottom: 8, letterSpacing: -0.5 },
  benefitsRow: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', textAlign: 'center', marginBottom: 32 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, marginBottom: 24, borderWidth: 1 },
  globalErrorText: { flex: 1, fontSize: 14, fontFamily: 'Poppins_500Medium' },
  roleToggleGroup: { marginBottom: 20 },
  roleLabel: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  roleRow: { flexDirection: 'row', gap: 10 },
  roleOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 16, borderWidth: 1 },
  roleOptionText: { fontSize: 14, fontFamily: 'Poppins_500Medium' },
  form: { gap: 20, marginBottom: 20 },
  inputGroup: { gap: 8 },
  optionsRow: { marginBottom: 32 },
  checkText: { flex: 1, fontSize: 13, fontFamily: 'Poppins_400Regular', lineHeight: 20 },
  linkText: { fontFamily: 'Poppins_600SemiBold' },
  submitBtn: { height: 56, borderRadius: 16 },
  socialDivider: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  divLine: { flex: 1, height: 1 },
  divText: { fontSize: 14, fontFamily: 'Poppins_500Medium' },
  socialRow: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  switchRow: { alignItems: 'center', paddingVertical: 8 },
  switchText: { fontSize: 15, fontFamily: 'Poppins_400Regular' },
  switchLink: { fontFamily: 'Poppins_700Bold' },
});
