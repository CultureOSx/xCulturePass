import { View, Text, Pressable, StyleSheet, Platform, KeyboardAvoidingView, ScrollView, Alert, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { auth as firebaseAuth } from '@/lib/firebase';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  OAuthProvider,
} from 'firebase/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { SocialButton } from '@/components/ui/SocialButton';
import { LinearGradient } from 'expo-linear-gradient';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useColors } from '@/hooks/useColors';
import * as AppleAuthentication from 'expo-apple-authentication';

function isInternalRoute(value: string) {
  return value.startsWith('/') && !value.startsWith('//') && !value.includes('://');
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1024;
  const topInset = Platform.OS === 'web' ? 0 : insets.top;
  const { state: onboardingState } = useOnboarding();
  const searchParams = useLocalSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isValid = email.trim().length > 0 && password.length >= 6;

  const postAuthRoute = () => {
    // If a redirect target was provided (e.g. ?redirectTo=/event/abc), go there.
    const redirectToRaw = (searchParams?.redirectTo as string) || (searchParams?.redirect as string) || null;
    const redirectTo = redirectToRaw && isInternalRoute(redirectToRaw) ? redirectToRaw : null;
    if (redirectTo) {
      // Use replace so user can't go back to login again
      router.replace(redirectTo);
      return;
    }

    // If onboarding incomplete send to onboarding location step
    if (!onboardingState.isComplete) {
      router.push('/(onboarding)/location');
      return;
    }

    // Prefer returning to previous history entry when possible (e.g., user came from a protected page)
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      if (Platform.OS === 'web') {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(firebaseAuth, provider);
      } else {
        // Native: use @react-native-google-signin/google-signin
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { GoogleSignin } = require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin');
        GoogleSignin.configure({
          webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        });
        await GoogleSignin.hasPlayServices();
        const userInfo = await GoogleSignin.signIn();
        const tokens = await GoogleSignin.getTokens();
        const credential = GoogleAuthProvider.credential(tokens.idToken);
        await signInWithCredential(firebaseAuth, credential);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      postAuthRoute();
    } catch (e: unknown) {
      const code = (e as { code?: string }).code;
      if (
        code !== 'auth/popup-closed-by-user' &&
        code !== 'auth/cancelled-popup-request' &&
        code !== '-5'  // Google Sign-In cancelled by user on native
      ) {
        setError('Google sign-in failed. Please try again.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (Platform.OS !== 'ios') return;
    setLoading(true);
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
    } catch (e: unknown) {
      const code = (e as { code?: string }).code;
      if (code !== 'ERR_REQUEST_CANCELED') {
        setError('Apple sign-in failed. Please try again.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError('');
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Please enter a valid email address.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(firebaseAuth, normalizedEmail, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      postAuthRoute();
    } catch (e: unknown) {
      const code = (e as { code?: string }).code;
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Invalid email or password');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.');
      } else {
        setError('Sign in failed. Please try again.');
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
      <View style={styles.logoRow}>
        <View style={styles.logoCircle}><Ionicons name="globe-outline" size={34} color={Colors.primary} /></View>
        <Text style={[styles.brandLabel, { color: colors.textInverse + '99' }]}>culturepass.app</Text>
      </View>

      <Text style={[styles.title, { color: colors.textInverse }]}>Welcome back</Text>
      <Text style={[styles.subtitle, { color: colors.textInverse + 'D9' }]}>Sign in to continue your cultural journey.</Text>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.form}>
        <Input
          label="Email Address"
          placeholder="Enter your email address"
          leftIcon="mail-outline"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            if (error) setError('');
          }}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <View>
          <View style={styles.passwordHeader}>
            <Text style={[styles.label, { color: colors.textInverse }]}>Password</Text>
            <Pressable onPress={() => router.push('/forgot-password')}>
              <Text style={[styles.forgotText, { color: colors.warning }]}>Forgot Password?</Text>
            </Pressable>
          </View>
          <Input
            placeholder="Enter your password"
            leftIcon="lock-closed-outline"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (error) setError('');
            }}
            secureTextEntry
            passwordToggle
          />
        </View>
      </View>

      <Checkbox
        checked={rememberMe}
        onToggle={setRememberMe}
        label="Remember me"
      />

      <Button
        variant="primary"
        size="lg"
        fullWidth
        rightIcon="arrow-forward"
        loading={loading}
        disabled={!isValid || loading}
        onPress={handleLogin}
        style={styles.submitBtn}
      >
        Sign In
      </Button>

      <View style={styles.socialDivider}>
        <View style={styles.divLine} />
        <Text style={[styles.divText, { color: colors.textInverse + 'D9' }]}>or</Text>
        <View style={styles.divLine} />
      </View>

      <View style={styles.socialRow}>
        <SocialButton provider="google" onPress={handleGoogleSignIn} disabled={loading} />
        {Platform.OS === 'ios'
          ? <SocialButton provider="apple" onPress={handleAppleSignIn} disabled={loading} />
          : <SocialButton provider="apple" comingSoon disabled={loading} />
        }
      </View>

      <Pressable style={styles.switchRow} onPress={() => router.replace('/signup')}>
        <Text style={[styles.switchText, { color: colors.textInverse + 'D9' }]}>Don&apos;t have an account? <Text style={[styles.switchLink, { color: colors.warning }]}>Sign Up</Text></Text>
      </Pressable>
    </ScrollView>
  );

  // Desktop web: centred card on full-screen gradient
  if (isDesktop) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
        <View style={[styles.container, styles.desktopWrapper]}>
          <LinearGradient
            colors={['#001F4D', '#0081C8', '#EE334E', '#FCB131']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.95 }}
            style={StyleSheet.absoluteFillObject}
          />
          {/* Back to landing */}
          <View style={styles.desktopBackRow}>
            <Pressable onPress={() => router.replace('/')} hitSlop={8} style={styles.desktopBackBtn}>
              <Ionicons name="chevron-back" size={18} color={colors.textInverse} />
              <Text style={[styles.desktopBackText, { color: colors.textInverse }]}>Back to Home</Text>
            </Pressable>
          </View>
          <View style={styles.desktopCard}>
            {formContent}
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
      <View style={[styles.container, { paddingTop: topInset }]}>
        <LinearGradient
          colors={['#001F4D', '#0081C8', '#EE334E', '#FCB131']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.95 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.header}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/')} hitSlop={8}><Ionicons name="chevron-back" size={24} color={colors.textInverse} /></Pressable>
        </View>
        {formContent}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#001F4D' },
  header: { paddingHorizontal: 20, paddingVertical: 12 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  desktopWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopBackRow: {
    position: 'absolute',
    top: 20,
    left: 32,
    zIndex: 10,
  },
  desktopBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  desktopBackText: { fontSize: 14, fontFamily: 'Poppins_500Medium' },
  desktopCard: {
    width: 480,
    maxHeight: '90%' as unknown as number,
    backgroundColor: 'rgba(0,31,77,0.85)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? { boxShadow: '0 24px 64px rgba(0,0,0,0.45)' } as object : {}),
  },
  logoRow: { alignItems: 'center', marginTop: 12, marginBottom: 28, gap: 0 },
  logoCircle: { width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  brandLabel: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', letterSpacing: 1.5, marginTop: 10 },
  title: { fontSize: 34, fontFamily: 'Poppins_700Bold', textAlign: 'center', marginBottom: 8, letterSpacing: 0.37 },
  subtitle: { fontSize: 15, fontFamily: 'Poppins_400Regular', lineHeight: 22, textAlign: 'center', marginBottom: 32 },
  errorText: { fontSize: 14, fontFamily: 'Poppins_500Medium', color: Colors.error, textAlign: 'center', marginBottom: 16, backgroundColor: Colors.error + '15', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  form: { gap: 20, marginBottom: 20 },
  passwordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  label: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  forgotText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  submitBtn: { marginBottom: 28 },
  socialDivider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  divLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.35)' },
  divText: { fontSize: 13, fontFamily: 'Poppins_400Regular' },
  socialRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  switchRow: { alignItems: 'center' },
  switchText: { fontSize: 14, fontFamily: 'Poppins_400Regular' },
  switchLink: { fontFamily: 'Poppins_600SemiBold' },
});
