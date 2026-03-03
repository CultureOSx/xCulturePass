import { View, Text, Pressable, StyleSheet, TextInput, Platform, KeyboardAvoidingView, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useColors } from '@/hooks/useColors';

export default function ForgotPasswordScreen() {
  const insets   = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const colors   = useColors();
  const [email, setEmail] = useState('');
  const [sent,  setSent]  = useState(false);
  const [loading, setLoading] = useState(false);

  const isValid = email.includes('@') && email.includes('.');

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[s.container, { paddingTop: topInset, backgroundColor: colors.background }]}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.scrollContent}>
          {!sent ? (
            <>
              <View style={s.iconRow}>
                <View style={[s.iconCircle, { backgroundColor: colors.primaryGlow }]}>
                  <Ionicons name="lock-open-outline" size={36} color={colors.primary} />
                </View>
              </View>

              <Text style={[s.title, { color: colors.text }]}>Reset Password</Text>
              <Text style={[s.subtitle, { color: colors.textSecondary }]}>
                Enter the email address associated with your account. We&apos;ll send you a link to reset your password.
              </Text>

              <View style={s.form}>
                <Text style={[s.label, { color: colors.text }]}>Email Address</Text>
                <View style={[s.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
                  <TextInput
                    style={[s.input, { color: colors.text }]}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.textTertiary}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              <Pressable
                style={[s.submitBtn, { backgroundColor: colors.primary }, (!isValid || loading) && { opacity: 0.5 }]}
                onPress={handleSubmit}
                disabled={!isValid || loading}
              >
                {loading
                  ? <ActivityIndicator color={colors.textInverse} size={18} />
                  : <Ionicons name="send" size={18} color={colors.textInverse} />
                }
                <Text style={[s.submitText, { color: colors.textInverse }]}>{loading ? 'Sending…' : 'Send Reset Link'}</Text>
              </Pressable>

              <Pressable style={s.backRow} onPress={() => router.back()}>
                <Text style={[s.backText, { color: colors.primary }]}>Back to Sign In</Text>
              </Pressable>
            </>
          ) : (
            <View style={s.successContainer}>
              <Ionicons name="checkmark-circle" size={72} color={colors.success} style={{ marginBottom: 20 }} />
              <Text style={[s.successTitle, { color: colors.text }]}>Check Your Email</Text>
              <Text style={[s.successSub, { color: colors.textSecondary }]}>We&apos;ve sent a password reset link to:</Text>
              <Text style={[s.emailDisplay, { color: colors.primary }]}>{email}</Text>
              <Text style={[s.successHint, { color: colors.textSecondary }]}>
                If you don&apos;t see it, check your spam folder. The link expires in 24 hours.
              </Text>

              <Pressable style={[s.submitBtn, { backgroundColor: colors.primary }]} onPress={() => router.replace('/login')}>
                <Ionicons name="chevron-back" size={18} color={colors.textInverse} />
                <Text style={[s.submitText, { color: colors.textInverse }]}>Back to Sign In</Text>
              </Pressable>

              <Pressable style={s.backRow} onPress={() => Alert.alert('Email Resent', 'A new reset link has been sent to your email.')}>
                <Text style={[s.backText, { color: colors.textSecondary }]}>
                  Didn&apos;t receive it?{' '}
                  <Text style={{ color: colors.primary, fontFamily: 'Poppins_600SemiBold' }}>Resend</Text>
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1 },
  header:       { paddingHorizontal: 20, paddingVertical: 12 },
  scrollContent:{ paddingHorizontal: 24, paddingBottom: 40, flexGrow: 1 },
  iconRow:      { alignItems: 'center', marginBottom: 24, marginTop: 8 },
  iconCircle:   { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  title:        { fontSize: 28, fontFamily: 'Poppins_700Bold', marginBottom: 8 },
  subtitle:     { fontSize: 15, fontFamily: 'Poppins_400Regular', lineHeight: 22, marginBottom: 28 },
  form:         { gap: 8, marginBottom: 28 },
  label:        { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  inputWrap:    { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1.5 },
  input:        { flex: 1, fontSize: 15, fontFamily: 'Poppins_400Regular' },
  submitBtn:    { borderRadius: 16, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 },
  submitText:   { fontSize: 17, fontFamily: 'Poppins_600SemiBold' },
  backRow:      { alignItems: 'center', paddingVertical: 8 },
  backText:     { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },

  successContainer:{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  successTitle: { fontSize: 24, fontFamily: 'Poppins_700Bold', marginBottom: 8 },
  successSub:   { fontSize: 15, fontFamily: 'Poppins_400Regular' },
  emailDisplay: { fontSize: 16, fontFamily: 'Poppins_600SemiBold', marginTop: 4, marginBottom: 16 },
  successHint:  { fontSize: 13, fontFamily: 'Poppins_400Regular', textAlign: 'center', lineHeight: 20, marginBottom: 32, paddingHorizontal: 16 },
});
