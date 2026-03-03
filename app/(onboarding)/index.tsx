import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { router, usePathname } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { SocialButton } from '@/components/ui/SocialButton';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useColors } from '@/hooks/useColors';

const FEATURES = [
  { icon: 'calendar' as const, color: Colors.primary, bg: Colors.primaryGlow, text: 'Discover cultural events near you' },
  { icon: 'people' as const, color: Colors.secondary, bg: 'rgba(238,51,78,0.12)', text: 'Join vibrant communities' },
  { icon: 'gift' as const, color: Colors.accent, bg: 'rgba(252,177,49,0.12)', text: 'Unlock exclusive member perks' },
];

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const topInset = Platform.OS === 'web' ? 0 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;
  const { completeOnboarding } = useOnboarding();
  const pathname = usePathname();

  const goToSignup = useCallback(() => router.push({ pathname: '/(onboarding)/signup', params: { redirectTo: pathname } } as any), [pathname]);
  const goToLogin = useCallback(() => router.push({ pathname: '/(onboarding)/login', params: { redirectTo: pathname } } as any), [pathname]);
  const goToLocationViaGoogle = useCallback(() => router.push('/(onboarding)/location'), []);
  const goToLocationViaApple = useCallback(() => router.push('/(onboarding)/location'), []);

  const handleSkip = useCallback(() => {
    completeOnboarding();
    router.replace('/(tabs)');
  }, [completeOnboarding]);

  return (
    <View style={styles.container}>
      {/* Hero gradient background */}
      <LinearGradient
        colors={['#001028', '#00305A', '#0081C8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative orbs */}
      <View style={[styles.orb, styles.orbTop]} />
      <View style={[styles.orb, styles.orbMid]} />
      <View style={[styles.orb, styles.orbBottom]} />

      <View style={[styles.topSection, { paddingTop: topInset + 48 }]}>
        <View style={styles.logoRow}>
          <View style={styles.logoContainer}>
            <Ionicons name="earth" size={40} color={colors.textInverse} />
          </View>
        </View>

        <Text style={[styles.title, { color: colors.textInverse }]}>CulturePass App</Text>
        <Text style={[styles.tagline, { color: colors.textInverse + '8C' }]}>Belong Anywhere</Text>
        <Text style={[styles.subtitle, { color: colors.textInverse + 'A6' }]}>
          Connecting global communities through events, culture, perks &amp; shared identity. Powered by #CulturePassApp. #CultureOS.
        </Text>

        <View style={styles.featureList}>
          {FEATURES.map((f) => (
            <View key={f.text} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: f.bg }]}>
                <Ionicons name={f.icon} size={18} color={f.color} />
              </View>
              <Text style={[styles.featureText, { color: colors.textInverse + 'D9' }]}>{f.text}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.bottomSection, { paddingBottom: bottomInset + 16 }]}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          rightIcon="arrow-forward"
          onPress={goToSignup}
        >
          Create Account
        </Button>

        <Button
          variant="outline"
          size="lg"
          fullWidth
          onPress={goToLogin}
        >
          I already have an account
        </Button>

        <View style={styles.socialDivider}>
          <View style={styles.divLine} />
          <Text style={styles.divText}>or continue with</Text>
          <View style={styles.divLine} />
        </View>

        <View style={styles.socialRow}>
          <SocialButton provider="google" onPress={goToLocationViaGoogle} />
          <SocialButton provider="apple" onPress={goToLocationViaApple} />
        </View>

        <Pressable 
          onPress={handleSkip} 
          style={({ pressed }) => [styles.skipButton, pressed && { opacity: 0.7 }]} 
          accessible 
          accessibilityLabel="Skip onboarding"
        >
          <Text style={[styles.skipText, { color: colors.textInverse + '66' }]}>Skip and explore</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.textInverse + '66'} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#001028' },

  orb: { position: 'absolute', borderRadius: 300 },
  orbTop: {
    width: 300, height: 300,
    top: -80, right: -80,
    backgroundColor: 'rgba(0,129,200,0.25)',
  },
  orbMid: {
    width: 200, height: 200,
    top: '35%', left: -60,
    backgroundColor: 'rgba(238,51,78,0.18)',
  },
  orbBottom: {
    width: 180, height: 180,
    bottom: '20%', right: -50,
    backgroundColor: 'rgba(252,177,49,0.16)',
  },

  topSection: { flex: 1, alignItems: 'center', paddingHorizontal: 32 },

  logoRow: { marginBottom: 28 },
  logoContainer: {
    width: 88, height: 88, borderRadius: 28,
    backgroundColor: 'rgba(0,129,200,0.30)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(64,168,232,0.60)',
  },

  title: {
    fontSize: 38, fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14, fontFamily: 'Poppins_500Medium',
    marginTop: 6, letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 15, fontFamily: 'Poppins_400Regular',
    textAlign: 'center', marginTop: 16, lineHeight: 24, paddingHorizontal: 8,
  },

  featureList: { marginTop: 28, gap: 14, width: '100%' },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)',
  },
  featureIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  featureText: { fontSize: 14, fontFamily: 'Poppins_500Medium', flex: 1 },

  bottomSection: { paddingHorizontal: 24, gap: 10 },

  socialDivider: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 },
  divLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.15)' },
  divText: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.4)' },

  socialRow: { flexDirection: 'row', gap: 12 },

  skipButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12,
  },
  skipText: { fontSize: 14, fontFamily: 'Poppins_500Medium' },
});
