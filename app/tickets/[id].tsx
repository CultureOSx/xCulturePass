import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  Share,
  Image,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient, getQueryFn } from '@/lib/query-client';
import { useColors } from '@/hooks/useColors';
import { useCallback } from 'react';
import { Ticket } from '@shared/schema';

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts.map(Number);
    const date = new Date(y!, m! - 1, d);
    return date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function TicketDetailScreen() {
  const { id }      = useLocalSearchParams<{ id: string }>();
  const insets      = useSafeAreaInsets();
  const topInset    = Platform.OS === 'web' ? 0 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;
  const colors      = useColors();

  const { data: ticket, isLoading } = useQuery<Ticket>({
    queryKey: ['/api/ticket', id],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const res = await apiRequest('POST', '/api/stripe/refund', { ticketId });
      return await res.json() as Record<string, unknown>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const msg = data.refundId
        ? 'Your ticket has been cancelled and a refund has been initiated to your card.'
        : 'Your ticket has been cancelled.';
      Alert.alert('Ticket Cancelled', msg);
    },
    onError: (error: Error) => {
      Alert.alert('Refund Failed', error.message || 'Could not process the refund. Please try again.');
    },
  });

  const handleCancel = useCallback(() => {
    if (!ticket) return;
    const hasPayment = !!(ticket as unknown as Record<string, unknown>).stripePaymentIntentId;
    const title = hasPayment ? 'Cancel & Refund' : 'Cancel Ticket';
    const message = hasPayment
      ? `Are you sure you want to cancel your ticket for "${ticket.eventTitle}"? A refund will be processed to your card.`
      : `Are you sure you want to cancel your ticket for "${ticket.eventTitle}"?`;
    Alert.alert(title, message, [
      { text: 'Keep Ticket', style: 'cancel' },
      {
        text: hasPayment ? 'Cancel & Refund' : 'Cancel Ticket',
        style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          cancelMutation.mutate(ticket.id);
        },
      },
    ]);
  }, [ticket, cancelMutation]);

  const handleShare = useCallback(async () => {
    if (!ticket) return;
    try {
      const shareUrl = `https://culturepass.app/tickets/${ticket.id}`;
      await Share.share({
        title: ticket.eventTitle,
        message: `I'm going to ${ticket.eventTitle}! 🎫\n${ticket.eventVenue ? `📍 ${ticket.eventVenue}` : ''}\n${ticket.eventDate ? `📅 ${formatDate(ticket.eventDate)}` : ''}\n\nTicket Code: ${ticket.ticketCode || 'N/A'}\n\nGet yours on CulturePass!\n\n${shareUrl}`,
        url: shareUrl,
      });
    } catch {}
  }, [ticket]);

  const handlePrint = useCallback(() => {
    if (!ticket) return;
    router.push({
      pathname: '/tickets/print/[id]',
      params: { id: ticket.id, layout: ticket.status === 'used' ? 'badge' : 'full', autoPrint: '1' },
    });
  }, [ticket]);

  const handleAddToWallet = useCallback(async (walletType: 'apple' | 'google') => {
    if (!ticket) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const walletName = walletType === 'apple' ? 'Apple Wallet' : 'Google Wallet';
    Alert.alert(`Add to ${walletName}`, `Your ticket for "${ticket.eventTitle}" will be added to ${walletName}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Add',
        onPress: async () => {
          try {
            const endpoint = walletType === 'apple'
              ? `/api/tickets/${ticket.id}/wallet/apple`
              : `/api/tickets/${ticket.id}/wallet/google`;
            const res  = await apiRequest('GET', endpoint);
            const data = await res.json() as { url?: string };
            if (data.url) { await Linking.openURL(data.url); }
            else { Alert.alert('Success', `Ticket added to ${walletName}!`); }
          } catch {
            Alert.alert('Error', `Could not add to ${walletName}. Please try again.`);
          }
        },
      },
    ]);
  }, [ticket]);

  const headerRow = (
    <View style={s.header}>
      <Pressable onPress={() => goBackOrReplace('/(tabs)')} style={[s.backBtn, { backgroundColor: colors.surface }]}>
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>
      <Text style={[s.headerTitle, { color: colors.text }]}>Ticket Details</Text>
      <Pressable onPress={handleShare} style={[s.backBtn, { backgroundColor: colors.surface }]}>
        <Ionicons name="share-outline" size={20} color={colors.text} />
      </Pressable>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[s.container, { paddingTop: topInset, backgroundColor: colors.background }]}>
        {headerRow}
        <View style={s.loadingState}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[s.loadingText, { color: colors.textSecondary }]}>Loading ticket...</Text>
        </View>
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={[s.container, { paddingTop: topInset, backgroundColor: colors.background }]}>
        {headerRow}
        <View style={s.loadingState}>
          <Ionicons name="ticket-outline" size={48} color={colors.textSecondary} />
          <Text style={[s.emptyTitle, { color: colors.text }]}>Ticket Not Found</Text>
          <Pressable onPress={() => goBackOrReplace('/(tabs)')}>
            <Text style={[s.backLink, { color: colors.primary }]}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const ticketStatus = ticket.status as string | null;
  const statusInfo =
    ticketStatus === 'confirmed' ? { color: colors.success,      bg: colors.success + '12',      label: 'Confirmed',      icon: 'checkmark-circle' as const } :
    ticketStatus === 'pending'   ? { color: colors.warning,      bg: colors.warning + '12',      label: 'Payment Pending',icon: 'time'             as const } :
    ticketStatus === 'used'      ? { color: colors.textSecondary,bg: colors.textSecondary + '12',label: 'Scanned',        icon: 'checkmark-done'   as const } :
    ticketStatus === 'cancelled' ? { color: colors.error,        bg: colors.error + '12',        label: 'Cancelled',      icon: 'close-circle'     as const } :
    ticketStatus === 'expired'   ? { color: colors.warning,      bg: colors.warning + '12',      label: 'Expired',        icon: 'time'             as const } :
                                   { color: colors.textSecondary, bg: colors.textSecondary + '12',label: ticketStatus || 'Unknown', icon: 'help-circle' as const };

  const isActive  = ticket.status === 'confirmed';
  const isScanned = ticket.status === 'used';

  return (
    <View style={[s.container, { paddingTop: topInset, backgroundColor: colors.background }]}>
      {headerRow}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 + bottomInset }}>
        {/* Ticket card */}
        <View style={[s.ticketContainer, { backgroundColor: colors.surface }]}>
          <View style={[s.ticketTop, { backgroundColor: ticket.imageColor || colors.primary }]}>
            <View style={s.ticketTopOverlay}>
              <View style={[s.statusBadge, { backgroundColor: statusInfo.bg }]}>
                <Ionicons name={statusInfo.icon} size={14} color={statusInfo.color} />
                <Text style={[s.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
              </View>
              <Ionicons name="ticket" size={32} color="rgba(255,255,255,0.5)" />
            </View>
          </View>

          {/* Tear notch */}
          <View style={s.ticketNotch}>
            <View style={[s.notchCircle, s.notchLeft, { backgroundColor: colors.background }]} />
            <View style={[s.notchLine, { borderColor: colors.borderLight }]} />
            <View style={[s.notchCircle, s.notchRight, { backgroundColor: colors.background }]} />
          </View>

          <View style={s.ticketBody}>
            <Text style={[s.eventTitle, { color: colors.text }]}>{ticket.eventTitle}</Text>

            <View style={s.infoGrid}>
              {ticket.eventDate && (
                <View style={s.infoItem}>
                  <Ionicons name="calendar" size={16} color={colors.primary} />
                  <View>
                    <Text style={[s.infoLabel, { color: colors.textSecondary }]}>Date</Text>
                    <Text style={[s.infoValue, { color: colors.text }]}>{formatDate(ticket.eventDate)}</Text>
                  </View>
                </View>
              )}
              {ticket.eventTime && (
                <View style={s.infoItem}>
                  <Ionicons name="time" size={16} color={colors.secondary} />
                  <View>
                    <Text style={[s.infoLabel, { color: colors.textSecondary }]}>Time</Text>
                    <Text style={[s.infoValue, { color: colors.text }]}>{ticket.eventTime}</Text>
                  </View>
                </View>
              )}
              {ticket.eventVenue && (
                <View style={s.infoItem}>
                  <Ionicons name="location" size={16} color={colors.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.infoLabel, { color: colors.textSecondary }]}>Venue</Text>
                    <Text style={[s.infoValue, { color: colors.text }]} numberOfLines={2}>{ticket.eventVenue}</Text>
                  </View>
                </View>
              )}
            </View>

            <View style={[s.divider, { backgroundColor: colors.borderLight }]} />

            <View style={s.detailsRow}>
              {ticket.tierName && (
                <View style={s.detailItem}>
                  <Text style={[s.detailLabel, { color: colors.textSecondary }]}>Tier</Text>
                  <Text style={[s.detailValue, { color: colors.text }]}>{ticket.tierName}</Text>
                </View>
              )}
              <View style={s.detailItem}>
                <Text style={[s.detailLabel, { color: colors.textSecondary }]}>Quantity</Text>
                <Text style={[s.detailValue, { color: colors.text }]}>{ticket.quantity || 1}</Text>
              </View>
              <View style={s.detailItem}>
                <Text style={[s.detailLabel, { color: colors.textSecondary }]}>Total</Text>
                <Text style={[s.detailValue, { color: colors.primary }]}>
                  ${((ticket.totalPriceCents || 0) / 100).toFixed(2)}
                </Text>
              </View>
            </View>

            {ticket.ticketCode && (
              <>
                <View style={[s.divider, { backgroundColor: colors.borderLight }]} />
                <View style={s.qrSection}>
                  <Text style={[s.qrTitle, { color: colors.text }]}> 
                    {isScanned ? 'Ticket Scanned' : isActive ? 'Scan at Entry' : 'Ticket Code'}
                  </Text>
                  {ticket.qrCode && isActive ? (
                    <View style={[s.qrImageContainer, { borderColor: colors.borderLight }]}>
                      <Image source={{ uri: ticket.qrCode }} style={s.qrImage} resizeMode="contain" />
                    </View>
                  ) : isScanned ? (
                    <View style={s.scannedOverlay}>
                      <Ionicons name="checkmark-circle" size={48} color={colors.textSecondary} />
                      <Text style={[s.scannedText, { color: colors.textSecondary }]}>Checked In</Text>
                      {ticket.scannedAt && (
                        <Text style={[s.scannedTime, { color: colors.textSecondary }]}> 
                          {new Date(ticket.scannedAt).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}
                        </Text>
                      )}
                    </View>
                  ) : null}
                  <Text style={[s.ticketCode, { color: colors.primary }]}>{ticket.ticketCode}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Add to wallet */}
        {isActive && (
          <View style={s.walletSection}>
            <Text style={[s.walletTitle, { color: colors.text }]}>Add to Wallet</Text>
            <View style={s.walletButtons}>
              {(Platform.OS === 'ios' || Platform.OS === 'web') && (
                <Pressable style={[s.walletBtn, { backgroundColor: '#000' }]} onPress={() => handleAddToWallet('apple')}>
                  <Ionicons name="wallet" size={20} color="#FFF" />
                  <Text style={s.walletBtnText}>Apple Wallet</Text>
                </Pressable>
              )}
              <Pressable style={[s.walletBtn, { backgroundColor: '#4285F4' }]} onPress={() => handleAddToWallet('google')}>
                <Ionicons name="logo-google" size={18} color="#FFF" />
                <Text style={s.walletBtnText}>Google Wallet</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Actions list */}
        <View style={[s.actionsSection, { backgroundColor: colors.surface }]}>
          <Pressable
            style={[s.actionBtn, { borderBottomColor: colors.borderLight }]}
            onPress={() => router.push({ pathname: '/event/[id]', params: { id: ticket.eventId } })}
          >
            <View style={[s.actionIcon, { backgroundColor: colors.primaryGlow }]}>
              <Ionicons name="calendar" size={18} color={colors.primary} />
            </View>
            <Text style={[s.actionText, { color: colors.text }]}>View Event</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>

          <Pressable style={[s.actionBtn, { borderBottomColor: colors.borderLight }]} onPress={handleShare}>
            <View style={[s.actionIcon, { backgroundColor: colors.secondary + '12' }]}>
              <Ionicons name="share-outline" size={18} color={colors.secondary} />
            </View>
            <Text style={[s.actionText, { color: colors.text }]}>Share Ticket</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>

          {(isActive || isScanned) && (
            <Pressable style={[s.actionBtn, { borderBottomColor: colors.borderLight }]} onPress={handlePrint}>
              <View style={[s.actionIcon, { backgroundColor: colors.warning + '12' }]}>
                <Ionicons name="print-outline" size={18} color={colors.warning} />
              </View>
              <Text style={[s.actionText, { color: colors.warning }]}>Print Ticket / Badge</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>
          )}

          {isActive && (
            <Pressable style={[s.actionBtn, { borderBottomWidth: 0 }]} onPress={handleCancel}>
              <View style={[s.actionIcon, { backgroundColor: colors.error + '12' }]}>
                <Ionicons name="close-circle-outline" size={18} color={colors.error} />
              </View>
              <Text style={[s.actionText, { color: colors.error }]}>Cancel Ticket</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1 },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
  backBtn:         { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle:     { fontSize: 17, fontFamily: 'Poppins_600SemiBold' },
  loadingState:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:     { fontSize: 15, fontFamily: 'Poppins_500Medium' },
  emptyTitle:      { fontSize: 18, fontFamily: 'Poppins_700Bold', marginTop: 8 },
  backLink:        { fontSize: 15, fontFamily: 'Poppins_600SemiBold', marginTop: 8 },

  ticketContainer: { marginHorizontal: 20, marginTop: 12, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 6 },
  ticketTop:       { height: 100, justifyContent: 'center' },
  ticketTopOverlay:{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, backgroundColor: 'rgba(0,0,0,0.15)' },
  statusBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusText:      { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },

  ticketNotch:  { flexDirection: 'row', alignItems: 'center', marginTop: -10, marginBottom: -10, zIndex: 2 },
  notchCircle:  { width: 20, height: 20, borderRadius: 10 },
  notchLeft:    { marginLeft: -10 },
  notchRight:   { marginRight: -10 },
  notchLine:    { flex: 1, height: 1, borderStyle: 'dashed', borderWidth: 1 },

  ticketBody:   { padding: 20 },
  eventTitle:   { fontSize: 20, fontFamily: 'Poppins_700Bold', marginBottom: 16 },
  infoGrid:     { gap: 14 },
  infoItem:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoLabel:    { fontSize: 11, fontFamily: 'Poppins_500Medium', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue:    { fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
  divider:      { height: StyleSheet.hairlineWidth, marginVertical: 16 },
  detailsRow:   { flexDirection: 'row', justifyContent: 'space-between' },
  detailItem:   { alignItems: 'center', flex: 1 },
  detailLabel:  { fontSize: 11, fontFamily: 'Poppins_500Medium', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  detailValue:  { fontSize: 17, fontFamily: 'Poppins_700Bold' },

  qrSection:        { alignItems: 'center', gap: 12 },
  qrTitle:          { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  qrImageContainer: { padding: 12, backgroundColor: '#FFF', borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  qrImage:          { width: 200, height: 200 },
  scannedOverlay:   { alignItems: 'center', gap: 6, paddingVertical: 16 },
  scannedText:      { fontSize: 16, fontFamily: 'Poppins_700Bold' },
  scannedTime:      { fontSize: 13, fontFamily: 'Poppins_400Regular' },
  ticketCode:       { fontSize: 18, fontFamily: 'Poppins_700Bold', letterSpacing: 2 },

  walletSection: { marginHorizontal: 20, marginTop: 20 },
  walletTitle:   { fontSize: 17, fontFamily: 'Poppins_700Bold', marginBottom: 12 },
  walletButtons: { flexDirection: 'row', gap: 10 },
  walletBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 14 },
  walletBtnText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: '#FFF' },

  actionsSection: { marginHorizontal: 20, marginTop: 20, borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  actionBtn:      { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  actionIcon:     { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionText:     { flex: 1, fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
});
