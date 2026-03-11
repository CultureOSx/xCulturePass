import React, { useState } from 'react';
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
import { Colors, CultureTokens, gradients } from '@/constants/theme';
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

  // Form logic (eager normalization)
  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const isValid = normalizedName.length > 1 && normalizedEmail.includes('@') && password.length >= 6 && agreed;

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
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.push('/(onboarding)/location');
    } catch (e: any) {
      const code = e?.code;
      if (!['auth/popup-closed-by-user', 'auth/cancelled-popup-request', '-5'].includes(code)) {
        setError('Google sign-up failed. Please try again.');
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        setError('Apple sign-up failed. Please try again.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Please enter a valid email address.');
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(firebaseAuth, normalizedEmail, password);
      // Try to immediately set the display name on the Firebase user object
      await updateProfile(credential.user, { displayName: normalizedName });
      
      // Force token refresh so custom claims can be generated/inferred if needed
      await credential.user.getIdToken(true);
      
      // Sync to backend DB
      await api.auth.register({ displayName: normalizedName });

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.push('/(onboarding)/location');
    } catch (e: any) {
      const code = e?.code;
      if (code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else {
        setError('Registration failed. Please try again.');
      }
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradients.culturepassBrand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.95 }}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Desktop Layout Background Back Button */}
      {isDesktop && (
        <View style={styles.desktopBackRow}>
          <Pressable onPress={() => router.replace('/(tabs)')} hitSlop={8} style={[styles.desktopBackBtn, { backgroundColor: colors.surface + '26' }]}>
            <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
            <Text style={styles.desktopBackText}>Back to Discover</Text>
          </Pressable>
        </View>
      )}

      {/* Mobile Header Nav */}
      {!isDesktop && (
        <View style={[styles.mobileHeader, { paddingTop: topInset }]}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} hitSlop={8}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </Pressable>
        </View>
      )}

      <KeyboardAvoidingView 
        style={styles.keyboardAvoid} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        keyboardVerticalOffset={0}
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
          {/* Main Interface Block */}
          <View style={[
            styles.formCard, 
            { backgroundColor: colors.surface },
            isDesktop && styles.formCardDesktop
          ]}>
            <View style={styles.logoRow}>
              <View style={[styles.logoCircle, { backgroundColor: CultureTokens.indigo + '1A' }]}>
                <Ionicons name="globe-outline" size={32} color={CultureTokens.indigo} />
              </View>
              <Text style={[styles.brandLabel, { color: colors.textSecondary }]}>CulturePass.app</Text>
            </View>

            <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
            <Text style={[styles.benefitsRow, { color: CultureTokens.saffron }]}>
              🎉 Free events · Community access · Exclusive perks
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Join thousands of community members celebrating culture together.
            </Text>

            {/* Error Message */}
            {error ? (
              <View style={[styles.errorBanner, { backgroundColor: CultureTokens.error + '1A' }]}>
                <Ionicons name="alert-circle-outline" size={18} color={CultureTokens.error} />
                <Text style={[styles.errorText, { color: CultureTokens.error }]}>{error}</Text>
              </View>
            ) : null}

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
                returnKeyType="next"
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
                returnKeyType="next"
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
                  returnKeyType="done"
                  onSubmitEditing={handleSignUp}
                  hint={password.length > 0 && password.length < 6 ? 'Password must be at least 6 characters' : undefined}
                />
                {password.length > 0 && <PasswordStrengthIndicator password={password} />}
              </View>
            </View>

            <View style={styles.optionsRow}>
              <Checkbox
                checked={agreed}
                onToggle={setAgreed}
                label={
                  <Text style={[styles.checkText, { color: colors.text }]}>
                    I agree to the <Text style={[styles.linkText, { color: CultureTokens.saffron }]} onPress={() => router.push('/legal/terms')}>Terms of Service</Text> and <Text style={[styles.linkText, { color: CultureTokens.saffron }]} onPress={() => router.push('/legal/privacy')}>Privacy Policy</Text>
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
              style={styles.submitBtn}
              accessibilityLabel="Create your CulturePass account"
            >
              Create Account
            </Button>

            <View style={styles.socialDivider}>
              <View style={[styles.divLine, { backgroundColor: colors.borderLight }]} />
              <Text style={[styles.divText, { color: colors.textTertiary }]}>or sign up with</Text>
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

            <Pressable style={styles.switchRow} onPress={() => router.replace('/(onboarding)/login')}>
              <Text style={[styles.switchText, { color: colors.textSecondary }]}>
                Already have an account? <Text style={[styles.switchLink, { color: CultureTokens.saffron }]}>Sign In</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: 'transparent' 
  },
  keyboardAvoid: { 
    flex: 1 
  },
  mobileHeader: { 
    paddingHorizontal: 20, 
    paddingBottom: 12 
  },
  desktopBackRow: {
    position: 'absolute',
    top: 24,
    left: 40,
    zIndex: 10,
  },
  desktopBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  desktopBackText: { 
    fontSize: 14, 
    fontFamily: 'Poppins_500Medium', 
    color: '#FFFFFF' 
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  scrollContentDesktop: {
    justifyContent: 'center',
    paddingVertical: 40,
  },
  formCard: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    borderRadius: 28,
    paddingHorizontal: 32,
    paddingVertical: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.1,
    shadowRadius: 32,
    elevation: 8,
  },
  formCardDesktop: {
    paddingHorizontal: 48,
    paddingVertical: 48,
  },
  logoRow: { 
    alignItems: 'center', 
    marginBottom: 24 
  },
  logoCircle: { 
    width: 64, 
    height: 64, 
    borderRadius: 32, 
    alignItems: 'center', 
    justifyContent: 'center',
    marginBottom: 12,
  },
  brandLabel: { 
    fontSize: 12, 
    fontFamily: 'Poppins_600SemiBold', 
    letterSpacing: 2, 
    textTransform: 'uppercase' 
  },
  title: { 
    fontSize: 32, 
    fontFamily: 'Poppins_700Bold', 
    textAlign: 'center', 
    marginBottom: 8, 
    letterSpacing: -0.5 
  },
  benefitsRow: { 
    fontSize: 13, 
    fontFamily: 'Poppins_600SemiBold', 
    textAlign: 'center', 
    marginBottom: 16 
  },
  subtitle: { 
    fontSize: 15, 
    fontFamily: 'Poppins_400Regular', 
    lineHeight: 24, 
    textAlign: 'center', 
    marginBottom: 32 
  },
  errorBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10, 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    borderRadius: 14, 
    marginBottom: 24 
  },
  errorText: { 
    flex: 1, 
    fontSize: 14, 
    fontFamily: 'Poppins_500Medium', 
  },
  form: { 
    gap: 20, 
    marginBottom: 16 
  },
  optionsRow: {
    marginBottom: 32,
  },
  checkText: { 
    flex: 1, 
    fontSize: 13, 
    fontFamily: 'Poppins_400Regular', 
    lineHeight: 20 
  },
  linkText: { 
    fontFamily: 'Poppins_600SemiBold' 
  },
  submitBtn: { 
    marginBottom: 32,
    borderRadius: 16,
    height: 56,
  },
  socialDivider: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 16, 
    marginBottom: 24 
  },
  divLine: { 
    flex: 1, 
    height: 1 
  },
  divText: { 
    fontSize: 14, 
    fontFamily: 'Poppins_500Medium' 
  },
  socialRow: { 
    flexDirection: 'row', 
    gap: 16, 
    marginBottom: 32 
  },
  switchRow: { 
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchText: { 
    fontSize: 15, 
    fontFamily: 'Poppins_400Regular' 
  },
  switchLink: { 
    fontFamily: 'Poppins_600SemiBold' 
  },
});
