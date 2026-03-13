import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { LayoutRules, Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';

const FAQ_ITEMS = [
  { q: 'What is culturepass.app?', a: 'culturepass.app is a lifestyle platform designed for cultural diaspora communities. It connects you with events, communities, perks, and local businesses that celebrate your culture.' },
  { q: 'How do I join a community?', a: 'Visit the Communities tab to browse cultural communities near you. Tap on any community to see its details, then tap "Join" to become a member and receive updates on their events and activities.' },
  { q: 'How do I purchase event tickets?', a: 'Browse events from the Home or Explore tab. Tap on an event to view details, select your ticket tier, and complete the purchase using your wallet or saved payment method.' },
  { q: 'What are Perks & Benefits?', a: 'Perks are exclusive discounts, free tickets, early access, and VIP upgrades offered by culturepass.app and our sponsor partners. Visit the Perks page to browse and redeem available offers.' },
  { q: 'How can I list my business or organisation?', a: 'Go to the Submit page from the directory or profile section. Fill out the form with your organisation, business, or artist details and submit for review. Our team will verify and approve your listing.' },
];

const CONTACT_OPTIONS = [
  { icon: 'mail', label: 'Email Support', sub: 'support@culturepass.app',       colorKey: 'primary' as const, action: () => Linking.openURL('mailto:support@culturepass.app') },
  { icon: 'call', label: 'Phone Support', sub: '1800-CULTURE (1800 285 887)',   colorKey: 'success' as const, action: () => Linking.openURL('tel:1800285887')                },
];

export default function SettingsHelpScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const webTop = 0;
  
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const resolveColor = (key: 'primary' | 'success'): string => {
    if (key === 'success') return colors.success;
    return colors.primary;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTop, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight }]} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing.xxl + (Platform.OS === 'web' ? 34 : insets.bottom) }}>
        {/* Hero */}
        <LinearGradient colors={[colors.success, colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="help-buoy" size={30} color={colors.textInverse} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.textInverse }]}>How can we help?</Text>
          <Text style={[styles.heroSub, { color: colors.textInverse }]}>Find answers to common questions or reach out to our support team</Text>
        </LinearGradient>

        {/* FAQ */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Frequently Asked Questions</Text>
          {FAQ_ITEMS.map((faq, i) => (
            <Pressable
              key={i}
              style={[styles.faqCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setExpandedFaq(expandedFaq === i ? null : i); }}
            >
              <View style={styles.faqHeader}>
                <Text style={[styles.faqQuestion, { color: colors.text }]}>{faq.q}</Text>
                <Ionicons name={expandedFaq === i ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
              </View>
              {expandedFaq === i && <Text style={[styles.faqAnswer, { color: colors.text }]}>{faq.a}</Text>}
            </Pressable>
          ))}
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Us</Text>
          <View style={[styles.contactCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            {CONTACT_OPTIONS.map((opt, i) => (
              (() => {
                const contactColor = resolveColor(opt.colorKey);
                return (
              <View key={opt.label}>
                <Pressable
                  style={({ pressed }) => [styles.contactItem, pressed && { backgroundColor: colors.backgroundSecondary }]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); opt.action(); }}
                >
                  <View style={[styles.contactIcon, { backgroundColor: contactColor + '15' }]}> 
                    <Ionicons name={opt.icon as never} size={20} color={contactColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.contactLabel, { color: colors.text }]}>{opt.label}</Text>
                    <Text style={[styles.contactSub, { color: colors.text }]}>{opt.sub}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </Pressable>
                {i < CONTACT_OPTIONS.length - 1 && <View style={[styles.divider, { backgroundColor: colors.divider }]} />}
              </View>
                );
              })()
            ))}
          </View>
        </View>

        {/* Guidelines */}
        <View style={styles.section}>
          <Pressable
            style={[styles.guidelinesCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/legal/guidelines'); }}
          >
            <View style={[styles.contactIcon, { backgroundColor: colors.secondary + '15' }]}> 
              <Ionicons name="book-outline" size={20} color={colors.secondary} />
            </View>
            <View style={{ flex: 1 }}>
               <Text style={[styles.contactLabel, { color: colors.text }]}>Community Guidelines</Text>
               <Text style={[styles.contactSub, { color: colors.text }]}>Read our community standards and policies</Text>
            </View>
            <Ionicons name="open-outline" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container:    { flex: 1 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: LayoutRules.screenHorizontalPadding, paddingVertical: LayoutRules.iconTextGap },
  backBtn:      { width: LayoutRules.buttonHeight, height: LayoutRules.buttonHeight, borderRadius: LayoutRules.borderRadius, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerTitle:  { fontSize: 18, fontFamily: 'Poppins_700Bold' },

  heroCard:     { marginHorizontal: LayoutRules.screenHorizontalPadding, marginBottom: LayoutRules.sectionSpacing, borderRadius: LayoutRules.borderRadius, padding: LayoutRules.cardPaddingMax, alignItems: 'center' },
  heroIconWrap: { width: 60, height: 60, borderRadius: Radius.full, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  heroTitle:    { fontSize: 20, fontFamily: 'Poppins_700Bold', marginBottom: Spacing.xs },
  heroSub:      { fontSize: 13, fontFamily: 'Poppins_400Regular', textAlign: 'center', lineHeight: 18 },

  section:      { paddingHorizontal: LayoutRules.screenHorizontalPadding, marginBottom: LayoutRules.sectionSpacing },
  sectionTitle: { fontSize: 17, fontFamily: 'Poppins_700Bold', marginBottom: Spacing.sm },

  faqCard:      { borderRadius: LayoutRules.borderRadius, padding: LayoutRules.cardPaddingMin, borderWidth: 1, marginBottom: LayoutRules.betweenCards },
  faqHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: LayoutRules.iconTextGap },
  faqQuestion:  { fontSize: 14, fontFamily: 'Poppins_600SemiBold', flex: 1, lineHeight: 20 },
  faqAnswer:    { fontSize: 13, fontFamily: 'Poppins_400Regular', marginTop: Spacing.sm, lineHeight: 20 },

  contactCard:  { borderRadius: LayoutRules.borderRadius, borderWidth: 1, overflow: 'hidden' },
  contactItem:  { flexDirection: 'row', alignItems: 'center', padding: LayoutRules.cardPaddingMin, gap: LayoutRules.iconTextGap },
  contactIcon:  { width: LayoutRules.buttonHeight, height: LayoutRules.buttonHeight, borderRadius: LayoutRules.borderRadius, alignItems: 'center', justifyContent: 'center' },
  contactLabel: { fontSize: 15, fontFamily: 'Poppins_500Medium' },
  contactSub:   { fontSize: 12, fontFamily: 'Poppins_400Regular', marginTop: Spacing.xs },
  divider:      { height: StyleSheet.hairlineWidth, marginLeft: 66 },

  guidelinesCard:{ flexDirection: 'row', alignItems: 'center', gap: LayoutRules.iconTextGap, borderRadius: LayoutRules.borderRadius, padding: LayoutRules.cardPaddingMin, borderWidth: 1 },
});
