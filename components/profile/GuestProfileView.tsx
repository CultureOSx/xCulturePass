import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, usePathname } from 'expo-router';
import { useColors } from '@/hooks/useColors';

// ---------------------------------------------------------------------------
// Guest view (intentionally dark)
// ---------------------------------------------------------------------------
export function GuestProfileView({ topInset }: { topInset: number }) {
  const pathname = usePathname();
  const colors = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient
        colors={['#001028', '#00305A', '#0081C8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[gs.orb, gs.orbTop]} />
      <View style={[gs.orb, gs.orbBottom]} />
      <View style={[gs.header, { paddingTop: topInset }]}>
        <Text style={[gs.headerTitle, { color: colors.textInverse }]}>Profile</Text>
      </View>
      <ScrollView contentContainerStyle={gs.content} showsVerticalScrollIndicator={false}>
        <View style={gs.iconWrap}>
          <Ionicons name="person-circle-outline" size={64} color={colors.textInverse + 'E6'} />
        </View>
        <Text style={[gs.title, { color: colors.textInverse }]}>Your Cultural Passport</Text>
        <Text style={[gs.subtitle, { color: colors.textInverse + 'B3' }]}>
          Sign in to access your profile, tickets, saved events, wallet, and connect with communities across Australia.
        </Text>
        <View style={gs.featureList}>
          {[
            { icon: 'ticket-outline'  as const, text: 'View your event tickets & QR codes'          },
            { icon: 'bookmark-outline'as const, text: 'Save events and join communities'             },
            { icon: 'wallet-outline'  as const, text: 'Manage your wallet & payment methods'        },
            { icon: 'qr-code-outline' as const, text: 'Share your CulturePass profile & ID'         },
          ].map((f) => (
            <View key={f.text} style={gs.featureRow}>
              <View style={gs.featureIcon}>
                <Ionicons name={f.icon} size={18} color={colors.warning} />
              </View>
              <Text style={[gs.featureText, { color: colors.textInverse + 'D9' }]}>{f.text}</Text>
            </View>
          ))}
        </View>
        <Pressable style={[gs.primaryBtn, { backgroundColor: colors.textInverse }]} onPress={() => router.push({ pathname: '/(onboarding)/signup', params: { redirectTo: pathname } } as any)}>
          <Text style={[gs.primaryBtnText, { color: colors.background }]}>Create Free Account</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.background} />
        </Pressable>
        <Pressable style={gs.secondaryBtn} onPress={() => router.push({ pathname: '/(onboarding)/login', params: { redirectTo: pathname } } as any)}>
          <Text style={[gs.secondaryBtnText, { color: colors.textInverse }]}>I already have an account</Text>
        </Pressable>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// Guest view styles (intentionally static dark)
const gs = StyleSheet.create({
  orb:       { position: 'absolute', borderRadius: 300 },
  orbTop:    { width: 260, height: 260, top: -60,    right: -80, backgroundColor: 'rgba(0,129,200,0.22)' },
  orbBottom: { width: 200, height: 200, bottom: '20%' as never, left: -60,  backgroundColor: 'rgba(238,51,78,0.15)'  },
  header:    { paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center' },
  headerTitle:{ fontSize: 17, fontFamily: 'Poppins_600SemiBold', letterSpacing: -0.4 },
  content:   { paddingHorizontal: 28, paddingTop: 20, alignItems: 'center' },
  iconWrap:  { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(0,129,200,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(64,168,232,0.5)', marginBottom: 24 },
  title:     { fontSize: 26, fontFamily: 'Poppins_700Bold', textAlign: 'center', marginBottom: 12, letterSpacing: -0.3 },
  subtitle:  { fontSize: 15, fontFamily: 'Poppins_400Regular', textAlign: 'center', lineHeight: 23, marginBottom: 28 },
  featureList:{ gap: 10, marginBottom: 32, width: '100%' },
  featureRow:{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.08)' },
  featureIcon:{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(252,177,49,0.12)', alignItems: 'center', justifyContent: 'center' },
  featureText:{ fontSize: 14, fontFamily: 'Poppins_500Medium', flex: 1 },
  primaryBtn: { borderRadius: 14, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12, width: '100%' },
  primaryBtnText:{ fontSize: 16, fontFamily: 'Poppins_700Bold' },
  secondaryBtn:{ height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)', backgroundColor: 'rgba(255,255,255,0.08)', width: '100%' },
  secondaryBtnText:{ fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
});
