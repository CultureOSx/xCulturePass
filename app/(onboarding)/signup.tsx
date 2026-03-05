import { View, Text, Pressable, StyleSheet, Platform, KeyboardAvoidingView, ScrollView, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, gradients } from '@/constants/theme';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { auth as firebaseAuth } from '@/lib/firebase';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  OAuthProvider,
} from 'firebase/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { SocialButton } from '@/components/ui/SocialButton';
import { PasswordStrengthIndicator } from '@/components/ui/PasswordStrengthIndicator';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import * as AppleAuthentication from 'expo-apple-authentication';

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1024;
  const topInset = Platform.OS === 'web' ? 0 : insets.top;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isValid = name.trim().length > 1 && email.includes('@') && password.length >= 6 && agreed;

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setError('');
    try {
      if (Platform.OS === 'web') {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(firebaseAuth, provider);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { GoogleSignin } = require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin');
        GoogleSignin.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID });
        await GoogleSignin.hasPlayServices();
        await GoogleSignin.signIn();
        const tokens = await GoogleSignin.getTokens();
        const credential = GoogleAuthProvider.credential(tokens.idToken);
        await signInWithCredential(firebaseAuth, credential);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push('/(onboarding)/location');
    } catch (e: unknown) {
      const code = (e as { code?: string }).code;
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request' && code !== '-5') {
        setError('Google sign-up failed. Please try again.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignUp = async () => {
    if (Platform.OS !== 'ios') return;
    setLoading(true);
    setError('');
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
      router.push('/(onboarding)/location');
    } catch (e: unknown) {
      const code = (e as { code?: string }).code;
      if (code !== 'ERR_REQUEST_CANCELED') {
        setError('Apple sign-up failed. Please try again.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setError('');
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Please enter a valid email address.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(firebaseAuth, normalizedEmail, password);
      await updateProfile(credential.user, { displayName: name.trim() });

      await credential.user.getIdToken(true);
      await api.auth.register({ displayName: name.trim() });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push('/(onboarding)/location');
    } catch (e: unknown) {
      const code = (e as { code?: string }).code;
      if (code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else {
        setError('Registration failed. Please try again.');
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 24, padding: 32, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, elevation: 4, alignItems: 'center', width: 400, alignSelf: 'center', marginTop: 60 }}>
          <View style={styles.logoRow}>
            <View style={[styles.logoCircle, { backgroundColor: colors.textInverse + '33' }]}><Ionicons name="globe-outline" size={34} color={Colors.primary} /></View>
            <Text style={[styles.brandLabel, { color: colors.textInverse + '99' }]}>culturepass.app</Text>
          </View>
          <Text style={[styles.title, { color: colors.primary, fontSize: 28, fontWeight: '700', marginBottom: 6 }]}>Create Account</Text>
          <Text style={[styles.benefitsRow, { color: colors.textSecondary, fontSize: 16 }]}>🎉 Free events · Community access · Exclusive perks</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: 15 }]}>Join thousands of community members celebrating culture together.</Text>

          {error && <Text style={[styles.errorText, { color: colors.error, fontWeight: '600', fontSize: 15, marginBottom: 8 }]}>{error}</Text>}

          <View style={styles.form}>
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              leftIcon="person-outline"
              value={name}
              onChangeText={(value) => {
                setName(value);
                if (error) setError('');
              }}
              autoCapitalize="words"
            />

            <Input
              label="Email Address"
              placeholder="you@example.com"
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
              <Input
                label="Password"
                placeholder="Min. 6 characters"
                leftIcon="lock-closed-outline"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  if (error) setError('');
                }}
                secureTextEntry
                passwordToggle
                hint={password.length > 0 && password.length < 6 ? 'Password must be at least 6 characters' : undefined}
              />
              {password.length > 0 && <PasswordStrengthIndicator password={password} />}
            </View>

            <Checkbox
              checked={agreed}
              onToggle={setAgreed}
              label={
                <Text style={[styles.checkText, { color: colors.textInverse + 'D9' }]}>
                  I agree to the <Text style={[styles.linkText, { color: colors.warning }]} onPress={() => router.push('/legal/terms')}>Terms of Service</Text> and <Text style={[styles.linkText, { color: colors.warning }]} onPress={() => router.push('/legal/privacy')}>Privacy Policy</Text>
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
            style={[styles.submitBtn, { marginTop: 10, borderRadius: 12 }]}
            accessibilityLabel="Create your CulturePass account"
          >
            Create Account
          </Button>

          <View style={styles.socialDivider}>
            <View style={[styles.divLine, { backgroundColor: colors.textInverse + '59' }]} />
            <Text style={[styles.divText, { color: colors.textInverse + 'D9', fontWeight: '600' }]}>or sign up with</Text>
            <View style={[styles.divLine, { backgroundColor: colors.textInverse + '59' }]} />
          </View>

          <View style={styles.socialRow}>
            <SocialButton provider="google" onPress={handleGoogleSignUp} disabled={loading} />
            {Platform.OS === 'ios'
              ? <SocialButton provider="apple" onPress={handleAppleSignUp} disabled={loading} />
              : <SocialButton provider="apple" comingSoon disabled={loading} />
            }
          </View>

          <Pressable style={styles.switchRow} onPress={() => router.replace('/(onboarding)/login')}>
            <Text style={[styles.switchText, { color: colors.textInverse + 'D9' }]}>Already have an account? <Text style={[styles.switchLink, { color: colors.warning }]}>Sign In</Text></Text>
          </Pressable>
        </View>
        </ScrollView>
  );

  // Desktop web: centred card on full-screen gradient
  if (isDesktop) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
        <View style={[styles.container, styles.desktopWrapper]}>
          <LinearGradient
            colors={gradients.culturepassBrand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.95 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.desktopBackRow}>
            <Pressable onPress={() => router.replace('/(tabs)')} hitSlop={8} style={[styles.desktopBackBtn, { backgroundColor: colors.textInverse + '26' }]}>
              <Ionicons name="chevron-back" size={18} color={colors.textInverse} />
              <Text style={[styles.desktopBackText, { color: colors.textInverse }]}>Back to Discover</Text>
            </Pressable>
          </View>
          <View style={[styles.desktopCard, { backgroundColor: colors.background + 'D9', borderColor: colors.textInverse + '26' }, Platform.OS === 'web' ? ({ boxShadow: `0 24px 64px ${colors.background + '73'}` } as object) : null]}>
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
          colors={gradients.culturepassBrand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.95 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.header}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} hitSlop={8}><Ionicons name="chevron-back" size={24} color={colors.textInverse} /></Pressable>
        </View>
        {formContent}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: { paddingHorizontal: 20, paddingVertical: 12 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  formCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  formCardDesktop: {
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  logoRow: { alignItems: 'center', marginTop: 12, marginBottom: 20 },
  logoCircle: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  brandLabel: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', letterSpacing: 1.5, marginTop: 10 },
  title: { fontSize: 28, fontFamily: 'Poppins_700Bold', marginBottom: 8 },
  subtitle: { fontSize: 15, fontFamily: 'Poppins_400Regular', lineHeight: 22, marginBottom: 28 },
  errorText: { fontSize: 14, fontFamily: 'Poppins_500Medium', color: Colors.error, textAlign: 'center', marginBottom: 16, backgroundColor: Colors.error + '15', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  form: { gap: 20, marginBottom: 28 },
  label: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  submitBtn: { marginBottom: 20 },
  socialDivider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  divLine: { flex: 1, height: StyleSheet.hairlineWidth },
  divText: { fontSize: 12, fontFamily: 'Poppins_400Regular' },
  socialRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  switchRow: { alignItems: 'center' },
  switchText: { fontSize: 14, fontFamily: 'Poppins_400Regular' },
  switchLink: { fontFamily: 'Poppins_600SemiBold' },
  benefitsRow: { fontSize: 13, fontFamily: 'Poppins_400Regular', marginBottom: 4 },
  checkText: { flex: 1, fontSize: 13, fontFamily: 'Poppins_400Regular', lineHeight: 20 },
  linkText: { fontFamily: 'Poppins_600SemiBold' },
  desktopWrapper: { alignItems: 'center', justifyContent: 'center' },
  desktopBackRow: { position: 'absolute', top: 20, left: 32, zIndex: 10 },
  desktopBackBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  desktopBackText: { fontSize: 14, fontFamily: 'Poppins_500Medium' },
  desktopCard: {
    width: 480,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
