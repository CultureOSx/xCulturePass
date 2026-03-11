import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, usePathname } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { gradients } from '@/constants/theme';

// ---------------------------------------------------------------------------
// Guest view (intentionally dark)
// ---------------------------------------------------------------------------
export function GuestProfileView({ topInset }: { topInset: number }) {
  const pathname = usePathname();
  const colors = useColors();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1024;
  const ctaTextColor = colors.background;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient
        colors={gradients.culturepassBrand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.95 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[gs.orb, gs.orbTop, { backgroundColor: colors.primary + '33' }]} />
      <View style={[gs.orb, gs.orbBottom, { backgroundColor: colors.accent + '2E' }]} />
      <View style={[gs.header, { paddingTop: topInset }]}>
        <Text style={[gs.headerTitle, { color: colors.textInverse }]}>Profile</Text>
      </View>
      <ScrollView contentContainerStyle={[gs.content, isDesktop && gs.desktopContent]} showsVerticalScrollIndicator={false}>
        <View style={[gs.contentCard, isDesktop && gs.desktopCard, { backgroundColor: colors.surfaceElevated ?? (Platform.OS === 'web' ? '#FFF8F0' : '#2C2A72'), borderColor: colors.border + '66' }]}>
        <View style={[gs.iconWrap, { backgroundColor: colors.textInverse + '24', borderColor: colors.textInverse + '47' }]}>
          <Ionicons name="person-circle-outline" size={64} color={colors.textInverse + 'E6'} />
        </View>
        <Text style={[gs.title, { color: colors.text }]}>Your Cultural Passport</Text>
        <Text style={[gs.subtitle, { color: colors.textSecondary }]}>
          Sign in to access your profile, tickets, saved events, wallet, and connect with communities across Australia.
        </Text>
        <View style={gs.featureList}>
          {[
            { icon: 'ticket-outline'  as const, text: 'View your event tickets & QR codes'          },
            { icon: 'bookmark-outline'as const, text: 'Save events and join communities'             },
            { icon: 'wallet-outline'  as const, text: 'Manage your wallet & payment methods'        },
            { icon: 'qr-code-outline' as const, text: 'Share your CulturePass profile & ID'         },
          ].map((f) => (
            <View key={f.text} style={[gs.featureRow, { backgroundColor: colors.textInverse + '0F', borderColor: colors.textInverse + '14' }]}>
              <View style={[gs.featureIcon, { backgroundColor: colors.warning + '1F' }]}>
                <Ionicons name={f.icon} size={18} color={colors.warning} />
              </View>
              <Text style={[gs.featureText, { color: colors.text }]}>{f.text}</Text>
            </View>
          ))}
        </View>
        <Pressable style={[gs.primaryBtn, { backgroundColor: '#FFFFFF' }]} onPress={() => router.push('/(onboarding)/signup')}>
          <Text style={[gs.primaryBtnText, { color: colors.primary }]}>Create Free Account</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.primary} />
        </Pressable>
        <Pressable style={[gs.secondaryBtn, { borderColor: colors.primary, backgroundColor: '#FFFFFF' }]} onPress={() => router.push('/(onboarding)/login')}>
          <Text style={[gs.secondaryBtnText, { color: colors.primary }]}>I already have an account</Text>
        </Pressable>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// Guest view styles (intentionally static dark)
const gs = StyleSheet.create({
  orb:       { position: 'absolute', borderRadius: 300 },
  orbTop:    { width: 280, height: 280, top: -70, right: -90 },
  orbBottom: { width: 220, height: 220, bottom: '18%' as never, left: -70 },
  header:    { paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center' },
  headerTitle:{ fontSize: 17, fontFamily: 'Poppins_600SemiBold', letterSpacing: -0.4 },
  content:   { paddingHorizontal: 20, paddingTop: 20, alignItems: 'center' },
  desktopContent: { justifyContent: 'center', minHeight: '100%' as unknown as number },
  contentCard: {
    width: '100%',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 18,
    borderWidth: 1,
  },
  desktopCard: { maxWidth: 560 },
  iconWrap:  { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, marginBottom: 24, alignSelf: 'center' },
  title:     { fontSize: 26, fontFamily: 'Poppins_700Bold', textAlign: 'center', marginBottom: 12, letterSpacing: -0.3 },
  subtitle:  { fontSize: 15, fontFamily: 'Poppins_400Regular', textAlign: 'center', lineHeight: 23, marginBottom: 28 },
  featureList:{ gap: 10, marginBottom: 32, width: '100%' },
  featureRow:{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, borderWidth: StyleSheet.hairlineWidth },
  featureIcon:{ width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  featureText:{ fontSize: 14, fontFamily: 'Poppins_500Medium', flex: 1 },
  primaryBtn: { borderRadius: 14, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12, width: '100%' },
  primaryBtnText:{ fontSize: 16, fontFamily: 'Poppins_700Bold' },
  secondaryBtn:{ height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1.5, width: '100%' },
  secondaryBtnText:{ fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
});
