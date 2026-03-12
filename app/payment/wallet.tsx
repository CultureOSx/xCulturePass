import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/lib/auth';
import { api, type MembershipSummary, type RewardsSummary } from '@/lib/api';
import type { Ticket as ApiTicket } from '@/shared/schema';
import { AuthGuard } from '@/components/AuthGuard';
import { CultureTokens } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WalletTicket {
  id: string;
  eventTitle: string;
  eventDate: string | null;
  eventTime: string | null;
  eventVenue: string | null;
  tierName: string | null;
  quantity: number | null;
  status: ApiTicket['status'];
  imageColor: string | null;
  price?: number | null;
}

function toWalletTicket(ticket: any): WalletTicket {
  return {
    id: ticket.id,
    eventTitle: ticket.eventTitle ?? ticket.eventName ?? ticket.title ?? 'Untitled Event',
    eventDate: ticket.eventDate ?? ticket.date ?? null,
    eventTime: ticket.eventTime ?? null,
    eventVenue: ticket.eventVenue ?? ticket.venue ?? null,
    tierName: ticket.tierName ?? null,
    quantity: ticket.quantity ?? null,
    status: ticket.status ?? null,
    imageColor: ticket.imageColor ?? null,
    price: ticket.totalPriceCents != null ? ticket.totalPriceCents / 100 : null,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatEventDate(dateStr: string | null): string {
  if (!dateStr) return 'TBA';
  const d = new Date(dateStr);
  const isThisYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(isThisYear ? {} : { year: 'numeric' }),
  });
}

function isUpcoming(dateStr: string | null): boolean {
  if (!dateStr) return true;
  return new Date(dateStr) >= new Date();
}

const isWeb = Platform.OS === 'web';

// ─── Ticket card ──────────────────────────────────────────────────────────────

interface TicketCardProps { ticket: WalletTicket; }

function TicketCard({ ticket }: TicketCardProps) {
  const accentColor = ticket.imageColor || CultureTokens.indigo;
  const upcoming = isUpcoming(ticket.eventDate);

  return (
    <Pressable
      style={({pressed}) => [s.ticketCard, { borderLeftColor: accentColor, borderLeftWidth: 4 }, pressed && { transform: [{ scale: 0.98 }] }]}
      onPress={() => {
        if(!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: '/tickets/[id]', params: { id: ticket.id } });
      }}
    >
      <View style={[s.ticketStatusDot, { backgroundColor: upcoming ? CultureTokens.teal : 'rgba(255,255,255,0.4)' }]} />

      <View style={{ flex: 1 }}>
        <Text style={s.ticketTitle} numberOfLines={1}>{ticket.eventTitle}</Text>
        <View style={s.ticketMeta}>
          <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.6)" />
          <Text style={s.ticketMetaText}>{formatEventDate(ticket.eventDate)}</Text>
          {ticket.eventTime && (
            <>
              <Text style={s.ticketMetaDot}>·</Text>
              <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.6)" />
              <Text style={s.ticketMetaText}>{ticket.eventTime}</Text>
            </>
          )}
        </View>
        {ticket.eventVenue && (
          <View style={s.ticketMeta}>
            <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.6)" />
            <Text style={s.ticketMetaText} numberOfLines={1}>{ticket.eventVenue}</Text>
          </View>
        )}
      </View>

      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        {ticket.tierName && (
          <View style={[s.tierPill, { backgroundColor: accentColor + '20' }]}>
            <Text style={[s.tierPillText, { color: accentColor }]}>{ticket.tierName}</Text>
          </View>
        )}
        {ticket.quantity != null && ticket.quantity > 1 && (
          <Text style={s.quantityText}>×{ticket.quantity}</Text>
        )}
        <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.4)" />
      </View>
    </Pressable>
  );
}

// ─── Stats box ────────────────────────────────────────────────────────────────

interface StatBoxProps { value: string | number; label: string; icon: string; }

