import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Alert, Share, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/query-client';
import { useAuth } from '@/lib/auth';
import { useColors } from '@/hooks/useColors';
import { AuthGuard } from '@/components/AuthGuard';

interface Ticket {
  id: string;
  userId: string;
  eventId: string;
  eventTitle: string;
  eventDate: string | null;
  eventTime: string | null;
  eventVenue: string | null;
  tierName: string | null;
  quantity: number | null;
  totalPriceCents: number | null;
  currency: string | null;
  status: string | null;
  paymentStatus?: string | null;
  priority?: 'low' | 'normal' | 'high' | 'vip' | null;
  ticketCode: string | null;
  imageColor: string | null;
  createdAt: string | null;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
}

async function handleShare(ticket: Ticket) {
  try {
    const dateStr = ticket.eventDate ? formatDate(ticket.eventDate) : '';
    const timeStr = ticket.eventTime ? ` at ${ticket.eventTime}` : '';
    const venueStr = ticket.eventVenue ? `\nVenue: ${ticket.eventVenue}` : '';
    await Share.share({
      message: `Check out my ticket for ${ticket.eventTitle}!\n${dateStr}${timeStr}${venueStr}`,
      title: ticket.eventTitle,
    });
  } catch {}
}

interface RenderTicketProps {
  ticket: Ticket;
  colors: ReturnType<typeof useColors>;
  onCancel: (t: Ticket) => void;
}

