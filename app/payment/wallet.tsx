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
import { useColors } from '@/hooks/useColors';
import { api, type MembershipSummary, type RewardsSummary } from '@/lib/api';
import type { Ticket as ApiTicket } from '@/shared/schema';
import { AuthGuard } from '@/components/AuthGuard';

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

function toWalletTicket(ticket: ApiTicket): WalletTicket {
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

// ─── Ticket card ──────────────────────────────────────────────────────────────

interface TicketCardProps { ticket: WalletTicket; colors: ReturnType<typeof useColors> }

function TicketCard({ ticket, colors }: TicketCardProps) {
  const accentColor = ticket.imageColor || colors.primary;
  const upcoming = isUpcoming(ticket.eventDate);

  return (
    <Pressable
      style={[s.ticketCard, { backgroundColor: colors.surface, borderLeftColor: accentColor, borderLeftWidth: 4 }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: '/tickets/[id]', params: { id: ticket.id } });
      }}
    >
      <View style={[s.ticketStatusDot, { backgroundColor: upcoming ? colors.success : colors.textTertiary }]} />

      <View style={{ flex: 1 }}>
        <Text style={[s.ticketTitle, { color: colors.text }]} numberOfLines={1}>{ticket.eventTitle}</Text>
        <View style={s.ticketMeta}>
          <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
          <Text style={[s.ticketMetaText, { color: colors.text }]}>{formatEventDate(ticket.eventDate)}</Text>
          {ticket.eventTime && (
            <>
              <Text style={[s.ticketMetaDot, { color: colors.textSecondary }]}>·</Text>
              <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
              <Text style={[s.ticketMetaText, { color: colors.text }]}>{ticket.eventTime}</Text>
            </>
          )}
        </View>
        {ticket.eventVenue && (
          <View style={s.ticketMeta}>
            <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
            <Text style={[s.ticketMetaText, { color: colors.text }]} numberOfLines={1}>{ticket.eventVenue}</Text>
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
          <Text style={[s.quantityText, { color: colors.text }]}>×{ticket.quantity}</Text>
        )}
        <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
      </View>
    </Pressable>
  );
}

// ─── Stats box ────────────────────────────────────────────────────────────────

interface StatBoxProps { value: string | number; label: string; icon: string; colors: ReturnType<typeof useColors> }

