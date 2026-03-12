import { View, Text, Pressable, StyleSheet, Platform, useWindowDimensions, ScrollView } from 'react-native';
import { router, usePathname } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CultureTokens, gradients } from '@/constants/theme';
import { useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { SocialButton } from '@/components/ui/SocialButton';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { BlurView } from 'expo-blur';

const FEATURES = [
  { icon: 'calendar' as const, color: CultureTokens.saffron, bg: 'rgba(255, 140, 66, 0.15)', text: 'Discover cultural events near you' },
  { icon: 'people' as const, color: CultureTokens.coral, bg: 'rgba(255, 94, 91, 0.15)', text: 'Join vibrant communities' },
  { icon: 'gift' as const, color: CultureTokens.gold, bg: 'rgba(255, 200, 87, 0.15)', text: 'Unlock exclusive member perks' },
];

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1024;
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
    <View style={s.container}>
      <LinearGradient
        colors={gradients.culturepassBrandReversed}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.gradientBg}
      />

      {/* Decorative Orbs */}
      <View style={[s.orb, { top: -100, right: -50, backgroundColor: CultureTokens.indigo, opacity: 0.5, ...Platform.select({ web: { filter: 'blur(50px)' }, default: {} }) } as any]} />
      <View style={[s.orb, { bottom: -50, left: -50, backgroundColor: CultureTokens.saffron, opacity: 0.3, ...Platform.select({ web: { filter: 'blur(50px)' }, default: {} }) } as any]} />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.scrollContent,
          isDesktop && s.scrollContentDesktop,
          { paddingTop: isDesktop ? 60 : topInset + 40, paddingBottom: bottomInset + 30 }
        ]}
      >
        <View style={[s.cardContainer, isDesktop && s.cardContainerDesktop]}>
          {Platform.OS === 'ios' || Platform.OS === 'web' ? (
            <BlurView intensity={isDesktop ? 60 : 40} tint="dark" style={[StyleSheet.absoluteFill, s.cardBlur]} />
          ) : (
            <View style={[StyleSheet.absoluteFill, s.cardBlur, { backgroundColor: 'rgba(11, 11, 20, 0.85)' }]} />
          )}

          <View style={s.cardContent}>
            <View style={s.headerBlock}>
              <View style={s.logoContainer}>
                <Ionicons name="earth" size={40} color="#FFFFFF" />
              </View>
              <Text style={s.title}>CulturePass</Text>
              <Text style={s.tagline}>Belong Anywhere</Text>
              <Text style={s.subtitle}>
                Connecting global communities through events, culture, perks & shared identity. Powered by #CulturePass.
              </Text>
            </View>

            <View style={s.featureList}>
              {FEATURES.map((f, i) => (
                <View key={i} style={s.featureRow}>
                  <View style={[s.featureIcon, { backgroundColor: f.bg }]}>
                    <Ionicons name={f.icon} size={20} color={f.color} />
                  </View>
                  <Text style={s.featureText}>{f.text}</Text>
                </View>
              ))}
            </View>

            <View style={s.spacer} />

            <View style={s.actionStack}>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                rightIcon="arrow-forward"
                onPress={goToSignup}
                style={{ backgroundColor: CultureTokens.saffron }}
              >
                Create Account
              </Button>

              <Button
                variant="outline"
                size="lg"
                fullWidth
                onPress={goToLogin}
                style={{ borderColor: 'rgba(255,255,255,0.2)' }}
                labelStyle={{ color: '#FFFFFF' }}
              >
                I already have an account
              </Button>

              <View style={s.socialDivider}>
                <View style={s.divLine} />
                <Text style={s.divText}>or continue with</Text>
                <View style={s.divLine} />
              </View>

              <View style={s.socialRow}>
                <SocialButton provider="google" onPress={goToLocationViaGoogle} />
                <SocialButton provider="apple" onPress={goToLocationViaApple} />
              </View>

              <Pressable 
                onPress={handleSkip} 
                style={({ pressed }) => [s.skipBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={s.skipText}>Skip and explore</Text>
                <Ionicons name="arrow-forward" size={14} color="rgba(255,255,255,0.6)" />
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B14' },
  gradientBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.8 },
  orb: { position: 'absolute', width: 300, height: 300, borderRadius: 150 },
  
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20 },
  scrollContentDesktop: { paddingVertical: 60 },
  
  cardContainer: { width: '100%', maxWidth: 500, alignSelf: 'center', borderRadius: 32, overflow: 'hidden' },
  cardContainerDesktop: { maxWidth: 560 },
  cardBlur: { borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  cardContent: { padding: 32 },

  headerBlock: { alignItems: 'center', marginBottom: 28 },
  logoContainer: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  title: { fontSize: 36, fontFamily: 'Poppins_700Bold', letterSpacing: -0.5, color: '#FFFFFF' },
  tagline: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', letterSpacing: 2, textTransform: 'uppercase', color: CultureTokens.saffron, marginTop: 4 },
  subtitle: { fontSize: 14, fontFamily: 'Poppins_400Regular', textAlign: 'center', color: 'rgba(255,255,255,0.7)', marginTop: 12, lineHeight: 22 },

  featureList: { gap: 12, marginBottom: 16 },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  featureIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  featureText: { fontSize: 14, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.9)', flex: 1 },

  spacer: { height: 24 },
  actionStack: { gap: 12 },

  socialDivider: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  divLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  divText: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.5)' },
  socialRow: { flexDirection: 'row', gap: 12 },

  skipBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 16, paddingBottom: 8 },
  skipText: { fontSize: 14, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.6)' },
});