function StatBox({ value, label, icon }: StatBoxProps) {
  return (
    <View style={s.statBox}>
      <Ionicons name={icon as never} size={18} color={CultureTokens.indigo} style={{ marginBottom: 4 }} />
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

type WalletTab = 'upcoming' | 'past';

export default function WalletScreen() {
  const insets      = useSafeAreaInsets();
  const topInset    = isWeb ? 0 : insets.top;
  const bottomInset = isWeb ? 34 : insets.bottom;
  const { userId }  = useAuth();
  const [tab, setTab] = useState<WalletTab>('upcoming');

  const tierConfigMap = useMemo<Record<string, { label: string; colors: [string, string]; icon: string }>>(() => ({
    free:    { label: 'Standard', colors: ['#2A2A35', '#1B1B25'], icon: 'shield-outline' },
    plus:    { label: 'Plus',     colors: [CultureTokens.indigo, '#1E1C59'], icon: 'star' },
    premium: { label: 'Premium',  colors: [CultureTokens.saffron, '#CC6F33'], icon: 'diamond' },
    elite:   { label: 'Elite',    colors: [CultureTokens.teal, '#1A8F84'], icon: 'trophy' },
    vip:     { label: 'VIP',      colors: [CultureTokens.coral, '#CC4745'], icon: 'ribbon' },
    pro:     { label: 'Pro',      colors: ['#3A86FF', '#285FCC'], icon: 'briefcase' },
  }), []);

  const { data: ticketsData = [], isLoading } = useQuery<WalletTicket[]>({
    queryKey: ['tickets', 'wallet', userId],
    queryFn: async () => {
      const tickets = await api.tickets.forUser(userId!);
      return Array.isArray(tickets) ? tickets.map(toWalletTicket) : [];
    },
    enabled: !!userId,
  });

  const { data: membership } = useQuery<MembershipSummary>({
    queryKey: ['membership', userId],
    queryFn: () => api.membership.get(userId!),
    enabled: !!userId,
  });

  const { data: rewards } = useQuery<RewardsSummary>({
    queryKey: ['rewards', userId],
    queryFn: () => api.rewards.get(userId!),
    enabled: !!userId,
  });

  const confirmed     = ticketsData.filter((t) => t.status === 'confirmed' || t.status === 'used');
  const upcoming      = confirmed.filter((t) =>  isUpcoming(t.eventDate));
  const past          = confirmed.filter((t) => !isUpcoming(t.eventDate));
  const tierConfig    = tierConfigMap[membership?.tier || 'free'] ?? tierConfigMap.free;
  const displayTickets = tab === 'upcoming' ? upcoming : past;

  return (
    <AuthGuard icon="wallet-outline" title="My Wallet" message="Sign in to access your wallet, tickets, and rewards.">
      <View style={[s.container, { paddingTop: topInset }]}>
        <LinearGradient 
          colors={['rgba(44, 42, 114, 0.15)', 'transparent']} 
          style={StyleSheet.absoluteFillObject} 
          pointerEvents="none" 
        />
        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={({pressed}) => [s.backBtn, pressed && { transform: [{ scale: 0.95 }] }]}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={s.headerTitle}>My Wallet</Text>
          <Pressable
            style={({pressed}) => [s.scanBtn, pressed && { transform: [{ scale: 0.95 }] }]}
            onPress={() => {
              if(!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/tickets/index');
            }}
          >
            <Ionicons name="ticket-outline" size={20} color={CultureTokens.indigo} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset + 24 }}>

          {/* Membership card */}
          <View style={s.membershipCardWrap}>
            <LinearGradient
              colors={tierConfig.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.membershipCard}
            >
              <View style={s.membershipCircle} />
              <View style={s.membershipCircle2} />

              <View style={s.membershipTop}>
                <View>
                  <Text style={s.membershipLabel}>CulturePass</Text>
                  <Text style={s.membershipTier}>{tierConfig.label}</Text>
                </View>
                <View style={s.membershipIconWrap}>
                  <Ionicons name={tierConfig.icon as never} size={28} color="rgba(255,255,255,0.9)" />
                </View>
              </View>

              <View style={s.membershipBottom}>
                <View>
                  <Text style={s.membershipStatLabel}>Total Events</Text>
                  <Text style={s.membershipStatValue}>{membership?.eventsAttended ?? confirmed.length}</Text>
                </View>
                {membership?.cashbackMultiplier != null && membership.cashbackMultiplier > 1 && (
                  <View>
                    <Text style={s.membershipStatLabel}>Cashback</Text>
                    <Text style={s.membershipStatValue}>{((membership.cashbackMultiplier - 1) * 100).toFixed(0)}%</Text>
                  </View>
                )}
                {membership?.expiresAt && (
                  <View>
                    <Text style={s.membershipStatLabel}>Expires</Text>
                    <Text style={s.membershipStatValue}>
                      {new Date(membership.expiresAt).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                )}
              </View>
            </LinearGradient>
          </View>

          {/* Rewards strip */}
          <View style={s.rewardsStrip}>
            <View style={s.rewardsLeft}>
              <View style={s.rewardsIconWrap}>
                <Ionicons name="trophy-outline" size={15} color={CultureTokens.warning} />
              </View>
              <View>
                <Text style={s.rewardsTitle}>
                  {rewards?.tierLabel ?? 'Silver'} Rewards
                </Text>
                <Text style={s.rewardsSub}>
                  {rewards?.nextTierLabel
                    ? `${rewards.pointsToNextTier} pts to ${rewards.nextTierLabel}`
                    : 'Top tier unlocked'}
                </Text>
              </View>
            </View>
            <Text style={s.rewardsPoints}>{rewards?.points ?? 0} pts</Text>
          </View>

          {/* Upgrade prompt for free tier */}
          {(!membership || membership.tier === 'free') && (
            <Pressable
              style={({pressed}) => [s.upgradePrompt, pressed && { opacity: 0.8 }]}
              onPress={() => router.push('/membership/upgrade')}
            >
              <Ionicons name="star" size={16} color={CultureTokens.warning} />
              <Text style={s.upgradePromptText}>
                Upgrade to Plus for 2% cashback on all tickets
              </Text>
              <Ionicons name="chevron-forward" size={14} color={CultureTokens.warning} />
            </Pressable>
          )}

          {/* Stats row */}
          <View style={s.statsRow}>
            <StatBox value={upcoming.length}  label="Upcoming" icon="calendar" />
            <View style={s.statsDivider} />
            <StatBox value={past.length}      label="Attended" icon="checkmark-circle" />
            <View style={s.statsDivider} />
            <StatBox value={confirmed.length} label="Total"    icon="ticket" />
          </View>

          {/* Apple/Google Wallet promo */}
          <View style={s.digitalWalletRow}>
            {(Platform.OS === 'ios' || isWeb) && (
              <View style={[s.walletPassBtn, s.walletPassDisabled, { backgroundColor: '#111111', borderWidth: 1, borderColor: '#333' }]}> 
                <Ionicons name="logo-apple" size={18} color="#FFFFFF" />
                <View>
                  <Text style={s.walletPassText}>Apple Wallet</Text>
                  <Text style={s.walletPassSoon}>Coming soon</Text>
                </View>
              </View>
            )}
            <View style={[s.walletPassBtn, s.walletPassDisabled, { backgroundColor: '#4285F4' }]}> 
              <Ionicons name="logo-google" size={16} color="#FFFFFF" />
              <View>
                <Text style={s.walletPassText}>Google Wallet</Text>
                <Text style={s.walletPassSoon}>Coming soon</Text>
              </View>
            </View>
          </View>

          {/* Tabs */}
          <View style={s.tabsRow}>
            {(['upcoming', 'past'] as WalletTab[]).map((t) => (
              <Pressable
                key={t}
                style={[s.tab, tab === t ? { backgroundColor: 'rgba(255,255,255,0.08)' } : { backgroundColor: 'rgba(255,255,255,0.02)' }]}
                onPress={() => { if(!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTab(t); }}
              >
                <Text style={[s.tabText, tab === t ? { color: '#FFFFFF' } : { color: 'rgba(255,255,255,0.6)' }]}> 
                  {t === 'upcoming'
                    ? `Upcoming${upcoming.length > 0 ? ` (${upcoming.length})` : ''}`
                    : `Past${past.length > 0 ? ` (${past.length})` : ''}`}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Ticket list */}
          <View style={s.ticketList}>
            {isLoading ? (
              <View style={s.emptyState}>
                <ActivityIndicator color={CultureTokens.indigo} />
              </View>
            ) : displayTickets.length === 0 ? (
              <View style={s.emptyState}>
                <Ionicons
                  name={tab === 'upcoming' ? 'ticket-outline' : 'time-outline'}
                  size={48}
                  color="rgba(255,255,255,0.4)"
                />
                <Text style={s.emptyTitle}>
                  {tab === 'upcoming' ? 'No upcoming tickets' : 'No past events'}
                </Text>
                <Text style={s.emptySubtitle}> 
                  {tab === 'upcoming'
                    ? 'Browse events and grab your first ticket!'
                    : 'Your attended events will appear here.'}
                </Text>
                {tab === 'upcoming' && (
                  <Pressable
                    style={({pressed}) => [s.browseBtn, pressed && { transform: [{ scale: 0.98 }] }]}
                    onPress={() => router.push('/(tabs)')}
                  >
                    <Text style={s.browseBtnText}>Discover Events</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              displayTickets.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))
            )}
          </View>

          {/* View all link */}
          {displayTickets.length > 0 && (
            <Pressable style={({pressed}) => [s.viewAllBtn, pressed && { opacity: 0.7 }]} onPress={() => router.push('/tickets/index')}>
              <Text style={s.viewAllBtnText}>View All Tickets</Text>
              <Ionicons name="chevron-forward" size={14} color={CultureTokens.indigo} />
            </Pressable>
          )}
        </ScrollView>
      </View>
    </AuthGuard>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B14' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    zIndex: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  headerTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  scanBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CultureTokens.indigo + '20',
  },

  // Membership card
  membershipCardWrap: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  membershipCard: {
    padding: 24,
    borderRadius: 24,
    overflow: 'hidden',
    minHeight: 140,
  },
  membershipCircle: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.08)'
  },
  membershipCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)'
  },
  membershipTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  membershipLabel:    { fontSize: 13, fontFamily: 'Poppins_400Regular', letterSpacing: 0.5, color: 'rgba(255,255,255,0.7)' },
  membershipTier:     { fontSize: 28, fontFamily: 'Poppins_700Bold', marginTop: 2, color: '#FFFFFF' },
  membershipIconWrap: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  membershipBottom:   { flexDirection: 'row', gap: 32 },
  membershipStatLabel:{ fontSize: 11, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.6)' },
  membershipStatValue:{ fontSize: 18, fontFamily: 'Poppins_700Bold', marginTop: 1, color: '#FFFFFF' },

  // Rewards strip
  rewardsStrip: {
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rewardsLeft:    { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  rewardsIconWrap:{ width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: CultureTokens.warning + '15' },
  rewardsTitle:   { fontSize: 14, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  rewardsSub:     { fontSize: 13, fontFamily: 'Poppins_400Regular', marginTop: 1, color: 'rgba(255,255,255,0.6)' },
  rewardsPoints:  { fontSize: 15, fontFamily: 'Poppins_700Bold', color: CultureTokens.warning },

  // Upgrade prompt
  upgradePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
    borderWidth: 1,
    backgroundColor: CultureTokens.warning + '12',
    borderColor: CultureTokens.warning + '40',
  },
  upgradePromptText: { flex: 1, fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: CultureTokens.warning },

  // Stats
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statBox:      { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statValue:    { fontSize: 24, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  statLabel:    { fontSize: 12, fontFamily: 'Poppins_500Medium', marginTop: 2, color: 'rgba(255,255,255,0.6)' },
  statsDivider: { width: 1, marginVertical: 12, backgroundColor: 'rgba(255,255,255,0.1)' },

  // Digital wallet
  digitalWalletRow: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 24, gap: 12 },
  walletPassBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
  },
  walletPassText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
  walletPassSoon: { fontSize: 11, fontFamily: 'Poppins_400Regular', marginTop: 1, color: 'rgba(255,255,255,0.6)' },
  walletPassDisabled: { opacity: 0.6 },

  // Tabs
  tabsRow: { flexDirection: 'row', marginHorizontal: 20, gap: 8, marginBottom: 16 },
  tab:     { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  tabText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },

  // Ticket list
  ticketList: { paddingHorizontal: 20, gap: 12 },
  ticketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ticketStatusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 2 },
  ticketTitle:     { fontSize: 16, fontFamily: 'Poppins_700Bold', marginBottom: 6, color: '#FFFFFF' },
  ticketMeta:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  ticketMetaText:  { fontSize: 13, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.6)' },
  ticketMetaDot:   { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginHorizontal: 2 },
  tierPill:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tierPillText:    { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
  quantityText:    { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', marginTop: 8, color: '#FFFFFF' },
  emptySubtitle: { fontSize: 14, fontFamily: 'Poppins_400Regular', textAlign: 'center', paddingHorizontal: 32, color: 'rgba(255,255,255,0.6)' },
  browseBtn: { marginTop: 16, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, backgroundColor: CultureTokens.indigo },
  browseBtnText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },

  // View all
  viewAllBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 20, marginTop: 8 },
  viewAllBtnText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: CultureTokens.indigo },
});
