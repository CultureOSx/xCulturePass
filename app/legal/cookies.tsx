import { View, Text, Pressable, StyleSheet, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { Colors } from '@/constants/theme';
import { router } from 'expo-router';

const COOKIE_TYPES = [
  { name: 'Essential Cookies',   desc: 'Required for the app to function. They enable core features like secure login, session management, and payment processing. These cannot be disabled.',                                                           icon: 'lock-closed' as const, colorType: 'error' as const, required: true },
  { name: 'Analytics Cookies',   desc: 'Help us understand how users interact with CulturePass. We use anonymised analytics to improve the user experience, identify popular features, and fix issues.',                                                 icon: 'analytics' as const,   colorType: 'info' as const, required: false },
  { name: 'Preference Cookies',  desc: 'Remember your settings such as language preference, selected location, theme, and notification preferences. These make your experience more personalised.',                                                      icon: 'settings' as const,    colorType: 'secondary' as const, required: false },
  { name: 'Marketing Cookies',   desc: 'Used to deliver relevant event recommendations and sponsor offers based on your interests and browsing behaviour. You can opt out of these at any time.',                                                        icon: 'megaphone' as const,   colorType: 'warning' as const, required: false },
];

const SECTIONS = [
  { title: '1. What Are Cookies & Local Storage?', body: 'Cookies are small text files stored on your device when you use a website. CulturePass also uses local storage (AsyncStorage on mobile) to save your preferences and session data. On mobile devices, we use equivalent technologies to cookies for the same purposes.' },
  { title: '2. How We Use Data', body: 'We use cookies and local storage to:\n\n• Keep you signed in securely\n• Remember your location and community preferences\n• Store your onboarding progress\n• Save your event bookmarks and joined communities\n• Analyse app performance and usage patterns\n• Personalise event recommendations\n• Deliver relevant sponsor content and perks' },
  { title: '3. Third-Party Data Collection', body: 'Some of our partners may collect data through their own cookies when you interact with their content on CulturePass:\n\n• Payment processors (Stripe) for secure transactions\n• Analytics providers for usage insights\n• Event organisers for ticket delivery\n\nThese third parties have their own privacy policies governing their data collection.' },
  { title: '4. Managing Your Preferences', body: 'You can manage your data preferences through:\n\n• In-app settings: Profile > Notifications to control marketing communications\n• Device settings: Clear app data or cache through your device settings\n• Browser settings: For web users, manage cookies through your browser preferences\n• Contact us: Email privacy@culturepass.au to request data deletion' },
  { title: '5. Data Retention for Cookies', body: 'Essential cookies: Expire when your session ends or after 30 days of inactivity\nAnalytics data: Retained for 26 months in anonymised form\nPreference cookies: Stored until you clear them or delete your account\nMarketing cookies: Expire after 12 months or when you opt out' },
  { title: '6. Compliance', body: 'This Data & Cookie Policy complies with:\n\n• Australian Privacy Act 1988\n• EU/UK General Data Protection Regulation (GDPR)\n• Canadian PIPEDA\n• UAE Federal Decree Law No. 45 of 2021\n• New Zealand Privacy Act 2020\n\nWe regularly review and update our practices to ensure ongoing compliance.' },
  { title: '7. Updates to This Policy', body: 'We may update this policy as our services evolve. Material changes will be communicated via in-app notifications or email. The "Last updated" date at the top indicates when the policy was last revised.' },
  { title: '8. Contact', body: 'For questions about our data practices:\n\nData Protection Officer\nCulturePass Pty Ltd\nEmail: privacy@culturepass.app\nPhone: 1800-CULTURE (1800 285 887)\nAddress: Level 10, 100 Market Street, Sydney NSW 2000, Australia' },
];

export default function CookiesScreen() {
  const insets = useSafeAreaInsets();
  const webTop = 0;
  const colors = useColors();

  return (
    <View style={[s.container, { paddingTop: insets.top + webTop, backgroundColor: colors.background }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={[s.backBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>Data & Cookie Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 + (Platform.OS === 'web' ? 34 : insets.bottom) }} showsVerticalScrollIndicator={false}>
        <View style={[s.intro, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <View style={[s.iconWrap, { backgroundColor: colors.warning + '15' }]}>
            <Ionicons name="finger-print" size={28} color={colors.warning} />
          </View>
          <Text style={[s.introTitle, { color: colors.text }]}>Data & Cookie Policy</Text>
          <Text style={[s.introDate, { color: colors.primary }]}>Last updated: 1 February 2026</Text>
          <Text style={[s.introPara, { color: colors.text }]}>This policy explains how CulturePass uses cookies, local storage, and similar technologies to provide and improve our services.</Text>
        </View>

        <View style={s.cookieSection}>
          <Text style={[s.cookieSectionTitle, { color: colors.text }]}>Types of Data We Collect</Text>
          {COOKIE_TYPES.map((ct, i) => {
            const ctColor = ct.colorType === 'error' ? colors.error : ct.colorType === 'info' ? colors.info : ct.colorType === 'secondary' ? colors.secondary : colors.warning;
            return (
            <View key={i} style={[s.cookieCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <View style={s.cookieHeader}>
                <View style={[s.cookieIcon, { backgroundColor: ctColor + '15' }]}>
                  <Ionicons name={ct.icon as never} size={20} color={ctColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.cookieName, { color: colors.text }]}>{ct.name}</Text>
                  {ct.required && <View style={s.requiredBadge}><Text style={s.requiredText}>Required</Text></View>}
                </View>
              </View>
              <Text style={[s.cookieDesc, { color: colors.text }]}>{ct.desc}</Text>
            </View>
            );
          })}
        </View>

        {SECTIONS.map((sec, i) => (
          <View key={i} style={s.section}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>{sec.title}</Text>
            <Text style={[s.sectionBody, { color: colors.text }]}>{sec.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:         { flex: 1 },
  header:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn:           { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerTitle:       { fontSize: 18, fontFamily: 'Poppins_700Bold' },
  intro:             { marginHorizontal: 20, marginBottom: 24, borderRadius: 18, padding: 20, borderWidth: 1, alignItems: 'center' },
  iconWrap:          { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  introTitle:        { fontSize: 20, fontFamily: 'Poppins_700Bold', marginBottom: 4 },
  introDate:         { fontSize: 12, fontFamily: 'Poppins_500Medium', marginBottom: 12 },
  introPara:         { fontSize: 13, fontFamily: 'Poppins_400Regular', textAlign: 'center', lineHeight: 20 },
  cookieSection:     { paddingHorizontal: 20, marginBottom: 24 },
  cookieSectionTitle:{ fontSize: 17, fontFamily: 'Poppins_700Bold', marginBottom: 12 },
  cookieCard:        { borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 10 },
  cookieHeader:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  cookieIcon:        { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cookieName:        { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  requiredBadge:     { backgroundColor: Colors.error + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginTop: 2 },
  requiredText:      { fontSize: 10, fontFamily: 'Poppins_600SemiBold', color: Colors.error },
  cookieDesc:        { fontSize: 12, fontFamily: 'Poppins_400Regular', lineHeight: 18 },
  section:           { marginHorizontal: 20, marginBottom: 16 },
  sectionTitle:      { fontSize: 15, fontFamily: 'Poppins_700Bold', marginBottom: 8 },
  sectionBody:       { fontSize: 13, fontFamily: 'Poppins_400Regular', lineHeight: 21 },
});