function StatBox({ value, label, icon, colors }: StatBoxProps) {
  return (
    <View style={s.statBox}>
      <Ionicons name={icon as never} size={18} color={colors.primary} style={{ marginBottom: 4 }} />
      <Text style={[s.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[s.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

type WalletTab = 'upcoming' | 'past';

export default function WalletScreen() {
  const insets      = useSafeAreaInsets();
  const topInset    = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;
  const colors      = useColors();
  const { userId }  = useAuth();
  const [tab, setTab] = useState<WalletTab>('upcoming');

  const tierConfigMap = useMemo<Record<string, { label: string; colors: [string, string]; icon: string }>>(() => ({
    free:    { label: 'Standard', colors: [colors.textSecondary, colors.surfaceSecondary], icon: 'shield-outline' },
    plus:    { label: 'Plus',     colors: [colors.primary, colors.secondary],              icon: 'star' },
    premium: { label: 'Premium',  colors: [colors.warning, colors.accent],                 icon: 'diamond' },
    elite:   { label: 'Elite',    colors: [colors.secondary, colors.primary],              icon: 'trophy' },
    vip:     { label: 'VIP',      colors: [colors.error, colors.warning],                  icon: 'ribbon' },
    pro:     { label: 'Pro',      colors: [colors.success, colors.primary],                icon: 'briefcase' },
  }), [colors]);

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
      <View style={[s.container, { paddingTop: topInset, backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={[s.backBtn, { backgroundColor: colors.surface }]}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[s.headerTitle, { color: colors.text }]}>My Wallet</Text>
          <Pressable
            style={[s.scanBtn, { backgroundColor: colors.primaryGlow }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/tickets/index');
            }}
          >
            <Ionicons name="ticket-outline" size={20} color={colors.primary} />
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
              <View style={[s.membershipCircle, { backgroundColor: colors.textInverse + '14' }]} />
              <View style={[s.membershipCircle2, { backgroundColor: colors.textInverse + '0F' }]} />

              <View style={s.membershipTop}>
                <View>
                  <Text style={[s.membershipLabel, { color: colors.textInverse + 'B3' }]}>CulturePass</Text>
                  <Text style={[s.membershipTier, { color: colors.textInverse }]}>{tierConfig.label}</Text>
                </View>
                <View style={[s.membershipIconWrap, { backgroundColor: colors.textInverse + '26' }]}>
                  <Ionicons name={tierConfig.icon as never} size={28} color={colors.textInverse + 'E6'} />
                </View>
              </View>

              <View style={s.membershipBottom}>
                <View>
                  <Text style={[s.membershipStatLabel, { color: colors.textInverse + '99' }]}>Total Events</Text>
                  <Text style={[s.membershipStatValue, { color: colors.textInverse }]}>{membership?.eventsAttended ?? confirmed.length}</Text>
                </View>
                {membership?.cashbackMultiplier != null && membership.cashbackMultiplier > 1 && (
                  <View>
                    <Text style={[s.membershipStatLabel, { color: colors.textInverse + '99' }]}>Cashback</Text>
                    <Text style={[s.membershipStatValue, { color: colors.textInverse }]}>{((membership.cashbackMultiplier - 1) * 100).toFixed(0)}%</Text>
                  </View>
                )}
                {membership?.expiresAt && (
                  <View>
                    <Text style={[s.membershipStatLabel, { color: colors.textInverse + '99' }]}>Expires</Text>
                    <Text style={[s.membershipStatValue, { color: colors.textInverse }]}>
                      {new Date(membership.expiresAt).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                )}
              </View>
            </LinearGradient>
          </View>

          {/* Rewards strip */}
          <View style={[s.rewardsStrip, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <View style={s.rewardsLeft}>
              <View style={[s.rewardsIconWrap, { backgroundColor: colors.warning + '15' }]}>
                <Ionicons name="trophy-outline" size={15} color={colors.warning} />
              </View>
              <View>
                <Text style={[s.rewardsTitle, { color: colors.text }]}>
                  {rewards?.tierLabel ?? 'Silver'} Rewards
                </Text>
                <Text style={[s.rewardsSub, { color: colors.textSecondary }]}>
                  {rewards?.nextTierLabel
                    ? `${rewards.pointsToNextTier} pts to ${rewards.nextTierLabel}`
                    : 'Top tier unlocked'}
                </Text>
              </View>
            </View>
            <Text style={[s.rewardsPoints, { color: colors.warning }]}>{rewards?.points ?? 0} pts</Text>
          </View>

          {/* Upgrade prompt for free tier */}
          {(!membership || membership.tier === 'free') && (
            <Pressable
              style={[s.upgradePrompt, { backgroundColor: colors.warning + '12', borderColor: colors.warning + '30' }]}
              onPress={() => router.push('/membership/upgrade')}
            >
              <Ionicons name="star" size={16} color={colors.warning} />
              <Text style={[s.upgradePromptText, { color: colors.warning }]}>
                Upgrade to Plus for 2% cashback on all tickets
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.warning} />
            </Pressable>
          )}

          {/* Stats row */}
          <View style={[s.statsRow, { backgroundColor: colors.surface }]}>
            <StatBox value={upcoming.length}  label="Upcoming" icon="calendar"         colors={colors} />
            <View style={[s.statsDivider, { backgroundColor: colors.divider }]} />
            <StatBox value={past.length}      label="Attended" icon="checkmark-circle"  colors={colors} />
            <View style={[s.statsDivider, { backgroundColor: colors.divider }]} />
            <StatBox value={confirmed.length} label="Total"    icon="ticket"            colors={colors} />
          </View>

          {/* Apple/Google Wallet promo */}
          <View style={s.digitalWalletRow}>
            <View style={[s.walletPassBtn, s.walletPassDisabled, { backgroundColor: colors.surfaceSecondary }]}> 
              <Ionicons name="logo-apple" size={18} color={colors.textInverse} />
              <View>
                <Text style={[s.walletPassText, { color: colors.textInverse }]}>Add to Apple Wallet</Text>
                <Text style={[s.walletPassSoon, { color: colors.textInverse + 'A6' }]}>Coming soon</Text>
              </View>
            </View>
            <View style={[s.walletPassBtn, s.walletPassDisabled, { backgroundColor: colors.info }]}> 
              <Ionicons name="logo-google" size={16} color={colors.textInverse} />
              <View>
                <Text style={[s.walletPassText, { color: colors.textInverse }]}>Google Wallet</Text>
                <Text style={[s.walletPassSoon, { color: colors.textInverse + 'A6' }]}>Coming soon</Text>
              </View>
            </View>
          </View>

          {/* Tabs */}
          <View style={[s.tabsRow, { backgroundColor: colors.surface }]}>
            {(['upcoming', 'past'] as WalletTab[]).map((t) => (
              <Pressable
                key={t}
                style={[s.tab, tab === t && { backgroundColor: colors.primary }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTab(t); }}
              >
                <Text style={[s.tabText, { color: tab === t ? colors.textInverse : colors.text }]}> 
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
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : displayTickets.length === 0 ? (
              <View style={s.emptyState}>
                <Ionicons
                  name={tab === 'upcoming' ? 'ticket-outline' : 'time-outline'}
                  size={48}
                  color={colors.textSecondary}
                />
                <Text style={[s.emptyTitle, { color: colors.text }]}>
                  {tab === 'upcoming' ? 'No upcoming tickets' : 'No past events'}
                </Text>
                <Text style={[s.emptySubtitle, { color: colors.text }]}> 
                  {tab === 'upcoming'
                    ? 'Browse events and grab your first ticket!'
                    : 'Your attended events will appear here.'}
                </Text>
                {tab === 'upcoming' && (
                  <Pressable
                    style={[s.browseBtn, { backgroundColor: colors.primary }]}
                    onPress={() => router.push('/(tabs)')}
                  >
                    <Text style={[s.browseBtnText, { color: colors.textInverse }]}>Discover Events</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              displayTickets.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} colors={colors} />
              ))
            )}
          </View>

          {/* View all link */}
          {displayTickets.length > 0 && (
            <Pressable style={s.viewAllBtn} onPress={() => router.push('/tickets/index')}>
              <Text style={[s.viewAllBtnText, { color: colors.primary }]}>View All Tickets</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </Pressable>
          )}
        </ScrollView>
      </View>
    </AuthGuard>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold' },
  scanBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Membership card
  membershipCardWrap: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  membershipCard: {
    padding: 22,
    borderRadius: 20,
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
  },
  membershipCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  membershipTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  membershipLabel:    { fontSize: 13, fontFamily: 'Poppins_400Regular', letterSpacing: 0.5 },
  membershipTier:     { fontSize: 26, fontFamily: 'Poppins_700Bold', marginTop: 2 },
  membershipIconWrap: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  membershipBottom:   { flexDirection: 'row', gap: 32 },
  membershipStatLabel:{ fontSize: 11, fontFamily: 'Poppins_400Regular' },
  membershipStatValue:{ fontSize: 18, fontFamily: 'Poppins_700Bold', marginTop: 1 },

  // Rewards strip
  rewardsStrip: {
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rewardsLeft:    { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  rewardsIconWrap:{ width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rewardsTitle:   { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  rewardsSub:     { fontSize: 11, fontFamily: 'Poppins_400Regular', marginTop: 1 },
  rewardsPoints:  { fontSize: 13, fontFamily: 'Poppins_700Bold' },

  // Upgrade prompt
  upgradePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
    borderWidth: 1,
  },
  upgradePromptText: { flex: 1, fontSize: 13, fontFamily: 'Poppins_500Medium' },

  // Stats
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statBox:      { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statValue:    { fontSize: 22, fontFamily: 'Poppins_700Bold' },
  statLabel:    { fontSize: 11, fontFamily: 'Poppins_500Medium', marginTop: 2 },
  statsDivider: { width: 1, marginVertical: 10 },

  // Digital wallet
  digitalWalletRow: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 20, gap: 10 },
  walletPassBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  walletPassText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  walletPassSoon: { fontSize: 10, fontFamily: 'Poppins_400Regular', marginTop: 1 },
  walletPassDisabled: { opacity: 0.55 },

  // Tabs
  tabsRow: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 12, borderRadius: 12, padding: 4 },
  tab:     { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10 },
  tabText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },

  // Ticket list
  ticketList: { paddingHorizontal: 20, gap: 10 },
  ticketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  ticketStatusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 2 },
  ticketTitle:     { fontSize: 14, fontFamily: 'Poppins_600SemiBold', marginBottom: 4 },
  ticketMeta:      { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  ticketMetaText:  { fontSize: 12, fontFamily: 'Poppins_400Regular' },
  ticketMetaDot:   { fontSize: 12 },
  tierPill:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tierPillText:    { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
  quantityText:    { fontSize: 12, fontFamily: 'Poppins_600SemiBold' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: 'Poppins_600SemiBold', marginTop: 8 },
  emptySubtitle: { fontSize: 13, fontFamily: 'Poppins_400Regular', textAlign: 'center', paddingHorizontal: 32 },
  browseBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  browseBtnText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },

  // View all
  viewAllBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 16, marginTop: 8 },
  viewAllBtnText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
});
