import { View, Text, Pressable, StyleSheet, TextInput, Platform, KeyboardAvoidingView, ScrollView, Alert, ActivityIndicator, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { CultureTokens, gradients, CardTokens, glass, shadows } from '@/constants/theme';
import { BlurView } from 'expo-blur';
import { Button } from '@/components/ui/Button';
import { useColors } from '@/hooks/useColors';

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1024;
  const topInset = Platform.OS === 'web' ? 0 : insets.top;

  const [email, setEmail] = useState('');
  const [sent,  setSent]  = useState(false);
  const [loading, setLoading] = useState(false);

  const isValid = email.includes('@') && email.includes('.');

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSent(true);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      const msg = code === 'auth/user-not-found'
        ? 'No account found with that email address.'
        : code === 'auth/invalid-email'
        ? 'Please enter a valid email address.'
        : 'Something went wrong. Please try again.';
      Alert.alert('Error', msg);
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
          <Pressable onPress={() => router.back()} hitSlop={8} style={[styles.desktopBackBtn, { backgroundColor: glass.overlay.backgroundColor, borderColor: colors.border }]}>
            <Ionicons name="chevron-back" size={18} color={colors.textInverse} />
            <Text style={[styles.desktopBackText, { color: colors.textInverse }]}>Back to Sign In</Text>
          </Pressable>
        </View>
      )}

      {!isDesktop && (
        <View style={[styles.mobileHeader, { paddingTop: topInset + 12 }]}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={28} color={colors.textInverse} />
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
              {!sent ? (
                <>
                  <View style={styles.headerBlock}>
                    <View style={[styles.iconWrapper, { backgroundColor: colors.overlay, borderColor: colors.borderLight }]}>
                      <Ionicons name="lock-open-outline" size={28} color={colors.textInverse} />
                    </View>
                    <Text style={[styles.title, { color: colors.textInverse }]}>Reset Password</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                      Enter the email address associated with your account. We'll send you a link to reset your password.
                    </Text>
                  </View>

                  <View style={styles.block}>
                    <Text style={[styles.label, { color: colors.textInverse }]}>Email Address</Text>
                    <View style={[styles.inputWrap, { borderColor: colors.borderLight, backgroundColor: colors.overlay }]}>
                      <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
                      <TextInput
                        style={[styles.input, { color: colors.textInverse }]}
                        placeholder="you@example.com"
                        placeholderTextColor={colors.textSecondary}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                    </View>
                  </View>

                  <View style={styles.spacer} />

                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    rightIcon="send"
                    loading={loading}
                    disabled={!isValid || loading}
                    onPress={handleSubmit}
                    style={[styles.submitBtn, shadows.medium, { backgroundColor: CultureTokens.saffron }]}
                  >
                    Send Reset Link
                  </Button>

                  {!isDesktop && (
                    <Pressable style={styles.backRow} onPress={() => router.back()} hitSlop={12}>
                      <Text style={[styles.backText, { color: CultureTokens.saffron }]}>Back to Sign In</Text>
                    </Pressable>
                  )}
                </>
              ) : (
                <View style={[styles.successContainer, { paddingBottom: 10, paddingTop: 10 }]}>
                  <Ionicons name="checkmark-circle" size={72} color={CultureTokens.success} style={{ marginBottom: 20 }} />
                  <Text style={[styles.successTitle, { color: colors.textInverse }]}>Check Your Email</Text>
                  <Text style={[styles.successSub, { color: colors.textSecondary }]}>We've sent a password reset link to:</Text>
                  <Text style={styles.emailDisplay}>{email}</Text>
                  <Text style={[styles.successHint, { color: colors.textSecondary }]}>
                    If you don't see it, check your spam folder. The link expires in 24 hours.
                  </Text>

                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    leftIcon="chevron-back"
                    onPress={() => router.replace('/(onboarding)/login')}
                    style={[styles.submitBtn, shadows.medium, { backgroundColor: CultureTokens.saffron, marginTop: 24 }]}
                  >
                    Back to Sign In
                  </Button>

                  <Pressable style={styles.backRow} onPress={() => Alert.alert('Email Resent', 'A new reset link has been sent to your email.')} hitSlop={12}>
                    <Text style={[styles.backTextSecondary, { color: colors.textSecondary }]}>
                      Didn't receive it?{' '}
                      <Text style={{ color: CultureTokens.saffron, fontFamily: 'Poppins_700Bold' }}>Resend</Text>
                    </Text>
                  </Pressable>
                </View>
              )}
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
  mobileHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  desktopBackRow: { position: 'absolute', top: 32, left: 40, zIndex: 10 },
  desktopBackBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1 },
  desktopBackText: { fontSize: 14, fontFamily: 'Poppins_500Medium' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 60, justifyContent: 'center' },
  scrollContentDesktop: { paddingVertical: 60 },
  formContainer: { width: '100%', maxWidth: 460, alignSelf: 'center', overflow: 'hidden' },
  formContainerDesktop: { maxWidth: 520 },
  formBlur: { borderWidth: 1 },
  formContent: { paddingTop: 40 },
  
  headerBlock: { alignItems: 'center', marginBottom: 32 },
  iconWrapper: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1 },
  title: { fontSize: 32, fontFamily: 'Poppins_700Bold', textAlign: 'center', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, fontFamily: 'Poppins_400Regular', textAlign: 'center', lineHeight: 22 },
  
  block: { marginBottom: 16 },
  label: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', marginBottom: 10 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1 },
  input: { flex: 1, fontSize: 15, fontFamily: 'Poppins_400Regular' },
  
  spacer: { height: 16 },
  submitBtn: { height: 56, borderRadius: 16 },
  
  backRow: { alignItems: 'center', paddingVertical: 16, marginTop: 12 },
  backText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
  backTextSecondary: { fontSize: 14, fontFamily: 'Poppins_400Regular' },

  successContainer: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 28, fontFamily: 'Poppins_700Bold', marginBottom: 8, textAlign: 'center' },
  successSub: { fontSize: 16, fontFamily: 'Poppins_400Regular', textAlign: 'center' },
  emailDisplay: { fontSize: 18, fontFamily: 'Poppins_700Bold', marginTop: 8, marginBottom: 16, color: CultureTokens.saffron, textAlign: 'center' },
  successHint: { fontSize: 14, fontFamily: 'Poppins_400Regular', textAlign: 'center', lineHeight: 22, paddingHorizontal: 10 },
});
