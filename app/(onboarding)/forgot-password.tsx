import { View, Text, Pressable, StyleSheet, TextInput, Platform, KeyboardAvoidingView, ScrollView, Alert, ActivityIndicator, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { CultureTokens, gradients } from '@/constants/theme';
import { BlurView } from 'expo-blur';
import { Button } from '@/components/ui/Button';

export default function ForgotPasswordScreen() {
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
    <View style={s.container}>
      <LinearGradient
        colors={gradients.culturepassBrandReversed}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.gradientBg}
      />

      {/* Decorative Orbs */}
      {Platform.OS === 'web' ? (
        <>
          <View style={[s.orb, { top: -100, right: -50, backgroundColor: CultureTokens.indigo, opacity: 0.5, filter: 'blur(50px)' } as any]} />
          <View style={[s.orb, { bottom: -50, left: -50, backgroundColor: CultureTokens.saffron, opacity: 0.3, filter: 'blur(50px)' } as any]} />
        </>
      ) : null}

      {isDesktop && (
        <View style={s.desktopBackRow}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={[s.desktopBackBtn, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
            <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
            <Text style={s.desktopBackText}>Back to Sign In</Text>
          </Pressable>
        </View>
      )}

      {!isDesktop && (
        <View style={[s.mobileHeader, { paddingTop: topInset + 12 }]}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </Pressable>
        </View>
      )}

      <KeyboardAvoidingView 
        style={s.keyboardAvoid} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      >
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          keyboardShouldPersistTaps="handled" 
          contentContainerStyle={[
            s.scrollContent,
            isDesktop && s.scrollContentDesktop,
            !isDesktop && { paddingTop: 20 }
          ]}
        >
          <View style={[s.formContainer, isDesktop && s.formContainerDesktop]}>
            {Platform.OS === 'ios' || Platform.OS === 'web' ? (
              <BlurView intensity={isDesktop ? 60 : 40} tint="dark" style={[StyleSheet.absoluteFill, s.formBlur]} />
            ) : (
              <View style={[StyleSheet.absoluteFill, s.formBlur, { backgroundColor: 'rgba(11, 11, 20, 0.85)' }]} />
            )}

            <View style={s.formContent}>
              {!sent ? (
                <>
                  <View style={s.headerBlock}>
                    <View style={[s.iconWrapper, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                      <Ionicons name="lock-open-outline" size={28} color="#FFFFFF" />
                    </View>
                    <Text style={s.title}>Reset Password</Text>
                    <Text style={s.subtitle}>
                      Enter the email address associated with your account. We'll send you a link to reset your password.
                    </Text>
                  </View>

                  <View style={s.block}>
                    <Text style={s.label}>Email Address</Text>
                    <View style={s.inputWrap}>
                      <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.5)" />
                      <TextInput
                        style={s.input}
                        placeholder="you@example.com"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                    </View>
                  </View>

                  <View style={s.spacer} />

                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    rightIcon="send"
                    loading={loading}
                    disabled={!isValid || loading}
                    onPress={handleSubmit}
                    style={[s.submitBtn, { backgroundColor: CultureTokens.saffron }]}
                  >
                    Send Reset Link
                  </Button>

                  {!isDesktop && (
                    <Pressable style={s.backRow} onPress={() => router.back()}>
                      <Text style={[s.backText, { color: CultureTokens.saffron }]}>Back to Sign In</Text>
                    </Pressable>
                  )}
                </>
              ) : (
                <View style={s.successContainer}>
                  <Ionicons name="checkmark-circle" size={72} color={CultureTokens.success} style={{ marginBottom: 20 }} />
                  <Text style={s.successTitle}>Check Your Email</Text>
                  <Text style={s.successSub}>We've sent a password reset link to:</Text>
                  <Text style={s.emailDisplay}>{email}</Text>
                  <Text style={s.successHint}>
                    If you don't see it, check your spam folder. The link expires in 24 hours.
                  </Text>

                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    leftIcon="chevron-back"
                    onPress={() => router.replace('/(onboarding)/login')}
                    style={[s.submitBtn, { backgroundColor: CultureTokens.saffron, marginTop: 24 }]}
                  >
                    Back to Sign In
                  </Button>

                  <Pressable style={s.backRow} onPress={() => Alert.alert('Email Resent', 'A new reset link has been sent to your email.')}>
                    <Text style={s.backTextSecondary}>
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

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B14' },
  gradientBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.8 },
  orb: { position: 'absolute', width: 300, height: 300, borderRadius: 150 },
  keyboardAvoid: { flex: 1 },
  mobileHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  desktopBackRow: { position: 'absolute', top: 32, left: 40, zIndex: 10 },
  desktopBackBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  desktopBackText: { fontSize: 14, fontFamily: 'Poppins_500Medium', color: '#FFFFFF' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 60, justifyContent: 'center' },
  scrollContentDesktop: { paddingVertical: 60 },
  formContainer: { width: '100%', maxWidth: 460, alignSelf: 'center', borderRadius: 32, overflow: 'hidden' },
  formContainerDesktop: { maxWidth: 520 },
  formBlur: { borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  formContent: { padding: 32, paddingTop: 40 },
  
  headerBlock: { alignItems: 'center', marginBottom: 32 },
  iconWrapper: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  title: { fontSize: 32, fontFamily: 'Poppins_700Bold', textAlign: 'center', marginBottom: 8, letterSpacing: -0.5, color: '#FFFFFF' },
  subtitle: { fontSize: 15, fontFamily: 'Poppins_400Regular', textAlign: 'center', color: 'rgba(255,255,255,0.7)', lineHeight: 22 },
  
  block: { marginBottom: 16 },
  label: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', marginBottom: 10, color: '#FFFFFF' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.2)' },
  input: { flex: 1, fontSize: 15, fontFamily: 'Poppins_400Regular', color: '#FFFFFF' },
  
  spacer: { height: 16 },
  submitBtn: { height: 56, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 6 },
  
  backRow: { alignItems: 'center', paddingVertical: 16, marginTop: 12 },
  backText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
  backTextSecondary: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.6)' },

  successContainer: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 10, paddingBottom: 10 },
  successTitle: { fontSize: 28, fontFamily: 'Poppins_700Bold', marginBottom: 8, color: '#FFFFFF', textAlign: 'center' },
  successSub: { fontSize: 16, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  emailDisplay: { fontSize: 18, fontFamily: 'Poppins_700Bold', marginTop: 8, marginBottom: 16, color: CultureTokens.saffron, textAlign: 'center' },
  successHint: { fontSize: 14, fontFamily: 'Poppins_400Regular', textAlign: 'center', lineHeight: 22, color: 'rgba(255,255,255,0.5)', paddingHorizontal: 10 },
});