function TicketCard({ ticket, colors, onCancel }: RenderTicketProps) {
  const isActive = ticket.status === 'confirmed';

  const statusStyle =
    ticket.status === 'confirmed' ? { bg: colors.success + '15', color: colors.success,       label: 'Confirmed' } :
    ticket.status === 'used'      ? { bg: colors.textSecondary + '15', color: colors.textSecondary, label: 'Scanned' } :
    ticket.status === 'cancelled' ? { bg: colors.error + '15',   color: colors.error,          label: 'Cancelled' } :
    ticket.status === 'expired'   ? { bg: colors.warning + '15', color: colors.warning,        label: 'Expired'   } :
                                    { bg: colors.textSecondary + '15', color: colors.textSecondary, label: ticket.status || 'Unknown' };

  const priorityStyle =
    ticket.priority === 'vip'  ? { bg: colors.warning + '22', color: colors.warning,     label: 'VIP'    } :
    ticket.priority === 'high' ? { bg: colors.error + '22',   color: colors.error,       label: 'High'   } :
    ticket.priority === 'low'  ? { bg: colors.success + '22', color: colors.success,     label: 'Low'    } :
                                  { bg: colors.textSecondary + '22', color: colors.textSecondary, label: 'Normal' };

  return (
    <Pressable
      style={[s.ticketCard, { backgroundColor: colors.surface }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: '/tickets/[id]', params: { id: ticket.id } });
      }}
    >
      <View style={[s.ticketBanner, { backgroundColor: ticket.imageColor || colors.primary }]}>
        <View style={s.ticketBannerOverlay}>
          <View style={[s.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[s.statusText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
          </View>
          <Ionicons name="ticket" size={28} color="rgba(255,255,255,0.6)" />
        </View>
      </View>

      <View style={s.ticketBody}>
        <Text style={[s.ticketTitle, { color: colors.text }]} numberOfLines={2}>{ticket.eventTitle}</Text>

        <View style={s.ticketMeta}>
          {ticket.eventDate && (
            <View style={s.ticketMetaItem}>
              <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
              <Text style={[s.ticketMetaText, { color: colors.textSecondary }]}>{formatDate(ticket.eventDate)}</Text>
            </View>
          )}
          {ticket.eventTime && (
            <View style={s.ticketMetaItem}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={[s.ticketMetaText, { color: colors.textSecondary }]}>{ticket.eventTime}</Text>
            </View>
          )}
        </View>

        {ticket.eventVenue && (
          <View style={s.ticketMetaItem}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={[s.ticketMetaText, { color: colors.textSecondary }]} numberOfLines={1}>{ticket.eventVenue}</Text>
          </View>
        )}

        <View style={[s.ticketFooter, { borderTopColor: colors.divider }]}>
          <View style={s.ticketDetails}>
            {ticket.tierName && (
              <View style={[s.tierBadge, { backgroundColor: colors.accent + '15' }]}>
                <Text style={[s.tierText, { color: colors.accent }]}>{ticket.tierName}</Text>
              </View>
            )}
            <View style={[s.priorityBadge, { backgroundColor: priorityStyle.bg }]}>
              <Text style={[s.priorityText, { color: priorityStyle.color }]}>{priorityStyle.label}</Text>
            </View>
            <Text style={[s.ticketQty, { color: colors.textSecondary }]}>
              {ticket.quantity || 1}x ticket{(ticket.quantity || 1) > 1 ? 's' : ''}
            </Text>
          </View>
          <Text style={[s.ticketPrice, { color: colors.text }]}>${((ticket.totalPriceCents || 0) / 100).toFixed(2)}</Text>
        </View>

        {ticket.ticketCode && isActive && (
          <View style={[s.codeRow, { backgroundColor: colors.primaryGlow }]}>
            <Ionicons name="qr-code" size={16} color={colors.primary} />
            <Text style={[s.codeText, { color: colors.primary }]}>{ticket.ticketCode}</Text>
          </View>
        )}

        {isActive && (
          <View style={s.actionRow}>
            {[
              { icon: 'share-outline', label: 'Share',  onPress: () => handleShare(ticket) },
              { icon: 'wallet-outline',label: 'Wallet', onPress: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Alert.alert('Added to Wallet', `Your ticket for "${ticket.eventTitle}" has been saved to your wallet.`); } },
              { icon: 'print-outline', label: 'Print',  onPress: () => router.push({ pathname: '/tickets/print/[id]', params: { id: ticket.id, layout: 'full', autoPrint: '1' } }) },
            ].map(btn => (
              <Pressable
                key={btn.label}
                style={[s.actionBtn, { backgroundColor: colors.primaryGlow }]}
                onPress={(e) => { e.stopPropagation?.(); btn.onPress(); }}
              >
                <Ionicons name={btn.icon as never} size={18} color={colors.primary} />
                <Text style={[s.actionBtnText, { color: colors.primary }]}>{btn.label}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {isActive && (
          <Pressable
            style={[s.cancelBtn, { backgroundColor: colors.error + '08' }]}
            onPress={(e) => { e.stopPropagation?.(); onCancel(ticket); }}
          >
            <Text style={[s.cancelBtnText, { color: colors.error }]}>Cancel Ticket</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

export default function TicketsScreen() {
  const insets  = useSafeAreaInsets();
  const webTop  = Platform.OS === 'web' ? 0 : 0;
  const colors  = useColors();
  const { userId } = useAuth();

  const { data: tickets = [], isLoading } = useQuery<Ticket[]>({
    queryKey: ['/api/tickets', userId],
    enabled: !!userId,
  });

  const cancelMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      await apiRequest('PUT', `/api/tickets/${ticketId}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tickets', userId] });
      Alert.alert('Ticket Cancelled', 'Your ticket has been cancelled. A refund will be processed.');
    },
  });

  const handleCancel = (ticket: Ticket) => {
    Alert.alert('Cancel Ticket', `Are you sure you want to cancel your ticket for "${ticket.eventTitle}"?`, [
      { text: 'Keep Ticket', style: 'cancel' },
      { text: 'Cancel Ticket', style: 'destructive', onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        cancelMutation.mutate(ticket.id);
      }},
    ]);
  };

  const activeTickets = tickets.filter(t => t.status === 'confirmed');
  const pastTickets   = tickets.filter(t => t.status !== 'confirmed');

  return (
    <AuthGuard icon="ticket-outline" title="My Tickets" message="Sign in to view and manage your event tickets.">
      <View style={[s.container, { paddingTop: insets.top + webTop, backgroundColor: colors.background }]}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={[s.backBtn, { backgroundColor: colors.surface }]}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[s.headerTitle, { color: colors.text }]}>My Tickets</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 + (Platform.OS === 'web' ? 34 : insets.bottom) }}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={s.emptyState}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : tickets.length === 0 ? (
            <View style={s.emptyState}>
              <View style={[s.emptyIcon, { backgroundColor: colors.backgroundSecondary }]}>
                <Ionicons name="ticket-outline" size={48} color={colors.textSecondary} />
              </View>
              <Text style={[s.emptyTitle, { color: colors.text }]}>No Tickets Yet</Text>
              <Text style={[s.emptySub, { color: colors.text }]}>Your purchased event tickets will appear here</Text>
              <Pressable
                style={[s.browseBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/(tabs)')}
              >
                <Ionicons name="search" size={18} color={colors.textInverse} />
                <Text style={[s.browseBtnText, { color: colors.textInverse }]}>Browse Events</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {activeTickets.length > 0 && (
                <View style={s.section}>
                  <Text style={[s.sectionTitle, { color: colors.text }]}>Upcoming ({activeTickets.length})</Text>
                  {activeTickets.map(t => <TicketCard key={t.id} ticket={t} colors={colors} onCancel={handleCancel} />)}
                </View>
              )}
              {pastTickets.length > 0 && (
                <View style={s.section}>
                  <Text style={[s.sectionTitle, { color: colors.text }]}>Past Tickets ({pastTickets.length})</Text>
                  {pastTickets.map(t => <TicketCard key={t.id} ticket={t} colors={colors} onCancel={handleCancel} />)}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </AuthGuard>
  );
}

const s = StyleSheet.create({
  container:         { flex: 1 },
  header:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn:           { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle:       { fontSize: 18, fontFamily: 'Poppins_700Bold' },
  section:           { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle:      { fontSize: 22, fontFamily: 'Poppins_700Bold', marginBottom: 12, letterSpacing: 0.35 },
  ticketCard:        { borderRadius: 12, marginBottom: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  ticketBanner:      { height: 70, justifyContent: 'center' },
  ticketBannerOverlay:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, backgroundColor: 'rgba(0,0,0,0.2)', flex: 1 },
  statusBadge:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText:        { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
  ticketBody:        { padding: 16 },
  ticketTitle:       { fontSize: 16, fontFamily: 'Poppins_700Bold', marginBottom: 8 },
  ticketMeta:        { flexDirection: 'row', gap: 16, marginBottom: 4 },
  ticketMetaItem:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  ticketMetaText:    { fontSize: 13, fontFamily: 'Poppins_400Regular' },
  ticketFooter:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  ticketDetails:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tierBadge:         { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tierText:          { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
  priorityBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  priorityText:      { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
  ticketQty:         { fontSize: 13, fontFamily: 'Poppins_500Medium' },
  ticketPrice:       { fontSize: 17, fontFamily: 'Poppins_700Bold' },
  codeRow:           { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, borderRadius: 10, padding: 10 },
  codeText:          { fontSize: 14, fontFamily: 'Poppins_600SemiBold', letterSpacing: 1 },
  actionRow:         { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  actionBtnText:     { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  cancelBtn:         { marginTop: 10, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  cancelBtnText:     { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  emptyState:        { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40, gap: 8 },
  emptyIcon:         { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle:        { fontSize: 18, fontFamily: 'Poppins_700Bold' },
  emptySub:          { fontSize: 14, fontFamily: 'Poppins_400Regular', textAlign: 'center' },
  browseBtn:         { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14, marginTop: 16 },
  browseBtnText:     { fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
});
