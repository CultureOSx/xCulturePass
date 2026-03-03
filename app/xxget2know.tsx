/**
 * get2know.tsx — CulturePass AU landing page.
 * Futuristic, production-ready marketing page with animated hero,
 * feature grid, city selector, pricing tiers and footer.
 */
import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  useColorScheme,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------
const FEATURES = [
  { icon: 'calendar' as const,   title: 'Discover Events',         color: '#0081C8', desc: 'Cultural performances, festivals, food fairs and workshops happening in your city.' },
  { icon: 'people' as const,     title: 'Join Communities',         color: '#EE334E', desc: 'Connect with your diaspora — reunions, cultural societies and social groups.' },
  { icon: 'gift' as const,       title: 'Exclusive Perks',          color: '#FCB131', desc: 'Member discounts and priority access at local cultural businesses and venues.' },
  { icon: 'map' as const,        title: 'Cultural Map',             color: '#00A651', desc: 'Browse venues, restaurants and cultural hotspots on an interactive city map.' },
  { icon: 'star' as const,       title: 'CulturePass Membership',   color: '#9B59B6', desc: 'Plus & Elite tiers with premium access, early booking and curated picks.' },
  { icon: 'storefront' as const, title: 'Business Directory',       color: '#FF6B35', desc: 'Support and discover authentic cultural businesses near you.' },
] as const;

const CITIES = [
  { name: 'Sydney',    emoji: '🌉', colors: ['#0081C8', '#004F8A'] as [string, string] },
  { name: 'Melbourne', emoji: '🎨', colors: ['#EE334E', '#9B1A2E'] as [string, string] },
  { name: 'Brisbane',  emoji: '☀️', colors: ['#FCB131', '#C47D00'] as [string, string] },
  { name: 'Perth',     emoji: '🌊', colors: ['#00A651', '#006B35'] as [string, string] },
  { name: 'Adelaide',  emoji: '🍷', colors: ['#9B59B6', '#6C3483'] as [string, string] },
  { name: 'Canberra',  emoji: '🏛️', colors: ['#E74C3C', '#922B21'] as [string, string] },
  { name: 'Darwin',    emoji: '🌴', colors: ['#2E86C1', '#1B4F72'] as [string, string] },
  { name: 'Hobart',    emoji: '🏔️', colors: ['#17A589', '#0E6655'] as [string, string] },
];

const TIERS = [
  {
    name: 'Free', price: '$0', period: 'forever', color: '#8E8E93',
    gradientColors: ['#636366', '#8E8E93'] as [string, string],
    features: ['Discover public events', 'Browse communities', 'Cultural map access', 'Basic business directory'],
    cta: 'Get Started Free', highlight: false,
  },
  {
    name: 'Plus', price: '$9.99', period: '/month', color: '#0081C8',
    gradientColors: ['#0081C8', '#EE334E'] as [string, string],
    features: ['Everything in Free', 'Member perks & discounts', 'Priority event booking', 'Community messaging', 'Early access to events'],
    cta: 'Start Plus', highlight: true,
  },
  {
    name: 'Elite', price: '$19.99', period: '/month', color: '#FCB131',
    gradientColors: ['#FCB131', '#F4A100'] as [string, string],
    features: ['Everything in Plus', 'Curated monthly picks', 'VIP venue access', 'Exclusive events', 'Dedicated support'],
    cta: 'Go Elite', highlight: false,
  },
] as const;

const STATS = [
  { value: '8',    label: 'Cities' },
  { value: '500+', label: 'Events/mo' },
  { value: '50+',  label: 'Communities' },
  { value: '1k+',  label: 'Members' },
];

// ---------------------------------------------------------------------------
// Reusable sub-components
// ---------------------------------------------------------------------------
type ViewRef = React.RefObject<View | null>;
type ScrollRef = React.RefObject<ScrollView | null>;

