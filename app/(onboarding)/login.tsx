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
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CultureTokens, gradients, CardTokens, glass, shadows } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { auth as firebaseAuth } from '@/lib/firebase';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  OAuthProvider,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { SocialButton } from '@/components/ui/SocialButton';
import { LinearGradient } from 'expo-linear-gradient';
import { useOnboarding } from '@/contexts/OnboardingContext';
import * as AppleAuthentication from 'expo-apple-authentication';

function isInternalRoute(value: string) {
  return value.startsWith('/') && !value.startsWith('//') && !value.includes('://');
}

export default function LoginScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1024;
  const topInset = Platform.OS === 'web' ? 0 : insets.top;

  const { state: onboardingState } = useOnboarding();
  const searchParams = useLocalSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [globalError, setGlobalError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Smooth UI Validation reactivity
  const isValid = useMemo(() => {
    return email.trim().length > 0 && password.length >= 6;
  }, [email, password]);

  const validate = () => {
    let valid = true;
    if (!email.match(/^[^@]+@[^@]+\.[^@]+$/)) {
      setEmailError('Please enter a valid email address.');
      valid = false;
    } else {
      setEmailError('');
    }
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      valid = false;
    } else {
      setPasswordError('');
    }
    return valid;
  };

  const clearErrors = useCallback(() => {
    if (emailError) setEmailError('');
    if (passwordError) setPasswordError('');
    if (globalError) setGlobalError('');
  }, [emailError, passwordError, globalError]);

  const postAuthRoute = async () => {
    const redirectToRaw = (searchParams?.redirectTo as string) || (searchParams?.redirect as string) || null;
    const redirectTo = redirectToRaw && isInternalRoute(redirectToRaw) ? redirectToRaw : null;
    if (redirectTo) {
      router.replace(redirectTo);
      return;
    }
    if (!onboardingState.isComplete) {
      router.replace('/(onboarding)/location');
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    clearErrors();
    try {
      if (Platform.OS === 'web') {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(firebaseAuth, provider);
      } else {
        const { GoogleSignin } = require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin');
        GoogleSignin.configure({
          webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        });
        await GoogleSignin.hasPlayServices();
        await GoogleSignin.signIn();
        const tokens = await GoogleSignin.getTokens();
        const credential = GoogleAuthProvider.credential(tokens.idToken);
        await signInWithCredential(firebaseAuth, credential);
      }
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      postAuthRoute();
    } catch (e: any) {
      const code = e?.code;
      if (!['auth/popup-closed-by-user', 'auth/cancelled-popup-request', '-5'].includes(code)) {
        setGlobalError('Google sign-in failed. Please try again.');
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
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
      postAuthRoute();
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        setGlobalError('Apple sign-in failed. Please try again.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    clearErrors();
    if (!validate()) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setLoading(true);
    try {
      if (Platform.OS === 'web') {
        await setPersistence(firebaseAuth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      }
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      postAuthRoute();
    } catch (e: any) {
      const code = e?.code;
      if (['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential'].includes(code)) {
        setGlobalError('Invalid email or password.');
      } else if (code === 'auth/too-many-requests') {
        setGlobalError('Too many attempts. Please try again later.');
      } else {
        setGlobalError('Sign in failed. Please try again.');
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

              <Text style={[styles.title, { color: colors.textInverse }]}>Welcome back.</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Sign in to continue your cultural journey.</Text>

              {globalError ? (
                <View style={[styles.errorBanner, { backgroundColor: CultureTokens.coral + '20', borderColor: CultureTokens.coral + '50' }]}>
                  <Ionicons name="alert-circle" size={20} color={CultureTokens.coral} />
                  <Text style={[styles.globalErrorText, { color: CultureTokens.coral }]}>{globalError}</Text>
                </View>
              ) : null}

              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Input
                    label="Email Address"
                    placeholder="Enter your email"
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
                  <View style={styles.passwordHeader}>
                    <Text style={[styles.label, { color: colors.text }]}>Password</Text>
                    <Pressable hitSlop={12} onPress={() => router.push('/(onboarding)/forgot-password')}>
                      <Text style={[styles.forgotText, { color: CultureTokens.saffron }]}>Forgot Password?</Text>
                    </Pressable>
                  </View>
                  <Input
                    placeholder="Enter password"
                    leftIcon="lock-closed-outline"
                    value={password}
                    onChangeText={(v) => { setPassword(v); clearErrors(); }}
                    passwordToggle
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                    error={passwordError}
                  />
                </View>
              </View>

              <View style={styles.optionsRow}>
                <Checkbox
                  checked={rememberMe}
                  onToggle={setRememberMe}
                  label="Keep me signed in"
                />
              </View>

              <Button
                variant="primary"
                size="lg"
                fullWidth
                rightIcon="arrow-forward"
                loading={loading}
                disabled={!isValid || loading}
                onPress={handleLogin}
                style={[styles.submitBtn, shadows.medium, { backgroundColor: CultureTokens.saffron }]}
              >
                Sign In
              </Button>

              <View style={styles.socialDivider}>
                <View style={[styles.divLine, { backgroundColor: colors.borderLight }]} />
                <Text style={[styles.divText, { color: colors.textSecondary }]}>or</Text>
                <View style={[styles.divLine, { backgroundColor: colors.borderLight }]} />
              </View>

              <View style={styles.socialRow}>
                <SocialButton provider="google" onPress={handleGoogleSignIn} disabled={loading} />
                {Platform.OS === 'ios' ? (
                  <SocialButton provider="apple" onPress={handleAppleSignIn} disabled={loading} />
                ) : (
                  <SocialButton provider="apple" comingSoon disabled={loading} />
                )}
              </View>

              <Pressable style={styles.switchRow} onPress={() => router.replace('/(onboarding)/signup')} hitSlop={12}>
                <Text style={[styles.switchText, { color: colors.textSecondary }]}>
                  Don't have an account? <Text style={[styles.switchLink, { color: CultureTokens.saffron }]}>Sign Up</Text>
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
  logoRow: { alignItems: 'center', marginBottom: 28 },
  logoCircle: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1 },
  brandLabel: { fontSize: 12, fontFamily: 'Poppins_700Bold', letterSpacing: 3, textTransform: 'uppercase' },
  title: { fontSize: 34, fontFamily: 'Poppins_700Bold', textAlign: 'center', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, fontFamily: 'Poppins_400Regular', textAlign: 'center', marginBottom: 36 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, marginBottom: 24, borderWidth: 1 },
  globalErrorText: { flex: 1, fontSize: 14, fontFamily: 'Poppins_500Medium' },
  form: { gap: 20, marginBottom: 24 },
  inputGroup: { gap: 8 },
  passwordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  forgotText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  optionsRow: { marginBottom: 36 },
  submitBtn: { height: 56, borderRadius: 16 },
  socialDivider: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 28 },
  divLine: { flex: 1, height: 1 },
  divText: { fontSize: 14, fontFamily: 'Poppins_500Medium' },
  socialRow: { flexDirection: 'row', gap: 16, marginBottom: 36 },
  switchRow: { alignItems: 'center', paddingVertical: 8 },
  switchText: { fontSize: 15, fontFamily: 'Poppins_400Regular' },
  switchLink: { fontFamily: 'Poppins_700Bold' },
});
