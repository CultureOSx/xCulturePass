import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  ImageBackground,
  Image,
  Share,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CultureTokens } from '@/constants/theme';

const HERO_IMAGE =
  'https://www.discovertasmania.com.au/siteassets/experiences-unordinary-stories/tasmania-in-summer/1001159-2.jpg?resize=qtC69Ish9L24PErKrxCBYRcD64M_nhskIqezaGSSvB7TGgRe5_Ovqqf5a5ShpX5jOCAfKLknfJY5pLXvNT4xVw';
const PROBLEM_IMAGE =
  'https://images.thewest.com.au/publication/B881029571Z/1543282055740_G2I1US5DR.1-2.jpg';
const APP_URL = 'https://culturepass.au/app';

const PREVIEW_IMAGES = [
  'https://cdn.dribbble.com/userupload/43095921/file/original-1ad735cfa4c86d65b3e444ecfe504b38.png',
  'https://cdn.dribbble.com/userupload/41780675/file/original-b019614d04f39bc28d4bd09db63aefd2?resize=400x0',
  'https://cdn.dribbble.com/userupload/42024993/file/original-e64bb6a128052b2b7f8648b716efb18a.png?format=webp&resize=400x300&vertical=center',
  'https://cdn.dribbble.com/userupload/26078443/file/original-f524757e23d1c0a3de9176df63d7a5dd.png?format=webp&resize=400x300&vertical=center',
] as const;

const TRUST_SIGNALS = [
  'Built in Australia',
  'Secure Payments via Stripe',
  'Multi-Community Platform',
] as const;

const PROBLEMS = [
  'Events are scattered across social media',
  'Communities operate in silos',
  'Artists lack structured visibility',
  'Sponsors lack targeted cultural reach',
  'Councils lack centralized cultural infrastructure',
] as const;

const ECOSYSTEM = [
  { title: 'Discover', items: ['Events', 'Venues', 'Communities'], icon: 'search-outline' as const, color: CultureTokens.saffron },
  { title: 'Book', items: ['Tickets', 'Wallet', 'Payments'], icon: 'ticket-outline' as const, color: CultureTokens.coral },
  { title: 'Follow', items: ['Artists', 'Sponsors', 'Businesses'], icon: 'people-outline' as const, color: CultureTokens.teal },
  { title: 'Unlock', items: ['Perks', 'Cashback', 'Memberships'], icon: 'gift-outline' as const, color: CultureTokens.gold },
] as const;

const STEPS = [
  { title: 'Choose Your City', detail: 'Sydney → Melbourne → Brisbane → Perth' },
  { title: 'Select Your Communities', detail: 'Indian • Lebanese • Korean • Greek • Filipino • African • Latin' },
  { title: 'Discover & Attend', detail: 'Browse events → Buy tickets → Store in wallet' },
  { title: 'Stay Connected', detail: 'Follow artists, sponsors, and communities.' },
] as const;

const MONETIZATION = [
  '3–5% ticket commission',
  'Business subscriptions',
  'Sponsor placements',
  'Featured listings',
] as const;

const STACK = [
  'React Native / Expo',
  'PostGIS Geo Filtering',
  'Stripe Connect Express',
  'Firebase Notifications',
  'Role-Based Access Control',
] as const;

