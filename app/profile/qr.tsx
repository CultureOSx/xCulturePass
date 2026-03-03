import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  Share,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { User, Membership } from '@shared/schema';
import QRCode from 'react-native-qrcode-svg';
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;
const QR_SIZE    = Math.min(CARD_WIDTH - 80, 200);

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const TIER_CONFIG: Record<string, { gradient: string[]; label: string; icon: string; accent: string }> = {
  free:    { gradient: ['#636366', '#48484A'], label: 'Standard', icon: 'shield-outline', accent: '#8E8E93' },
  plus:    { gradient: ['#3498DB', '#2471A3'], label: 'Plus',     icon: 'star',           accent: '#3498DB' },
  premium: { gradient: ['#F4A623', '#D4871E'], label: 'Premium',  icon: 'diamond',        accent: '#F4A623' },
  pro:     { gradient: ['#3498DB', '#2471A3'], label: 'Pro',      icon: 'star',           accent: '#3498DB' },
  vip:     { gradient: ['#F4A623', '#D4871E'], label: 'VIP',      icon: 'diamond',        accent: '#F4A623' },
};

const CORNER_SIZE  = 18;
const CORNER_WIDTH = 3;

export default function QRScreen() {
  const insets      = useSafeAreaInsets();
  const topInset    = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;
  const colors      = useColors();
  const [copied, setCopied] = useState(false);

  const { data: usersData } = useQuery<User[]>({ queryKey: ['/api/users'] });
  const user   = usersData?.[0];
  const userId = user?.id;

  const { data: membership } = useQuery<Membership>({
    queryKey: [`/api/membership/${userId}`],
    enabled: !!userId,
  });

  const tier     = membership?.tier ?? 'free';
  const tierConf = TIER_CONFIG[tier] ?? TIER_CONFIG.free;
  const cpid        = user?.culturePassId ?? 'CP-000000';
  const displayName = user?.displayName ?? 'CulturePass User';
  const username    = user?.username ?? 'user';

  const qrValue = useMemo(() => JSON.stringify({
    type: 'culturepass_id', cpid, name: displayName, username,
  }), [cpid, displayName, username]);

  const memberSince = useMemo(() => {
    if (!user?.createdAt) return 'Member';
    const d = new Date(user.createdAt);
    return `Since ${d.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}`;
  }, [user?.createdAt]);

  const profileUrl = `https://culturepass.app/u/${username}`;

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        title: `${displayName} - CulturePass Digital ID`,
        message: `My CulturePass Digital ID\n\nName: ${displayName}\nCPID: ${cpid}\nUsername: @${username}\nTier: ${capitalize(tier)}\n\n${profileUrl}\n\nScan my QR code on CulturePass to connect!`,
      });
    } catch {}
  };

  const handleCopy = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    Alert.alert('Copied', `CulturePass ID ${cpid} copied to clipboard.`);
  };

  return (
    <View style={[s.container, { paddingTop: topInset, backgroundColor: colors.background }]}>
      <View style={s.header}>
        <Pressable style={[s.backBtn, { backgroundColor: colors.surface }]} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>CulturePass Digital ID</Text>
        <Pressable style={[s.headerAction, { backgroundColor: colors.primaryGlow }]} onPress={() => router.push('/scanner')}>
          <Ionicons name="scan-outline" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.scrollContent, { paddingBottom: bottomInset + 40 }]}>
        {/* ID card */}
        <View style={[s.cardOuter, { shadowColor: '#000' }]}>
          <View style={[s.card, { backgroundColor: colors.surface }]}>
            {/* Dark header — intentionally always dark (card design) */}
            <LinearGradient
              colors={['#1A1A2E', '#16213E', '#0F3460']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.cardTop}
            >
              <View style={s.cardPattern}>
                <View style={s.patternCircle1} />
                <View style={s.patternCircle2} />
              </View>

              <View style={s.cardHeaderRow}>
                <View style={s.brandRow}>
                  <View style={s.logoMark}>
                    <Ionicons name="globe" size={14} color={colors.textInverse} />
                  </View>
                  <View>
                    <Text style={[s.brandName, { color: colors.textInverse }]}>CULTUREPASS</Text>
                    <Text style={[s.brandSub, { color: colors.textInverse + '80' }]}>DIGITAL ID</Text>
                  </View>
                </View>
                <View style={[s.tierBadge, { backgroundColor: tierConf.accent + '30' }]}>
                  <Ionicons name={tierConf.icon as never} size={11} color={tierConf.accent} />
                  <Text style={[s.tierText, { color: tierConf.accent }]}>{tierConf.label}</Text>
                </View>
              </View>

              <View style={s.userSection}>
                <View style={s.avatarRing}>
                  <View style={s.avatarInner}>
                    <Text style={[s.avatarInitials, { color: colors.textInverse }]}>
                      {(displayName || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={s.userDetails}>
                  <Text style={[s.userName, { color: colors.textInverse }]} numberOfLines={1}>{displayName}</Text>
                  <Text style={[s.userHandle, { color: colors.textInverse + '99' }]}>@{username}</Text>
                </View>
              </View>

              <View style={s.metaRow}>
                <View style={s.metaItem}>
                  <Ionicons name="finger-print" size={12} color={colors.textInverse + '99'} />
                  <Text style={[s.metaText, { color: colors.textInverse + '99' }]}>{cpid}</Text>
                </View>
                <View style={[s.metaDot, { backgroundColor: colors.textInverse + '4D' }]} />
                <View style={s.metaItem}>
                  <Ionicons name="calendar-outline" size={12} color={colors.textInverse + '99'} />
                  <Text style={[s.metaText, { color: colors.textInverse + '99' }]}>{memberSince}</Text>
                </View>
              </View>
            </LinearGradient>

            {/* QR section */}
            <View style={[s.qrSection, { backgroundColor: colors.surface }]}>
              <View style={s.qrContainer}>
                {[s.cornerTL, s.cornerTR, s.cornerBL, s.cornerBR].map((cs, i) => (
                  <View key={i} style={[cs, { borderColor: '#1A1A2E' }]} />
                ))}
                <View style={s.qrInner}>
                  <QRCode value={qrValue} size={QR_SIZE} color="#1A1A2E" backgroundColor="#FFFFFF" ecl="H" />
                </View>
              </View>
              <Text style={[s.scanLabel, { color: colors.textSecondary }]}>Scan to verify identity</Text>
            </View>

            {/* Card bottom */}
            <View style={s.cardBottom}>
              <View style={[s.bottomDivider, { backgroundColor: colors.borderLight }]} />
              <View style={s.bottomRow}>
                <View style={s.verifiedRow}>
                  <Ionicons name="shield-checkmark" size={15} color={colors.success} />
                  <Text style={[s.verifiedText, { color: colors.success }]}>Verified Member</Text>
                </View>
                <View style={s.chipRow}>
                  <View style={[s.nfcChip, { backgroundColor: colors.borderLight, borderColor: colors.border }]}>
                    <Ionicons name="wifi" size={10} color={colors.textInverse + '66'} style={{ transform: [{ rotate: '90deg' }] }} />
                  </View>
                  <View style={[s.hologram, { backgroundColor: colors.primaryGlow }]}>
                    <Ionicons name="finger-print" size={16} color={colors.primary + '35'} />
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* CPID row */}
        <View style={s.cpidSection}>
          <Text style={[s.cpidLabel, { color: colors.textSecondary }]}>CULTUREPASS ID</Text>
          <Pressable onPress={handleCopy} style={[s.cpidRow, { backgroundColor: colors.surface }]}>
            <Text style={[s.cpidValue, { color: colors.text }]}>{cpid}</Text>
            <View style={[s.cpidCopyBtn, { backgroundColor: copied ? colors.success : colors.primaryGlow }]}>
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={copied ? colors.textInverse : colors.primary} />
            </View>
          </Pressable>
        </View>

        {/* Action grid */}
        <View style={s.actionsGrid}>
          {[
            { icon: 'share-outline', title: 'Share', desc: 'Send your ID', bg: colors.primaryGlow,      color: colors.primary,    onPress: handleShare },
            { icon: 'copy-outline',  title: 'Copy',  desc: 'Copy CPID',   bg: colors.secondary + '15', color: colors.secondary,  onPress: handleCopy  },
            { icon: 'scan-outline',  title: 'Scan',  desc: 'Scan others', bg: colors.accent + '15',    color: colors.accent,     onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/scanner'); } },
          ].map(btn => (
            <Pressable key={btn.title} style={[s.actionCard, { backgroundColor: colors.surface }]} onPress={btn.onPress}>
              <View style={[s.actionIcon, { backgroundColor: btn.bg }]}>
                <Ionicons name={btn.icon as never} size={22} color={btn.color} />
              </View>
              <Text style={[s.actionTitle, { color: colors.text }]}>{btn.title}</Text>
              <Text style={[s.actionDesc, { color: colors.text }]}>{btn.desc}</Text>
            </Pressable>
          ))}
        </View>

        {/* Info card */}
        <View style={[s.infoCard, { backgroundColor: colors.surface }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} style={{ marginTop: 1 }} />
          <Text style={[s.infoText, { color: colors.text }]}> 
            Your CulturePass Digital ID is a unique identifier that can be scanned at events, venues, and partner locations for quick check-in and verification.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:      { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontFamily: 'Poppins_700Bold', fontSize: 17 },
  headerAction: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  scrollContent:{ paddingHorizontal: 24, paddingTop: 4 },

  cardOuter: { borderRadius: 24, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  card:      { borderRadius: 24, overflow: 'hidden' },
  cardTop:   { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 20, overflow: 'hidden', position: 'relative' },
  cardPattern:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  patternCircle1:{ position: 'absolute', top: -40, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.03)' },
  patternCircle2:{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.02)' },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  brandRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoMark:    { width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  brandName:   { fontFamily: 'Poppins_700Bold', fontSize: 13, letterSpacing: 2 },
  brandSub:    { fontFamily: 'Poppins_400Regular', fontSize: 9, letterSpacing: 3, marginTop: -1 },
  tierBadge:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  tierText:    { fontFamily: 'Poppins_600SemiBold', fontSize: 11 },
  userSection: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  avatarRing:  { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  avatarInner: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  avatarInitials:{ fontFamily: 'Poppins_700Bold', fontSize: 16 },
  userDetails: { flex: 1 },
  userName:    { fontFamily: 'Poppins_700Bold', fontSize: 20, letterSpacing: -0.3 },
  userHandle:  { fontFamily: 'Poppins_400Regular', fontSize: 13, marginTop: 1 },
  metaRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaItem:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaDot:     { width: 3, height: 3, borderRadius: 1.5 },
  metaText:    { fontFamily: 'Poppins_500Medium', fontSize: 12 },

  qrSection:   { alignItems: 'center', paddingVertical: 26, paddingHorizontal: 24 },
  qrContainer: { position: 'relative', padding: 14, marginBottom: 12 },
  cornerTL:    { position: 'absolute', top: 0, left: 0, width: CORNER_SIZE, height: CORNER_SIZE, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderTopLeftRadius: 5 },
  cornerTR:    { position: 'absolute', top: 0, right: 0, width: CORNER_SIZE, height: CORNER_SIZE, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderTopRightRadius: 5 },
  cornerBL:    { position: 'absolute', bottom: 0, left: 0, width: CORNER_SIZE, height: CORNER_SIZE, borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderBottomLeftRadius: 5 },
  cornerBR:    { position: 'absolute', bottom: 0, right: 0, width: CORNER_SIZE, height: CORNER_SIZE, borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderBottomRightRadius: 5 },
  qrInner:     { backgroundColor: '#FFFFFF', padding: 10, borderRadius: 6 },
  scanLabel:   { fontFamily: 'Poppins_500Medium', fontSize: 12, letterSpacing: 0.5 },

  cardBottom:  { paddingHorizontal: 22, paddingBottom: 18 },
  bottomDivider:{ height: 1, marginBottom: 12 },
  bottomRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  verifiedText:{ fontFamily: 'Poppins_500Medium', fontSize: 12 },
  chipRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nfcChip:     { width: 24, height: 18, borderRadius: 3, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  hologram:    { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  cpidSection: { alignItems: 'center', marginTop: 24, marginBottom: 4 },
  cpidLabel:   { fontFamily: 'Poppins_500Medium', fontSize: 10, letterSpacing: 2.5, marginBottom: 8 },
  cpidRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16 },
  cpidValue:   { fontFamily: 'Poppins_700Bold', fontSize: 22, letterSpacing: 3 },
  cpidCopyBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  actionsGrid: { flexDirection: 'row', gap: 12, marginTop: 24 },
  actionCard:  { flex: 1, alignItems: 'center', borderRadius: 18, paddingVertical: 18, paddingHorizontal: 8 },
  actionIcon:  { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  actionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, marginBottom: 2 },
  actionDesc:  { fontFamily: 'Poppins_400Regular', fontSize: 11 },

  infoCard:   { flexDirection: 'row', gap: 12, alignItems: 'flex-start', borderRadius: 16, padding: 16, marginTop: 24 },
  infoText:   { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 13, lineHeight: 20 },
});