function NavBar({ isDesktop, onScrollTo, scrollRef, featuresRef, citiesRef, pricingRef }: {
  isDesktop: boolean;
  onScrollTo: (ref: ViewRef) => void;
  scrollRef: ScrollRef;
  featuresRef: ViewRef;
  citiesRef: ViewRef;
  pricingRef: ViewRef;
}) {
  return (
    <View style={[nav.bar, isDesktop && nav.barWide]}>
      <Pressable style={nav.logo} onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}>
        <LinearGradient colors={['#0081C8', '#EE334E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={nav.logoGrad}>
          <Ionicons name="earth" size={17} color="#fff" />
        </LinearGradient>
        <Text style={nav.logoText}>CulturePass</Text>
        <View style={nav.auBadge}><Text style={nav.auBadgeText}>AU</Text></View>
      </Pressable>

      {isDesktop && (
        <View style={nav.links}>
          {([['Features', featuresRef], ['Cities', citiesRef], ['Pricing', pricingRef]] as [string, ViewRef][]).map(([label, ref]) => (
            <Pressable key={label} onPress={() => onScrollTo(ref)}>
              <Text style={nav.link}>{label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={nav.actions}>
        <Pressable style={nav.ghostBtn} onPress={() => router.push('/(onboarding)/login')}>
          <Text style={nav.ghostBtnText}>Sign In</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/(onboarding)/signup')}>
          <LinearGradient colors={['#0081C8', '#EE334E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={nav.primaryBtn}>
            <Text style={nav.primaryBtnText}>Get Started</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

function FeatureCard({ icon, title, desc, color, isDark }: {
  icon: keyof typeof Ionicons.glyphMap; title: string; desc: string; color: string; isDark: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={[feat.card,
      { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', transform: [{ scale }] },
    ]}>
      <Pressable
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
        style={{ gap: 14 }}
      >
        <View style={[feat.iconBox, { backgroundColor: color + '18' }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <Text style={[feat.title, { color: isDark ? '#E8F4FF' : '#001628' }]}>{title}</Text>
        <Text style={[feat.desc, { color: isDark ? 'rgba(232,244,255,0.6)' : 'rgba(0,22,40,0.6)' }]}>{desc}</Text>
      </Pressable>
    </Animated.View>
  );
}

function CityPill({ city }: { city: typeof CITIES[number] }) {
  return (
    <Pressable onPress={() => router.push('/(onboarding)/signup')}>
      <LinearGradient colors={city.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={cityS.pill}>
        <Text style={cityS.emoji}>{city.emoji}</Text>
        <Text style={cityS.name}>{city.name}</Text>
      </LinearGradient>
    </Pressable>
  );
}

function TierCard({ tier, isDark }: { tier: typeof TIERS[number]; isDark: boolean }) {
  return (
    <View style={[tierS.card,
      { backgroundColor: isDark ? (tier.highlight ? 'rgba(0,129,200,0.12)' : 'rgba(255,255,255,0.04)') : (tier.highlight ? 'rgba(0,129,200,0.06)' : '#FFFFFF') },
      { borderColor: tier.highlight ? tier.color : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)') },
      tier.highlight && tierS.cardHighlight,
    ]}>
      {tier.highlight && (
        <LinearGradient colors={['#0081C8', '#EE334E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={tierS.popularBadge}>
          <Text style={tierS.popularText}>Most Popular</Text>
        </LinearGradient>
      )}
      <Text style={[tierS.name, { color: tier.color }]}>{tier.name}</Text>
      <View style={tierS.priceRow}>
        <Text style={[tierS.price, { color: isDark ? '#E8F4FF' : '#001628' }]}>{tier.price}</Text>
        <Text style={[tierS.period, { color: isDark ? 'rgba(232,244,255,0.5)' : 'rgba(0,22,40,0.5)' }]}>{tier.period}</Text>
      </View>
      {tier.features.map((f) => (
        <View key={f} style={tierS.featureRow}>
          <View style={[tierS.check, { backgroundColor: tier.color + '18' }]}>
            <Ionicons name="checkmark" size={12} color={tier.color} />
          </View>
          <Text style={[tierS.featureText, { color: isDark ? 'rgba(232,244,255,0.85)' : 'rgba(0,22,40,0.85)' }]}>{f}</Text>
        </View>
      ))}
      <Pressable onPress={() => router.push('/(onboarding)/signup')} style={{ marginTop: 24 }}>
        <LinearGradient colors={tier.gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={tierS.cta}>
          <Text style={tierS.ctaText}>{tier.cta}</Text>
          <Ionicons name="arrow-forward" size={14} color="#fff" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function Get2KnowPage() {
  const { width } = useWindowDimensions();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const insets = useSafeAreaInsets();

  const isDesktop = width >= 1024;
  const isTablet  = width >= 768 && !isDesktop;
  const hPad = isDesktop ? 80 : isTablet ? 40 : 20;
  const maxW = isDesktop ? 1200 : isTablet ? 860 : undefined;

  const scrollRef   = useRef<ScrollView>(null);
  const featuresRef = useRef<View>(null);
  const citiesRef   = useRef<View>(null);
  const pricingRef  = useRef<View>(null);

  // Hero entrance animation
  const heroOpacity   = useRef(new Animated.Value(0)).current;
  const heroTranslate = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroOpacity,   { toValue: 1, duration: 700, delay: 100, useNativeDriver: true }),
      Animated.timing(heroTranslate, { toValue: 0, duration: 600, delay: 100, useNativeDriver: true }),
    ]).start();
  }, [heroOpacity, heroTranslate]);

  const scrollTo = useCallback((ref: ViewRef) => {
    ref.current?.measureInWindow((_x: number, y: number) => {
      scrollRef.current?.scrollTo({ y: y - 70, animated: true });
    });
  }, []);

  const bg = isDark ? '#01050D' : '#F8FBFF';

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <StatusBar style="light" />

      <NavBar
        isDesktop={isDesktop}
        onScrollTo={scrollTo}
        scrollRef={scrollRef}
        featuresRef={featuresRef}
        citiesRef={citiesRef}
        pricingRef={pricingRef}
      />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}
      >
        {/* ── Hero ─────────────────────────────────── */}
        <LinearGradient
          colors={['#001A3D', '#005FA0', '#C02040', '#E8960A']}
          locations={[0, 0.38, 0.7, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={hero.gradient}
        >
          {/* Glow orbs */}
          <View style={[hero.orb, hero.orb1]} />
          <View style={[hero.orb, hero.orb2]} />
          <View style={[hero.orb, hero.orb3]} />

          <Animated.View
            style={[
              hero.content,
              { paddingHorizontal: hPad, maxWidth: maxW, alignSelf: 'center' as const, width: '100%' as const },
              { opacity: heroOpacity, transform: [{ translateY: heroTranslate }] },
            ]}
          >
            <View style={hero.badge}>
              <Ionicons name="flag" size={12} color="#FCB131" />
              <Text style={hero.badgeText}>All States &amp; Territories of Australia</Text>
            </View>

            <Text style={[hero.headline, isDesktop && hero.headlineDesktop]}>
              Your Cultural Passport{'\n'}
              <Text style={hero.accent}>to Australia</Text>
            </Text>

            <Text style={[hero.sub, isDesktop && hero.subDesktop]}>
              Discover events, join communities, and celebrate culture across
              Sydney, Melbourne, Brisbane and every corner of Australia.
            </Text>

            <View style={hero.ctaRow}>
              <Pressable onPress={() => router.push('/(onboarding)/signup')} style={hero.primaryCta}>
                <LinearGradient colors={['#FCB131', '#F4A100']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={hero.primaryCtaGrad}>
                  <Text style={hero.primaryCtaText}>Get Started — Free</Text>
                  <Ionicons name="arrow-forward" size={15} color="#001F4D" />
                </LinearGradient>
              </Pressable>
              <Pressable onPress={() => router.push('/(onboarding)/login')} style={hero.ghostCta}>
                <Text style={hero.ghostCtaText}>Sign In</Text>
              </Pressable>
            </View>

            {isDesktop && (
              <View style={hero.cards}>
                {[
                  { title: 'Lunar New Year Gala', city: 'Sydney',    date: 'Sat 15 Feb', colors: ['#0081C8', '#004F8A'] as [string, string] },
                  { title: 'Diwali Night Market', city: 'Melbourne', date: 'Fri 21 Feb', colors: ['#EE334E', '#9B1A2E'] as [string, string] },
                  { title: 'Afrobeats Festival',  city: 'Brisbane',  date: 'Sun 23 Feb', colors: ['#FCB131', '#C47D00'] as [string, string] },
                ].map((card) => (
                  <LinearGradient key={card.title} colors={card.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={hero.card}>
                    <View style={hero.cardChip}><Text style={hero.cardDate}>{card.date}</Text></View>
                    <Text style={hero.cardTitle}>{card.title}</Text>
                    <View style={hero.cardMeta}>
                      <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.7)" />
                      <Text style={hero.cardCity}>{card.city}</Text>
                    </View>
                  </LinearGradient>
                ))}
              </View>
            )}
          </Animated.View>
        </LinearGradient>

        {/* ── Stats ─────────────────────────────────── */}
        <View style={[statsS.bar, {
          backgroundColor: isDark ? '#060B14' : '#FFFFFF',
          borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        }]}>
          {STATS.map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <View style={[statsS.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]} />}
              <View style={statsS.stat}>
                <Text style={statsS.value}>{s.value}</Text>
                <Text style={[statsS.label, { color: isDark ? 'rgba(232,244,255,0.55)' : 'rgba(0,22,40,0.55)' }]}>{s.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* ── Features ──────────────────────────────── */}
        <View ref={featuresRef} style={[sec.section, { paddingHorizontal: hPad }]}>
          <View style={maxW ? { maxWidth: maxW, alignSelf: 'center' as const, width: '100%' as const } : undefined}>
            <Text style={sec.eyebrow}>Features</Text>
            <Text style={[sec.heading, { color: isDark ? '#E8F4FF' : '#001628' }]}>
              Everything you need{'\n'}to celebrate your culture
            </Text>
            <View style={[feat.grid, isDesktop && feat.gridDesktop, isTablet && feat.gridTablet]}>
              {FEATURES.map((f) => <FeatureCard key={f.title} {...f} isDark={isDark} />)}
            </View>
          </View>
        </View>

        {/* ── Cities ────────────────────────────────── */}
        <View ref={citiesRef} style={[sec.section, { backgroundColor: isDark ? '#060B14' : '#EEF4FF', paddingHorizontal: hPad }]}>
          <View style={maxW ? { maxWidth: maxW, alignSelf: 'center' as const, width: '100%' as const } : undefined}>
            <Text style={sec.eyebrow}>Available In</Text>
            <Text style={[sec.heading, { color: isDark ? '#E8F4FF' : '#001628' }]}>
              All 8 States &amp;{'\n'}Territories of Australia
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={cityS.scroll}>
              {CITIES.map((c) => <CityPill key={c.name} city={c} />)}
            </ScrollView>
          </View>
        </View>

        {/* ── Pricing ───────────────────────────────── */}
        <View ref={pricingRef} style={[sec.section, { paddingHorizontal: hPad }]}>
          <View style={maxW ? { maxWidth: maxW, alignSelf: 'center' as const, width: '100%' as const } : undefined}>
            <Text style={sec.eyebrow}>Membership</Text>
            <Text style={[sec.heading, { color: isDark ? '#E8F4FF' : '#001628' }]}>
              Simple, transparent{'\n'}pricing
            </Text>
            <View style={[tierS.grid, isDesktop && tierS.gridDesktop]}>
              {TIERS.map((t) => <TierCard key={t.name} tier={t} isDark={isDark} />)}
            </View>
          </View>
        </View>

        {/* ── CTA Banner ────────────────────────────── */}
        <View style={{ paddingHorizontal: hPad, marginBottom: 24 }}>
          <LinearGradient
            colors={['#001A3D', '#005FA0', '#C02040']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={ctaB.banner}
          >
            <View style={ctaB.orb} />
            <Text style={ctaB.title}>Start your cultural journey today</Text>
            <Text style={ctaB.sub}>Free forever. No credit card required.</Text>
            <Pressable onPress={() => router.push('/(onboarding)/signup')} style={ctaB.btnWrap}>
              <LinearGradient colors={['#FCB131', '#F4A100']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={ctaB.btnGrad}>
                <Text style={ctaB.btnText}>Create Free Account</Text>
                <Ionicons name="arrow-forward" size={15} color="#001F4D" />
              </LinearGradient>
            </Pressable>
          </LinearGradient>
        </View>

        {/* ── Footer ────────────────────────────────── */}
        <View style={[foot.footer, {
          borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          paddingHorizontal: hPad,
        }]}>
          <View style={maxW ? { maxWidth: maxW, alignSelf: 'center' as const, width: '100%' as const } : undefined}>
            <View style={foot.top}>
              <View style={foot.brand}>
                <View style={foot.logoRow}>
                  <LinearGradient colors={['#0081C8', '#EE334E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={foot.logoIcon}>
                    <Ionicons name="earth" size={15} color="#fff" />
                  </LinearGradient>
                  <Text style={[foot.logoText, { color: isDark ? '#E8F4FF' : '#001628' }]}>CulturePass</Text>
                </View>
                <Text style={[foot.tagline, { color: isDark ? 'rgba(232,244,255,0.45)' : 'rgba(0,22,40,0.45)' }]}>
                  Celebrating culture,{'\n'}connecting communities.
                </Text>
              </View>
              {isDesktop && (
                <View style={foot.cols}>
                  {[
                    { heading: 'Product', items: ['Features', 'Cities', 'Pricing', 'Membership'] },
                    { heading: 'Company', items: ['About', 'Blog', 'Careers', 'Press'] },
                    { heading: 'Support', items: ['Help Centre', 'Contact', 'Privacy', 'Terms'] },
                  ].map((col) => (
                    <View key={col.heading} style={foot.col}>
                      <Text style={[foot.colHead, { color: isDark ? '#E8F4FF' : '#001628' }]}>{col.heading}</Text>
                      {col.items.map((item) => (
                        <Text key={item} style={[foot.colItem, { color: isDark ? 'rgba(232,244,255,0.45)' : 'rgba(0,22,40,0.45)' }]}>{item}</Text>
                      ))}
                    </View>
                  ))}
                </View>
              )}
            </View>
            <Text style={[foot.copy, { color: isDark ? 'rgba(232,244,255,0.3)' : 'rgba(0,22,40,0.3)' }]}>
              © 2026 CulturePass AU · ABN 00 000 000 000
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const nav = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 13,
    backgroundColor: 'rgba(0,26,61,0.97)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    ...(Platform.OS === 'web' ? { position: 'sticky', top: 0, zIndex: 100 } as object : {}),
  },
  barWide: { paddingHorizontal: 80 },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoGrad: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 17, fontFamily: 'Poppins_700Bold', color: '#fff' },
  auBadge: { backgroundColor: 'rgba(252,177,49,0.2)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(252,177,49,0.35)' },
  auBadgeText: { fontSize: 10, fontFamily: 'Poppins_700Bold', color: '#FCB131' },
  links: { flexDirection: 'row', gap: 28 },
  link: { fontSize: 14, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.75)' },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  ghostBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  ghostBtnText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: '#fff' },
  primaryBtn: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 8 },
  primaryBtnText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: '#fff' },
});

const hero = StyleSheet.create({
  gradient: { paddingTop: 72, paddingBottom: 64, overflow: 'hidden' },
  orb: { position: 'absolute', borderRadius: 9999 },
  orb1: { width: 420, height: 420, top: -120, left: -80, backgroundColor: 'rgba(0,129,200,0.2)' },
  orb2: { width: 320, height: 320, top: 40, right: -60, backgroundColor: 'rgba(238,51,78,0.18)' },
  orb3: { width: 220, height: 220, bottom: -50, backgroundColor: 'rgba(252,177,49,0.15)' },
  content: { gap: 0 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(252,177,49,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(252,177,49,0.3)', marginBottom: 22 },
  badgeText: { fontSize: 12, fontFamily: 'Poppins_500Medium', color: '#FCB131' },
  headline: { fontSize: 38, fontFamily: 'Poppins_700Bold', color: '#fff', lineHeight: 48, marginBottom: 18 },
  headlineDesktop: { fontSize: 60, lineHeight: 72 },
  accent: { color: '#FCB131' },
  sub: { fontSize: 16, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.82)', lineHeight: 26, maxWidth: 520, marginBottom: 36 },
  subDesktop: { fontSize: 19, lineHeight: 30 },
  ctaRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 48, flexWrap: 'wrap' },
  primaryCta: { borderRadius: 12, overflow: 'hidden' },
  primaryCtaGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14 },
  primaryCtaText: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: '#001F4D' },
  ghostCta: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 13, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)' },
  ghostCtaText: { fontSize: 16, fontFamily: 'Poppins_600SemiBold', color: '#fff' },
  cards: { flexDirection: 'row', gap: 16, marginTop: 8 },
  card: { flex: 1, borderRadius: 16, padding: 20, minHeight: 140, gap: 8 },
  cardChip: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  cardDate: { fontSize: 10, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.9)' },
  cardTitle: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: '#fff', lineHeight: 22 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardCity: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.75)' },
});

const statsS = StyleSheet.create({
  bar: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 28, borderTopWidth: 1, borderBottomWidth: 1 },
  stat: { alignItems: 'center', gap: 3 },
  value: { fontSize: 26, fontFamily: 'Poppins_700Bold', color: '#0081C8' },
  label: { fontSize: 12, fontFamily: 'Poppins_400Regular' },
  divider: { width: 1, height: 32 },
});

const sec = StyleSheet.create({
  section: { paddingVertical: 72 },
  eyebrow: { fontSize: 12, fontFamily: 'Poppins_700Bold', color: '#0081C8', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 },
  heading: { fontSize: 32, fontFamily: 'Poppins_700Bold', lineHeight: 42, marginBottom: 40 },
});

const feat = StyleSheet.create({
  grid: { gap: 16 },
  gridTablet: { flexDirection: 'row', flexWrap: 'wrap' },
  gridDesktop: { flexDirection: 'row', flexWrap: 'wrap' },
  card: { borderRadius: 20, padding: 24, borderWidth: 1, flex: 1, minWidth: 260 },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontFamily: 'Poppins_600SemiBold' },
  desc: { fontSize: 14, fontFamily: 'Poppins_400Regular', lineHeight: 22 },
});

const cityS = StyleSheet.create({
  scroll: { gap: 10, paddingVertical: 4 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 50, paddingHorizontal: 18, paddingVertical: 10 },
  emoji: { fontSize: 18 },
  name: { fontSize: 14, fontFamily: 'Poppins_700Bold', color: '#fff' },
});

const tierS = StyleSheet.create({
  grid: { gap: 16 },
  gridDesktop: { flexDirection: 'row', alignItems: 'flex-start', gap: 20 },
  card: { borderRadius: 24, padding: 28, borderWidth: 1.5, flex: 1, minWidth: 260, overflow: 'hidden' },
  cardHighlight: { borderWidth: 2 },
  popularBadge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 16 },
  popularText: { fontSize: 11, fontFamily: 'Poppins_700Bold', color: '#fff' },
  name: { fontSize: 22, fontFamily: 'Poppins_700Bold', marginBottom: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 24 },
  price: { fontSize: 38, fontFamily: 'Poppins_700Bold' },
  period: { fontSize: 14, fontFamily: 'Poppins_400Regular' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  check: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  featureText: { fontSize: 14, fontFamily: 'Poppins_400Regular', flex: 1 },
  cta: { borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ctaText: { fontSize: 15, fontFamily: 'Poppins_700Bold', color: '#fff' },
});

const ctaB = StyleSheet.create({
  banner: { borderRadius: 24, padding: 48, alignItems: 'center', gap: 14, overflow: 'hidden', position: 'relative' },
  orb: { position: 'absolute', width: 360, height: 360, borderRadius: 180, backgroundColor: 'rgba(255,255,255,0.04)', top: -100, right: -80 },
  title: { fontSize: 28, fontFamily: 'Poppins_700Bold', color: '#fff', textAlign: 'center', zIndex: 1 },
  sub: { fontSize: 15, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.8)', textAlign: 'center', zIndex: 1 },
  btnWrap: { borderRadius: 14, overflow: 'hidden', zIndex: 1 },
  btnGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 28, paddingVertical: 15 },
  btnText: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: '#001F4D' },
});

const foot = StyleSheet.create({
  footer: { paddingTop: 56, paddingBottom: 32, borderTopWidth: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40, flexWrap: 'wrap', gap: 32 },
  brand: { gap: 14, flex: 1 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 17, fontFamily: 'Poppins_700Bold' },
  tagline: { fontSize: 14, fontFamily: 'Poppins_400Regular', lineHeight: 22 },
  cols: { flexDirection: 'row', gap: 56 },
  col: { gap: 12 },
  colHead: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', marginBottom: 4 },
  colItem: { fontSize: 14, fontFamily: 'Poppins_400Regular' },
  copy: { fontSize: 12, fontFamily: 'Poppins_400Regular', textAlign: 'center', marginTop: 20 },
});