export default function Get2KnowPage() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768;
  const sidePad = isDesktop ? 80 : isTablet ? 40 : 20;
  const sectionY = isTablet ? 64 : 48;

  const shareQrPromo = async () => {
    try {
      await Share.share({
        title: 'CulturePass Australia V1',
        message: `Discover your culture and belong anywhere with CulturePass: ${APP_URL}`,
        url: APP_URL,
      });
    } catch {
      // no-op
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 56 }}
      >
        <ImageBackground source={{ uri: HERO_IMAGE }} style={styles.heroBg}>
          <LinearGradient colors={['rgba(11,11,20,0.8)', 'rgba(11,11,20,0.4)', '#0B0B14']} style={styles.heroOverlay}>
            <View style={[styles.container, { paddingHorizontal: sidePad }]}> 
              <View style={[styles.heroContent, { paddingTop: isDesktop ? 160 : 120, paddingBottom: isDesktop ? 160 : 96 }]}> 
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                  <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                  <Text style={styles.backBtnText}>Back</Text>
                </Pressable>
                
                <Text style={[styles.heroTitle, isTablet && styles.heroTitleDesktop]}>Discover Your Culture. Belong Anywhere.</Text>
                <Text style={styles.heroSubtitle}>Australia’s Cultural Discovery & Community Platform.</Text>

                <View style={styles.heroButtonRow}>
                  <Button variant="gold" size="lg" onPress={() => router.push('/(onboarding)/signup')}>
                    Get Early Access
                  </Button>
                  <Button variant="outline" size="lg" onPress={() => router.push('/(tabs)')}>
                    Explore Events
                  </Button>
                </View>

                <View style={styles.trustRow}>
                  {TRUST_SIGNALS.map((signal) => (
                    <View key={signal} style={styles.trustItem}>
                      <Ionicons name="shield-checkmark" size={16} color={CultureTokens.success} />
                      <Text style={styles.trustText}>{signal}</Text>
                    </View>
                  ))}
                </View>

                <Card style={styles.qrPromoCard} padding={20}>
                  <View style={styles.qrHeader}>
                    <View>
                      <Text style={styles.qrTitle}>Promote Your QR on Top</Text>
                      <Text style={styles.qrSubtitle}>Drive instant app join and ticket conversion.</Text>
                    </View>
                    <Ionicons name="qr-code-outline" size={32} color={CultureTokens.indigo} />
                  </View>
                  <View style={styles.qrPreview}>
                    <Ionicons name="qr-code" size={140} color="#FFFFFF" />
                  </View>
                  <View style={styles.qrActions}>
                    <Button variant="primary" fullWidth onPress={shareQrPromo}>
                      Promote QR Code
                    </Button>
                    <Button variant="outline" fullWidth onPress={() => router.push('/profile/qr')}>
                      Open My QR
                    </Button>
                  </View>
                </Card>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>

        <Section title="Culture Is Fragmented" spacing={sectionY} sidePad={sidePad}>
          <View style={[styles.split, isDesktop && styles.splitDesktop]}>
            <View style={styles.splitCol}>
              {PROBLEMS.map((item) => (
                <View key={item} style={styles.bulletRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.body}>{item}</Text>
                </View>
              ))}
              <Text style={styles.bridge}>CulturePass connects it all.</Text>
            </View>
            <Image source={{ uri: PROBLEM_IMAGE }} style={styles.problemImage} />
          </View>
        </Section>

        <Section title="One App. Entire Ecosystem." subtitle="Social + Commerce + Governance in one unified system." spacing={sectionY} sidePad={sidePad} surface>
          <View style={[styles.grid4, isDesktop && styles.grid4Desktop]}>
            {ECOSYSTEM.map((block) => (
              <Card key={block.title} style={styles.ecoCard} padding={24}>
                <View style={[styles.ecoIconWrap, { backgroundColor: block.color + '15' }]}>
                  <Ionicons name={block.icon} size={28} color={block.color} />
                </View>
                <Text style={styles.cardTitle}>{block.title}</Text>
                {block.items.map((item) => (
                  <Text key={item} style={styles.cardLine}>— {item}</Text>
                ))}
              </Card>
            ))}
          </View>
        </Section>

        <Section title="How It Works" spacing={sectionY} sidePad={sidePad} centered>
          <View style={[styles.stepsWrap, isDesktop && styles.stepsWrapDesktop]}>
            {STEPS.map((step, index) => (
              <View key={step.title} style={styles.stepCard}>
                <View style={[styles.stepBadge, { backgroundColor: CultureTokens.saffron + '15' }]}>
                  <Text style={[styles.stepBadgeText, { color: CultureTokens.saffron }]}>{index + 1}</Text>
                </View>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepText}>{step.detail}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Product Preview" subtitle="Core screens: Home, Calendar, Map Radius, Event Detail, Wallet, Artist Profile, Sponsor Profile" spacing={sectionY} sidePad={sidePad}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewRow}>
            {PREVIEW_IMAGES.map((src, i) => (
              <Image key={i} source={{ uri: src }} style={styles.previewImage} />
            ))}
          </ScrollView>
          <View style={styles.inlineCta}>
            <Button variant="outline" onPress={() => router.push('/(tabs)')}>See Full Preview</Button>
          </View>
        </Section>

        <Section spacing={sectionY} sidePad={sidePad}>
          <View style={[styles.split, isDesktop && styles.splitDesktop]}>
            <Card style={styles.splitPanel} padding={26}>
              <View style={[styles.ecoIconWrap, { backgroundColor: CultureTokens.indigo + '15', marginBottom: 16 }]}>
                <Ionicons name="pie-chart" size={24} color={CultureTokens.indigo} />
              </View>
              <Text style={styles.panelTitle}>For Organizers</Text>
              <Text style={styles.body}>Event creation dashboard, ticket management, artist attach, revenue overview, and Stripe payouts.</Text>
              <View style={styles.panelCta}><Button onPress={() => router.push('/submit')}>Become an Organizer</Button></View>
            </Card>
            <Card style={[styles.splitPanel, styles.softPanel]} padding={26}>
              <View style={[styles.ecoIconWrap, { backgroundColor: CultureTokens.coral + '15', marginBottom: 16 }]}>
                <Ionicons name="business" size={24} color={CultureTokens.coral} />
              </View>
              <Text style={styles.panelTitle}>For Cities & Councils</Text>
              <Text style={styles.body}>Community infrastructure, city-level cultural promotion, institutional profiles, and transparent revenue share.</Text>
              <View style={styles.panelCta}><Button variant="outline" onPress={() => router.push('/help')}>Partner With Us</Button></View>
            </Card>
          </View>
        </Section>

        <Section title="Secure & Transparent Payments" subtitle="Powered by Stripe Connect: Gross → Stripe Fee → Platform Commission → City Share → Organizer Net" spacing={sectionY} sidePad={sidePad}>
          <View style={styles.monetizationList}>
            {MONETIZATION.map((item) => (
              <View key={item} style={styles.bulletRow}>
                <Ionicons name="checkmark-circle" size={18} color={CultureTokens.success} />
                <Text style={styles.body}>{item}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Vision" subtitle="Not just events. Infrastructure." spacing={sectionY} sidePad={sidePad}>
          <Card padding={28}>
            <Text style={styles.vision}>CulturePass is building the global diaspora operating system — Multi-City, Multi-Community, Multi-Country, Franchise-Ready.</Text>
          </Card>
        </Section>

        <View style={[styles.finalCta, { marginHorizontal: sidePad, marginTop: sectionY }]}> 
          <Text style={styles.finalTitle}>Join the Cultural Movement.</Text>
          <View style={styles.finalButtonRow}>
            <Button variant="gold" size="lg" onPress={() => router.push('/(onboarding)/signup')}>Get Early Access</Button>
            <Button variant="outline" size="lg" onPress={() => router.push('/help')}>Become a Partner</Button>
          </View>
          <Text style={styles.finalNote}>Launching Australia V1.</Text>
        </View>

        <View style={[styles.stackFooter, { marginHorizontal: sidePad }]}> 
          <Text style={styles.footerTitle}>Tech Stack</Text>
          <View style={styles.footerWrap}>
            {STACK.map((item) => (
              <Text key={item} style={styles.footerItem}>• {item}</Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  subtitle,
  spacing,
  sidePad,
  surface,
  centered,
  children,
}: {
  title?: string;
  subtitle?: string;
  spacing: number;
  sidePad: number;
  surface?: boolean;
  centered?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={[surface ? styles.surfaceSection : undefined, { marginTop: spacing }]}> 
      <View style={[styles.container, { paddingHorizontal: sidePad }]}> 
        {!!title && <Text style={[styles.h2, centered && styles.center]}>{title}</Text>}
        {!!subtitle && <Text style={[styles.subhead, centered && styles.center]}>{subtitle}</Text>}
        <View style={title || subtitle ? styles.sectionBody : undefined}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0B0B14',
  },
  container: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },
  heroBg: {
    minHeight: Platform.select({ web: 720, default: 680 }),
  },
  heroOverlay: {
    flex: 1,
    minHeight: Platform.select({ web: 720, default: 680 }),
  },
  heroContent: {
    gap: 24,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'flex-start',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginBottom: 16,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 42,
    lineHeight: 50,
    fontFamily: 'Poppins_700Bold',
    maxWidth: 760,
    letterSpacing: -0.3,
  },
  heroTitleDesktop: {
    fontSize: 54,
    lineHeight: 64,
    letterSpacing: -0.6,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 18,
    lineHeight: 28,
    fontFamily: 'Poppins_400Regular',
    maxWidth: 760,
  },
  heroButtonRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
    marginTop: 8,
  },
  trustRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 10,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  trustText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
  },
  qrPromoCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    maxWidth: 600,
    marginTop: 20,
  },
  qrHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  qrTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
  },
  qrSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    marginTop: 4,
  },
  qrPreview: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 24,
    marginTop: 16,
  },
  qrActions: {
    marginTop: 16,
    gap: 12,
  },
  h2: {
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 40,
    fontFamily: 'Poppins_700Bold',
  },
  subhead: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Poppins_400Regular',
    marginTop: 10,
    maxWidth: 760,
  },
  sectionBody: {
    marginTop: 32,
  },
  surfaceSection: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingVertical: 48,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  split: {
    gap: 24,
  },
  splitDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 40,
  },
  splitCol: {
    flex: 1,
    gap: 16,
  },
  problemImage: {
    flex: 1,
    minHeight: 280,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: CultureTokens.indigo,
  },
  body: {
    flex: 1,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    lineHeight: 22,
  },
  bridge: {
    marginTop: 10,
    color: CultureTokens.saffron,
    fontSize: 20,
    lineHeight: 28,
    fontFamily: 'Poppins_700Bold',
  },
  grid4: {
    gap: 16,
  },
  grid4Desktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  ecoCard: {
    minWidth: 260,
    flexGrow: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    gap: 12,
  },
  ecoIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    marginTop: 4,
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 28,
    fontFamily: 'Poppins_700Bold',
  },
  cardLine: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 24,
  },
  stepsWrap: {
    gap: 16,
  },
  stepsWrapDesktop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: 24,
    gap: 14,
  },
  stepBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
  },
  stepTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 26,
    fontFamily: 'Poppins_700Bold',
  },
  stepText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'Poppins_400Regular',
  },
  previewRow: {
    gap: 20,
    paddingRight: 4,
  },
  previewImage: {
    width: 280,
    height: 580,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  inlineCta: {
    marginTop: 28,
    alignItems: 'flex-start',
  },
  splitPanel: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    gap: 12,
  },
  softPanel: {
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  panelTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 30,
    fontFamily: 'Poppins_700Bold',
  },
  panelCta: {
    marginTop: 12,
    alignItems: 'flex-start',
  },
  monetizationList: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 24,
    gap: 14,
  },
  vision: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 30,
    fontFamily: 'Poppins_500Medium',
  },
  finalCta: {
    borderRadius: 24,
    backgroundColor: CultureTokens.indigo,
    padding: 32,
    gap: 16,
    shadowColor: CultureTokens.indigo,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  finalTitle: {
    color: '#0B0B14',
    fontSize: 32,
    lineHeight: 40,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.5,
  },
  finalButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  finalNote: {
    color: 'rgba(11,11,20,0.7)',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Poppins_600SemiBold',
    marginTop: 4,
  },
  stackFooter: {
    marginTop: 64,
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  footerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 16,
  },
  footerWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  footerItem: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Poppins_500Medium',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  center: {
    textAlign: 'center',
    alignSelf: 'center',
  },
});
