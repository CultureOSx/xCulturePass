import { useColors } from '@/hooks/useColors';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

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
  { title: 'Discover', items: ['Events', 'Venues', 'Communities'], icon: 'search-outline' as const },
  { title: 'Book', items: ['Tickets', 'Wallet', 'Payments'], icon: 'ticket-outline' as const },
  { title: 'Follow', items: ['Artists', 'Sponsors', 'Businesses'], icon: 'people-outline' as const },
  { title: 'Unlock', items: ['Perks', 'Cashback', 'Memberships'], icon: 'gift-outline' as const },
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
  const colors = useColors();
  const styles = getStyles(colors);
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
          <LinearGradient colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.35)']} style={styles.heroOverlay}>
            <View style={[styles.container, { paddingHorizontal: sidePad }]}> 
              <View style={[styles.heroContent, { paddingTop: isDesktop ? 160 : 120, paddingBottom: isDesktop ? 160 : 96 }]}> 
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
                      <Ionicons name="checkmark-circle" size={14} color="#FCB131" />
                      <Text style={styles.trustText}>{signal}</Text>
                    </View>
                  ))}
                </View>

                <Card style={styles.qrPromoCard} padding={16}>
                  <View style={styles.qrHeader}>
                    <View>
                      <Text style={styles.qrTitle}>Promote Your QR on Top</Text>
                      <Text style={styles.qrSubtitle}>Drive instant app join and ticket conversion.</Text>
                    </View>
                    <Ionicons name="qr-code-outline" size={26} color="#2C2A72" />
                  </View>
                  <View style={styles.qrPreview}>
                    <Ionicons name="qr-code" size={110} color="#2C2A72" />
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
                <Ionicons name={block.icon} size={28} color="#124E78" />
                <Text style={styles.cardTitle}>{block.title}</Text>
                {block.items.map((item) => (
                  <Text key={item} style={styles.cardLine}>{item}</Text>
                ))}
              </Card>
            ))}
          </View>
        </Section>

        <Section title="How It Works" spacing={sectionY} sidePad={sidePad} centered>
          <View style={[styles.stepsWrap, isDesktop && styles.stepsWrapDesktop]}>
            {STEPS.map((step, index) => (
              <View key={step.title} style={styles.stepCard}>
                <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>{index + 1}</Text></View>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepText}>{step.detail}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Product Preview" subtitle="Core screens: Home, Calendar, Map Radius, Event Detail, Wallet, Artist Profile, Sponsor Profile" spacing={sectionY} sidePad={sidePad}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewRow}>
            {PREVIEW_IMAGES.map((src) => (
              <Image key={src} source={{ uri: src }} style={styles.previewImage} />
            ))}
          </ScrollView>
          <View style={styles.inlineCta}>
            <Button variant="outline" onPress={() => router.push('/(tabs)')}>See Full Preview</Button>
          </View>
        </Section>

        <Section spacing={sectionY} sidePad={sidePad}>
          <View style={[styles.split, isDesktop && styles.splitDesktop]}>
            <Card style={styles.splitPanel} padding={24}>
              <Text style={styles.panelTitle}>For Organizers</Text>
              <Text style={styles.body}>Event creation dashboard, ticket management, artist attach, revenue overview, and Stripe payouts.</Text>
              <View style={styles.panelCta}><Button onPress={() => router.push('/submit')}>Become an Organizer</Button></View>
            </Card>
            <Card style={[styles.splitPanel, styles.softPanel]} padding={24}>
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
                <Ionicons name="checkmark-circle" size={16} color="#2A9D8F" />
                <Text style={styles.body}>{item}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Vision" subtitle="Not just events. Infrastructure." spacing={sectionY} sidePad={sidePad}>
          <Card padding={24}>
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
  const colors = useColors();
  const styles = getStyles(colors);
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

// Move useColors inside a component to avoid top-level hook violation
const getStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
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
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 42,
    lineHeight: 50,
    fontWeight: '700',
    maxWidth: 760,
    letterSpacing: -0.3,
  },
  heroTitleDesktop: {
    fontSize: 64,
    lineHeight: 72,
    letterSpacing: -0.6,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 20,
    lineHeight: 30,
    maxWidth: 760,
  },
  heroButtonRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  trustRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  qrPromoCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    backgroundColor: colors.surface,
    maxWidth: 560,
  },
  qrHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  qrTitle: {
    color: '#111111',
    fontSize: 18,
    fontWeight: '700',
  },
  qrSubtitle: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 4,
  },
  qrPreview: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    backgroundColor: '#F7F7F7',
    paddingVertical: 14,
    marginTop: 14,
  },
  qrActions: {
    marginTop: 14,
    gap: 10,
  },
  h2: {
    color: '#111111',
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '600',
  },
  subhead: {
    color: '#4B5563',
    fontSize: 18,
    lineHeight: 28,
    marginTop: 14,
    maxWidth: 760,
  },
  sectionBody: {
    marginTop: 28,
  },
  surfaceSection: {
    backgroundColor: '#F7F7F7',
    paddingVertical: 48,
  },
  split: {
    gap: 24,
  },
  splitDesktop: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  splitCol: {
    flex: 1,
    gap: 12,
  },
  problemImage: {
    flex: 1,
    minHeight: 260,
    borderRadius: 24,
    backgroundColor: '#EEE',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: '#124E78',
    marginTop: 8,
  },
  body: {
    flex: 1,
    color: '#374151',
    fontSize: 16,
    lineHeight: 24,
  },
  bridge: {
    marginTop: 10,
    color: '#0B3C5D',
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '700',
  },
  grid4: {
    gap: 16,
  },
  grid4Desktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  ecoCard: {
    minWidth: 240,
    flexGrow: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    backgroundColor: colors.surface,
    gap: 10,
  },
  cardTitle: {
    marginTop: 8,
    color: '#111111',
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '600',
  },
  cardLine: {
    color: '#4B5563',
    fontSize: 16,
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
    borderColor: '#EAEAEA',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    gap: 10,
  },
  stepBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4A261',
  },
  stepBadgeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  stepTitle: {
    color: '#111111',
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
  },
  stepText: {
    color: '#4B5563',
    fontSize: 15,
    lineHeight: 22,
  },
  previewRow: {
    gap: 24,
    paddingRight: 4,
  },
  previewImage: {
    width: 260,
    height: 520,
    borderRadius: 24,
    backgroundColor: '#EAEAEA',
  },
  inlineCta: {
    marginTop: 24,
    alignItems: 'flex-start',
  },
  splitPanel: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    backgroundColor: colors.surface,
    gap: 12,
  },
  softPanel: {
    backgroundColor: '#F7F7F7',
  },
  panelTitle: {
    color: '#111111',
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600',
  },
  panelCta: {
    marginTop: 8,
    alignItems: 'flex-start',
  },
  monetizationList: {
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 20,
    backgroundColor: colors.surface,
    padding: 20,
    gap: 12,
  },
  vision: {
    color: '#111111',
    fontSize: 20,
    lineHeight: 32,
    fontWeight: '500',
  },
  finalCta: {
    borderRadius: 20,
    backgroundColor: '#0B3C5D',
    padding: 28,
    gap: 16,
  },
  finalTitle: {
    color: '#FFFFFF',
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '700',
  },
  finalButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  finalNote: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 20,
  },
  stackFooter: {
    marginTop: 48,
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: '#EAEAEA',
  },
  footerTitle: {
    color: '#111111',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  footerWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  footerItem: {
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 19,
  },
  center: {
    textAlign: 'center',
    alignSelf: 'center',
  },
});
