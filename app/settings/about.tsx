import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LayoutRules, Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';

const FEATURES = [
  { icon: 'calendar', label: 'Events',      desc: 'Discover cultural events near you',          colorKey: 'accent' as const },
  { icon: 'people',   label: 'Communities', desc: 'Connect with your cultural communities',     colorKey: 'secondary' as const },
  { icon: 'gift',     label: 'Perks',       desc: 'Exclusive deals and benefits',               colorKey: 'warning' as const },
  { icon: 'business', label: 'Businesses',  desc: 'Support local cultural businesses',          colorKey: 'info' as const },
];

const SOCIAL_LINKS = [
  { icon: 'logo-facebook',  label: 'Facebook',  url: 'https://facebook.com/CulturePassApp',  colorKey: 'info' as const },
  { icon: 'logo-instagram', label: 'Instagram', url: 'https://instagram.com/CulturePassApp', colorKey: 'accent' as const },
  { icon: 'logo-twitter',   label: 'Twitter',   url: 'https://twitter.com/CulturePassApp',   colorKey: 'primary' as const },
];

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const webTop = Platform.OS === 'web' ? 67 : 0;
  const colors = useColors();

  const resolveColor = (key: 'accent' | 'secondary' | 'warning' | 'info' | 'primary'): string => {
    if (key === 'accent') return colors.accent;
    if (key === 'secondary') return colors.secondary;
    if (key === 'warning') return colors.warning;
    if (key === 'info') return colors.info;
    return colors.primary;
  };

  return (
    <View style={[s.container, { paddingTop: insets.top + webTop, backgroundColor: colors.background }]}>
      <View style={s.header}>
        <Pressable style={[s.backBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight }]} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>About</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing.xxl + (Platform.OS === 'web' ? 34 : insets.bottom) }}>
        {/* Logo hero */}
        <View style={s.logoSection}>
          <LinearGradient colors={[colors.primary, colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.logoGradient}>
            <Ionicons name="globe" size={38} color={colors.textInverse} />
          </LinearGradient>
          <Text style={[s.appName, { color: colors.text }]}>CulturePass</Text>
          <Text style={[s.version, { color: colors.textSecondary }]}>Version 1.0.0 · Australia</Text>
        </View>

        {/* Mission */}
        <View style={s.section}>
          <View style={[s.missionCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={[s.missionTitle, { color: colors.text }]}>Our Mission</Text>
            <Text style={[s.missionText, { color: colors.text }]}> 
              CulturePass is built to empower cultural diaspora communities by connecting people with the events, businesses, and organisations that celebrate their heritage. We believe culture is best experienced together, and our platform makes it easier to discover, engage, and thrive within your community.
            </Text>
          </View>
        </View>

        {/* Features grid */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Features</Text>
          <View style={s.featuresGrid}>
            {FEATURES.map((feature) => (
              (() => {
                const featureColor = resolveColor(feature.colorKey);
                return (
              <View key={feature.label} style={[s.featureCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                <View style={[s.featureIcon, { backgroundColor: featureColor + '15' }]}> 
                  <Ionicons name={feature.icon as never} size={24} color={featureColor} />
                </View>
                <Text style={[s.featureLabel, { color: colors.text }]}>{feature.label}</Text>
                <Text style={[s.featureDesc, { color: colors.text }]}>{feature.desc}</Text>
              </View>
                );
              })()
            ))}
          </View>
        </View>

        {/* Social links */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Follow Us</Text>
          <View style={[s.socialCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            {SOCIAL_LINKS.map((link, i) => (
              (() => {
                const linkColor = resolveColor(link.colorKey);
                return (
              <View key={link.label}>
                <Pressable
                  style={({ pressed }) => [s.socialItem, pressed && { backgroundColor: colors.backgroundSecondary }]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL(link.url); }}
                >
                  <View style={[s.socialIcon, { backgroundColor: linkColor + '15' }]}> 
                    <Ionicons name={link.icon as never} size={20} color={linkColor} />
                  </View>
                  <Text style={[s.socialLabel, { color: colors.text }]}>{link.label}</Text>
                  <Ionicons name="open-outline" size={16} color={colors.textSecondary} />
                </Pressable>
                {i < SOCIAL_LINKS.length - 1 && <View style={[s.divider, { backgroundColor: colors.divider }]} />}
              </View>
                );
              })()
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={s.taglineSection}>
          <Ionicons name="heart" size={20} color={colors.primary} />
          <Text style={[s.tagline, { color: colors.text }]}>Made with love for cultural communities</Text>
          <Text style={[s.copyright, { color: colors.textSecondary }]}>© 2025 CulturePass. All rights reserved.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: LayoutRules.screenHorizontalPadding, paddingVertical: LayoutRules.iconTextGap },
  backBtn:      { width: LayoutRules.buttonHeight, height: LayoutRules.buttonHeight, borderRadius: LayoutRules.borderRadius, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerTitle:  { fontSize: 18, fontFamily: 'Poppins_700Bold' },

  logoSection:  { alignItems: 'center', paddingVertical: Spacing.xl },
  logoGradient: { width: 82, height: 82, borderRadius: Spacing.lg, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  appName:      { fontSize: 28, fontFamily: 'Poppins_700Bold', marginBottom: Spacing.xs },
  version:      { fontSize: 13, fontFamily: 'Poppins_400Regular' },

  section:      { paddingHorizontal: LayoutRules.screenHorizontalPadding, marginBottom: LayoutRules.sectionSpacing },
  sectionTitle: { fontSize: 17, fontFamily: 'Poppins_700Bold', marginBottom: Spacing.sm },
  missionCard:  { borderRadius: LayoutRules.borderRadius, padding: LayoutRules.cardPaddingMax, borderWidth: 1 },
  missionTitle: { fontSize: 16, fontFamily: 'Poppins_700Bold', marginBottom: Spacing.sm },
  missionText:  { fontSize: 14, fontFamily: 'Poppins_400Regular', lineHeight: 22 },

  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: LayoutRules.betweenCards },
  featureCard:  { width: '48%' as never, borderRadius: LayoutRules.borderRadius, padding: LayoutRules.cardPaddingMin, borderWidth: 1 },
  featureIcon:  { width: 48, height: 48, borderRadius: LayoutRules.borderRadius, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  featureLabel: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', marginBottom: Spacing.xs },
  featureDesc:  { fontSize: 12, fontFamily: 'Poppins_400Regular', lineHeight: 17 },

  socialCard:   { borderRadius: LayoutRules.borderRadius, borderWidth: 1, overflow: 'hidden' },
  socialItem:   { flexDirection: 'row', alignItems: 'center', padding: LayoutRules.cardPaddingMin, gap: LayoutRules.iconTextGap },
  socialIcon:   { width: LayoutRules.buttonHeight, height: LayoutRules.buttonHeight, borderRadius: LayoutRules.borderRadius, alignItems: 'center', justifyContent: 'center' },
  socialLabel:  { flex: 1, fontSize: 15, fontFamily: 'Poppins_500Medium' },
  divider:      { height: StyleSheet.hairlineWidth, marginLeft: 66 },

  taglineSection:{ alignItems: 'center', paddingVertical: Spacing.xl, paddingHorizontal: Spacing.xxl, gap: Spacing.sm },
  tagline:      { fontSize: 14, fontFamily: 'Poppins_600SemiBold', textAlign: 'center' },
  copyright:    { fontSize: 12, fontFamily: 'Poppins_400Regular' },
});
