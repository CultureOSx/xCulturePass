import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Alert, Share, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/query-client';
import { useAuth } from '@/lib/auth';
import { AuthGuard } from '@/components/AuthGuard';
import { CultureTokens } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

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
  onCancel: (t: Ticket) => void;
}

function TicketCard({ ticket, onCancel }: RenderTicketProps) {
  const isActive = ticket.status === 'confirmed';

  const statusStyle =
    ticket.status === 'confirmed' ? { bg: CultureTokens.teal + '20', color: CultureTokens.teal,       label: 'Confirmed' } :
    ticket.status === 'used'      ? { bg: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', label: 'Scanned' } :
    ticket.status === 'cancelled' ? { bg: CultureTokens.coral + '20',   color: CultureTokens.coral,          label: 'Cancelled' } :
    ticket.status === 'expired'   ? { bg: CultureTokens.saffron + '20', color: CultureTokens.saffron,        label: 'Expired'   } :
                                    { bg: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', label: ticket.status || 'Unknown' };

  const priorityStyle =
    ticket.priority === 'vip'  ? { bg: CultureTokens.saffron + '20', color: CultureTokens.saffron,     label: 'VIP'    } :
    ticket.priority === 'high' ? { bg: CultureTokens.coral + '20',   color: CultureTokens.coral,       label: 'High'   } :
    ticket.priority === 'low'  ? { bg: CultureTokens.teal + '20', color: CultureTokens.teal,     label: 'Low'    } :
                                  { bg: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', label: 'Normal' };

  const bannerColor = ticket.imageColor || CultureTokens.indigo;

  return (
    <Pressable
      style={({pressed}) => [s.ticketCard, pressed && { transform: [{ scale: 0.98 }] }]}
      onPress={() => {
        if(Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: '/tickets/[id]', params: { id: ticket.id } });
      }}
    >
      <View style={[s.ticketBanner, { backgroundColor: bannerColor }]}>
        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.4)']} style={StyleSheet.absoluteFillObject} />
        <View style={s.ticketBannerOverlay}>
          <View style={[s.statusBadge, { backgroundColor: statusStyle.bg, borderWidth: 1, borderColor: statusStyle.color + '40' }]}>
            <Text style={[s.statusText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
          </View>
          <Ionicons name="ticket" size={28} color="rgba(255,255,255,0.8)" />
        </View>
      </View>

      <View style={s.ticketBody}>
        <Text style={s.ticketTitle} numberOfLines={2}>{ticket.eventTitle}</Text>

        <View style={s.ticketMeta}>
          {ticket.eventDate && (
            <View style={s.ticketMetaItem}>
              <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.6)" />
              <Text style={s.ticketMetaText}>{formatDate(ticket.eventDate)}</Text>
            </View>
          )}
          {ticket.eventTime && (
            <View style={s.ticketMetaItem}>
              <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.6)" />
              <Text style={s.ticketMetaText}>{ticket.eventTime}</Text>
            </View>
          )}
        </View>

        {ticket.eventVenue && (
          <View style={[s.ticketMetaItem, { marginBottom: 16 }]}>
            <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.6)" />
            <Text style={s.ticketMetaText} numberOfLines={1}>{ticket.eventVenue}</Text>
          </View>
        )}

        <View style={s.ticketFooter}>
          <View style={s.ticketDetails}>
            {ticket.tierName && (
              <View style={[s.tierBadge, { backgroundColor: CultureTokens.indigo + '20', borderWidth: 1, borderColor: CultureTokens.indigo + '40' }]}>
                <Text style={s.tierText}>{ticket.tierName}</Text>
              </View>
            )}
            <View style={[s.priorityBadge, { backgroundColor: priorityStyle.bg }]}>
              <Text style={[s.priorityText, { color: priorityStyle.color }]}>{priorityStyle.label}</Text>
            </View>
            <Text style={s.ticketQty}>
              {ticket.quantity || 1}x ticket{(ticket.quantity || 1) > 1 ? 's' : ''}
            </Text>
          </View>
          <Text style={s.ticketPrice}>${((ticket.totalPriceCents || 0) / 100).toFixed(2)}</Text>
        </View>

        {ticket.ticketCode && isActive && (
          <View style={s.codeRow}>
            <Ionicons name="qr-code" size={16} color="#FFFFFF" />
            <Text style={s.codeText}>{ticket.ticketCode}</Text>
          </View>
        )}

        {isActive && (
          <View style={s.actionRow}>
            {[
              { icon: 'share-outline', label: 'Share',  onPress: () => handleShare(ticket) },
              { icon: 'wallet-outline',label: 'Wallet', onPress: () => { if(Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Alert.alert('Added to Wallet', `Your ticket for "${ticket.eventTitle}" has been saved to your wallet.`); } },
              { icon: 'print-outline', label: 'Print',  onPress: () => router.push({ pathname: '/tickets/print/[id]', params: { id: ticket.id, layout: 'full', autoPrint: '1' } }) },
            ].map(btn => (
              <Pressable
                key={btn.label}
                style={({pressed}) => [s.actionBtn, pressed && { opacity: 0.7 }]}
                onPress={(e) => { e.stopPropagation?.(); btn.onPress(); }}
              >
                <Ionicons name={btn.icon as never} size={18} color="#FFFFFF" />
                <Text style={s.actionBtnText}>{btn.label}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {isActive && (
          <Pressable
            style={({pressed}) => [s.cancelBtn, pressed && { opacity: 0.7 }]}
            onPress={(e) => { e.stopPropagation?.(); onCancel(ticket); }}
          >
            <Text style={s.cancelBtnText}>Cancel Ticket</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

export default function TicketsScreen() {
  const insets  = useSafeAreaInsets();
  const webTop  = 0;
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
        if(Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        cancelMutation.mutate(ticket.id);
      }},
    ]);
  };

  const activeTickets = tickets.filter(t => t.status === 'confirmed');
  const pastTickets   = tickets.filter(t => t.status !== 'confirmed');

  return (
    <AuthGuard icon="ticket-outline" title="My Tickets" message="Sign in to view and manage your event tickets.">
      <View style={[s.container, { paddingTop: insets.top + webTop }]}>
        <LinearGradient 
          colors={['rgba(44, 42, 114, 0.15)', 'transparent']} 
          style={StyleSheet.absoluteFillObject} 
          pointerEvents="none" 
        />
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={({pressed}) => [s.backBtn, pressed && { transform: [{ scale: 0.95 }] }]}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={s.headerTitle}>My Tickets</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 + (Platform.OS === 'web' ? 34 : insets.bottom), paddingTop: 10 }}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={s.emptyState}>
              <ActivityIndicator color={CultureTokens.indigo} size="large" />
            </View>
          ) : tickets.length === 0 ? (
            <View style={s.emptyState}>
              <View style={s.emptyIcon}>
                <Ionicons name="ticket-outline" size={48} color="rgba(255,255,255,0.4)" />
              </View>
              <Text style={s.emptyTitle}>No Tickets Yet</Text>
              <Text style={s.emptySub}>Your purchased event tickets will appear here</Text>
              <Pressable
                style={({pressed}) => [s.browseBtn, pressed && { transform: [{ scale: 0.98 }] }]}
                onPress={() => router.push('/(tabs)')}
              >
                <Ionicons name="search" size={18} color="#FFFFFF" />
                <Text style={s.browseBtnText}>Browse Events</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {activeTickets.length > 0 && (
                <View style={s.section}>
                  <Text style={s.sectionTitle}>Upcoming ({activeTickets.length})</Text>
                  {activeTickets.map(t => <TicketCard key={t.id} ticket={t} onCancel={handleCancel} />)}
                </View>
              )}
              {pastTickets.length > 0 && (
                <View style={s.section}>
                  <Text style={s.sectionTitle}>Past Tickets ({pastTickets.length})</Text>
                  {pastTickets.map(t => <TicketCard key={t.id} ticket={t} onCancel={handleCancel} />)}
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
  container:         { flex: 1, backgroundColor: '#0B0B14' },
  header:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn:           { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  headerTitle:       { fontSize: 18, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  section:           { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle:      { fontSize: 20, fontFamily: 'Poppins_700Bold', marginBottom: 12, letterSpacing: 0.35, color: '#FFFFFF' },
  
  ticketCard:        { borderRadius: 20, marginBottom: 16, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  ticketBanner:      { height: 80, justifyContent: 'center', position: 'relative' },
  ticketBannerOverlay: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, flex: 1, zIndex: 1 },
  statusBadge:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText:        { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
  ticketBody:        { padding: 16 },
  ticketTitle:       { fontSize: 18, fontFamily: 'Poppins_700Bold', marginBottom: 8, color: '#FFFFFF' },
  ticketMeta:        { flexDirection: 'row', gap: 16, marginBottom: 6 },
  ticketMetaItem:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ticketMetaText:    { fontSize: 13, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.6)' },
  ticketFooter:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  ticketDetails:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tierBadge:         { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tierText:          { fontSize: 11, fontFamily: 'Poppins_600SemiBold', color: '#A5B4FC' },
  priorityBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  priorityText:      { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
  ticketQty:         { fontSize: 13, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.6)' },
  ticketPrice:       { fontSize: 18, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  
  codeRow:           { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, borderRadius: 12, padding: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center' },
  codeText:          { fontSize: 15, fontFamily: 'Poppins_600SemiBold', letterSpacing: 2, color: '#FFFFFF' },
  
  actionRow:         { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  actionBtnText:     { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
  cancelBtn:         { marginTop: 12, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255, 94, 91, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 94, 91, 0.2)' },
  cancelBtnText:     { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: CultureTokens.coral },
  
  emptyState:        { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40, gap: 12 },
  emptyIcon:         { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 4, backgroundColor: 'rgba(255,255,255,0.03)' },
  emptyTitle:        { fontSize: 20, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  emptySub:          { fontSize: 15, fontFamily: 'Poppins_400Regular', textAlign: 'center', color: 'rgba(255,255,255,0.6)' },
  browseBtn:         { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 16, marginTop: 16, backgroundColor: CultureTokens.indigo },
  browseBtnText:     { fontSize: 15, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
});
