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
import { CultureTokens } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;
const QR_SIZE    = Math.min(CARD_WIDTH - 80, 200);

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const TIER_CONFIG: Record<string, { label: string; icon: string; accent: string }> = {
  free:    { label: 'Standard', icon: 'shield-outline', accent: 'rgba(255,255,255,0.6)' },
  plus:    { label: 'Plus',     icon: 'star',           accent: CultureTokens.indigo },
  premium: { label: 'Premium',  icon: 'diamond',        accent: CultureTokens.gold },
  pro:     { label: 'Pro',      icon: 'star',           accent: CultureTokens.indigo },
  vip:     { label: 'VIP',      icon: 'diamond',        accent: CultureTokens.saffron },
};

const CORNER_SIZE  = 18;
const CORNER_WIDTH = 3;

export default function QRScreen() {
  const insets      = useSafeAreaInsets();
  const topInset    = Platform.OS === 'web' ? 0 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;
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
    <View style={[styles.container, { paddingTop: topInset }]}> 
      <View style={styles.header}> 
        <Pressable style={styles.backBtn} onPress={() => router.back()}> 
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" /> 
        </Pressable>
        <Text style={styles.headerTitle}>CulturePass Digital ID</Text> 
        <Pressable style={styles.headerAction} onPress={() => router.push('/scanner')}> 
          <Ionicons name="scan-outline" size={20} color={CultureTokens.indigo} /> 
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 40 }]}> 
        {/* ID card */}
        <View style={styles.cardOuter}> 
          <View style={styles.card}> 
            {/* Dark header — intentionally always dark (card design) */}
            <LinearGradient 
              colors={['#1A1A2E', '#16213E', '#0B0B14']} 
              start={{ x: 0, y: 0 }} 
              end={{ x: 1, y: 1 }} 
              style={styles.cardTop} 
            > 
              <View style={styles.cardPattern}> 
                <View style={styles.patternCircle1} /> 
                <View style={styles.patternCircle2} /> 
              </View> 

              <View style={styles.cardHeaderRow}> 
                <View style={styles.brandRow}> 
                  <View style={styles.logoMark}> 
                    <Ionicons name="globe" size={14} color="#FFFFFF" />
                  </View>
                  <View>
                    <Text style={styles.brandName}>CULTUREPASS</Text> 
                    <Text style={styles.brandSub}>DIGITAL ID</Text> 
                  </View>
                </View>
                <View style={[styles.tierBadge, { backgroundColor: tierConf.accent + '20' }]}> 
                  <Ionicons name={tierConf.icon as never} size={12} color={tierConf.accent} />
                  <Text style={[styles.tierText, { color: tierConf.accent }]}>{tierConf.label}</Text> 
                </View>
              </View>


              <View style={styles.userSection}> 
                <View style={styles.avatarRing}> 
                  <View style={styles.avatarInner}> 
                    <Text style={styles.avatarInitials}> 
                      {(displayName || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={styles.userDetails}> 
                  <Text style={styles.userName} numberOfLines={1}>{displayName}</Text> 
                  <Text style={styles.userHandle}>@{username}</Text> 
                </View>
              </View>

              <View style={styles.metaRow}> 
                <View style={styles.metaItem}> 
                  <Text style={styles.metaText}>{cpid}</Text> 
                </View> 
                <View style={styles.metaDot} /> 
                <View style={styles.metaItem}> 
                  <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.6)" /> 
                  <Text style={styles.metaText}>{memberSince}</Text> 
                </View> 
              </View>
            </LinearGradient>

            {/* QR section */} 
            <View style={styles.qrSection}> 
              <View style={styles.qrContainer}> 
                {[styles.cornerTL, styles.cornerTR, styles.cornerBL, styles.cornerBR].map((cs, i) => ( 
                  <View key={i} style={[cs, { borderColor: '#1A1A2E' }]} /> 
                ))} 
                <View style={styles.qrInner}> 
                  <QRCode value={qrValue} size={QR_SIZE} color="#1A1A2E" backgroundColor="#FFFFFF" ecl="H" /> 
                </View> 
              </View> 
              <Text style={styles.scanLabel}>Scan to verify identity</Text> 
            </View> 

            {/* Card bottom */} 
            <View style={styles.cardBottom}> 
              <View style={styles.bottomDivider} /> 
              <View style={styles.bottomRow}> 
                <View style={styles.verifiedRow}> 
                  <Ionicons name="shield-checkmark" size={16} color={CultureTokens.success} /> 
                  <Text style={[styles.verifiedText, { color: CultureTokens.success }]}>Verified Member</Text> 
                </View> 
                <View style={styles.chipRow}> 
                  <View style={styles.nfcChip}> 
                    <Ionicons name="wifi" size={12} color="rgba(255,255,255,0.4)" style={{ transform: [{ rotate: '90deg' }] }} /> 
                  </View> 
                  <View style={styles.hologram}> 
                    <Ionicons name="finger-print" size={18} color={CultureTokens.indigo} /> 
                  </View> 
                </View> 
              </View> 
            </View> 
          </View>
        </View>

        {/* CPID row */}
        <View style={styles.cpidSection}>
          <Text style={styles.cpidLabel}>CULTUREPASS ID</Text>
          <Pressable onPress={handleCopy} style={styles.cpidRow}>
            <Text style={styles.cpidValue}>{cpid}</Text>
            <View style={[styles.cpidCopyBtn, { backgroundColor: copied ? CultureTokens.success : CultureTokens.indigo + '20' }]}>
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={copied ? '#0B0B14' : CultureTokens.indigo} />
            </View>
          </Pressable>
        </View>

        {/* Action grid */}
        <View style={styles.actionsGrid}>
          {[
            { icon: 'share-outline', title: 'Share', desc: 'Send your ID', bg: CultureTokens.indigo + '15',      color: CultureTokens.indigo,    onPress: handleShare },
            { icon: 'copy-outline',  title: 'Copy',  desc: 'Copy CPID',   bg: CultureTokens.saffron + '15', color: CultureTokens.saffron,  onPress: handleCopy  },
            { icon: 'scan-outline',  title: 'Scan',  desc: 'Scan others', bg: CultureTokens.coral + '15',    color: CultureTokens.coral,     onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/scanner'); } },
          ].map(btn => (
            <Pressable key={btn.title} style={styles.actionCard} onPress={btn.onPress}>
              <View style={[styles.actionIcon, { backgroundColor: btn.bg }]}>
                <Ionicons name={btn.icon as never} size={24} color={btn.color} />
              </View>
              <Text style={styles.actionTitle}>{btn.title}</Text>
              <Text style={styles.actionDesc}>{btn.desc}</Text>
            </Pressable>
          ))}
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={CultureTokens.indigo} style={{ marginTop: 2 }} />
          <Text style={styles.infoText}> 
            Your CulturePass Digital ID is a unique identifier that can be scanned at events, venues, and partner locations for quick check-in and verification.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0B0B14' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn:      { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  headerTitle:  { fontFamily: 'Poppins_700Bold', fontSize: 18, color: '#FFFFFF' },
  headerAction: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: CultureTokens.indigo + '20', borderWidth: 1, borderColor: CultureTokens.indigo + '40' },
  scrollContent:{ paddingHorizontal: 20, paddingTop: 16 },

  cardOuter: { borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  card:      { borderRadius: 24, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  cardTop:   { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 20, overflow: 'hidden', position: 'relative' },
  cardPattern:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  patternCircle1:{ position: 'absolute', top: -40, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.03)' },
  patternCircle2:{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.02)' },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  brandRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoMark:    { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  brandName:   { fontFamily: 'Poppins_700Bold', fontSize: 14, letterSpacing: 2, color: '#FFFFFF' },
  brandSub:    { fontFamily: 'Poppins_400Regular', fontSize: 10, letterSpacing: 3, marginTop: -1, color: 'rgba(255,255,255,0.5)' },
  tierBadge:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  tierText:    { fontFamily: 'Poppins_600SemiBold', fontSize: 12 },
  userSection: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  avatarRing:  { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  avatarInner: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  avatarInitials:{ fontFamily: 'Poppins_700Bold', fontSize: 18, color: '#FFFFFF' },
  userDetails: { flex: 1 },
  userName:    { fontFamily: 'Poppins_700Bold', fontSize: 22, letterSpacing: -0.3, color: '#FFFFFF' },
  userHandle:  { fontFamily: 'Poppins_400Regular', fontSize: 14, marginTop: 2, color: 'rgba(255,255,255,0.6)' },
  metaRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metaItem:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaDot:     { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)' },
  metaText:    { fontFamily: 'Poppins_500Medium', fontSize: 13, color: 'rgba(255,255,255,0.6)' },

  qrSection:   { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 24, backgroundColor: 'transparent' },
  qrContainer: { position: 'relative', padding: 16, marginBottom: 16, backgroundColor: '#FFFFFF', borderRadius: 8 },
  cornerTL:    { position: 'absolute', top: 0, left: 0, width: CORNER_SIZE, height: CORNER_SIZE, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderTopLeftRadius: 5 },
  cornerTR:    { position: 'absolute', top: 0, right: 0, width: CORNER_SIZE, height: CORNER_SIZE, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderTopRightRadius: 5 },
  cornerBL:    { position: 'absolute', bottom: 0, left: 0, width: CORNER_SIZE, height: CORNER_SIZE, borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderBottomLeftRadius: 5 },
  cornerBR:    { position: 'absolute', bottom: 0, right: 0, width: CORNER_SIZE, height: CORNER_SIZE, borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderBottomRightRadius: 5 },
  qrInner:     { padding: 12, borderRadius: 6, backgroundColor: '#FFFFFF' },
  scanLabel:   { fontFamily: 'Poppins_500Medium', fontSize: 13, letterSpacing: 0.5, color: 'rgba(255,255,255,0.5)' },

  cardBottom:  { paddingHorizontal: 24, paddingBottom: 20 },
  bottomDivider:{ height: 1, marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.1)' },
  bottomRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  verifiedText:{ fontFamily: 'Poppins_500Medium', fontSize: 13 },
  chipRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nfcChip:     { width: 28, height: 20, borderRadius: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' },
  hologram:    { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: CultureTokens.indigo + '15' },

  cpidSection: { alignItems: 'center', marginTop: 32, marginBottom: 8 },
  cpidLabel:   { fontFamily: 'Poppins_500Medium', fontSize: 11, letterSpacing: 2.5, marginBottom: 10, color: 'rgba(255,255,255,0.5)' },
  cpidRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  cpidValue:   { fontFamily: 'Poppins_700Bold', fontSize: 24, letterSpacing: 3, color: '#FFFFFF' },
  cpidCopyBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  actionsGrid: { flexDirection: 'row', gap: 16, marginTop: 24 },
  actionCard:  { flex: 1, alignItems: 'center', borderRadius: 20, paddingVertical: 20, paddingHorizontal: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  actionIcon:  { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  actionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, marginBottom: 4, color: '#FFFFFF' },
  actionDesc:  { fontFamily: 'Poppins_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },

  infoCard:   { flexDirection: 'row', gap: 14, alignItems: 'flex-start', borderRadius: 20, padding: 20, marginTop: 28, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  infoText:   { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 14, lineHeight: 22, color: 'rgba(255,255,255,0.6)' },
});
