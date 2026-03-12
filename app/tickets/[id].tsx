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
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ticket } from '@shared/schema';
import { CultureTokens } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

const isWeb = Platform.OS === 'web';

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

const QR_CACHE_PREFIX = '@culturepass_ticket_qr:';

function cacheTicketQr(ticketId: string, qrCode: string) {
  AsyncStorage.setItem(`${QR_CACHE_PREFIX}${ticketId}`, qrCode).catch((err) => {
    if (__DEV__) console.warn('QR cache write failed:', err);
  });
}

async function getCachedTicketQr(ticketId: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(`${QR_CACHE_PREFIX}${ticketId}`);
  } catch {
    return null;
  }
}

export default function TicketDetailScreen() {
  const { id }      = useLocalSearchParams<{ id: string }>();
  const insets      = useSafeAreaInsets();
  const topInset    = isWeb ? 0 : insets.top;
  const bottomInset = isWeb ? 34 : insets.bottom;

  const [cachedQr, setCachedQr] = useState<string | null>(null);

  const { data: ticket, isLoading } = useQuery<Ticket>({
    queryKey: ['/api/ticket', id],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!id,
  });

  useEffect(() => {
    if (ticket?.qrCode && id) {
      cacheTicketQr(id as string, ticket.qrCode);
    }
  }, [ticket?.qrCode, id]);

  useEffect(() => {
    if (id) {
      getCachedTicketQr(id as string).then(setCachedQr);
    }
  }, [id]);

  const cancelMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const res = await apiRequest('POST', '/api/stripe/refund', { ticketId });
      return await res.json() as Record<string, unknown>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      if(!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
    const t = ticket as any;
    const hasPayment = !!t.stripePaymentIntentId;
    const title = hasPayment ? 'Cancel & Refund' : 'Cancel Ticket';
    const message = hasPayment
      ? `Are you sure you want to cancel your ticket for "${t.eventTitle}"? A refund will be processed to your card.`
      : `Are you sure you want to cancel your ticket for "${t.eventTitle}"?`;
    Alert.alert(title, message, [
      { text: 'Keep Ticket', style: 'cancel' },
      {
        text: hasPayment ? 'Cancel & Refund' : 'Cancel Ticket',
        style: 'destructive',
        onPress: () => {
          if(!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          cancelMutation.mutate(ticket.id);
        },
      },
    ]);
  }, [ticket, cancelMutation]);

  const handleShare = useCallback(async () => {
    if (!ticket) return;
    const t = ticket as any;
    try {
      const shareUrl = `https://culturepass.app/tickets/${ticket.id}`;
      await Share.share({
        title: t.eventTitle,
        message: `I'm going to ${t.eventTitle}! 🎫\n${t.eventVenue ? `📍 ${t.eventVenue}` : ''}\n${t.eventDate ? `📅 ${formatDate(t.eventDate)}` : ''}\n\nTicket Code: ${ticket.ticketCode || 'N/A'}\n\nGet yours on CulturePass!\n\n${shareUrl}`,
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
    const t = ticket as any;
    if(!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const walletName = walletType === 'apple' ? 'Apple Wallet' : 'Google Wallet';
    Alert.alert(`Add to ${walletName}`, `Your ticket for "${t.eventTitle}" will be added to ${walletName}.`, [
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
    <View style={[s.header, { zIndex: 10 }]}>
      <Pressable onPress={() => goBackOrReplace('/(tabs)')} style={({pressed}) => [s.backBtn, pressed && { transform: [{ scale: 0.95 }] }]}>
        <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
      </Pressable>
      <Text style={s.headerTitle}>Ticket Details</Text>
      <Pressable onPress={handleShare} style={({pressed}) => [s.backBtn, pressed && { transform: [{ scale: 0.95 }] }]}>
        <Ionicons name="share-outline" size={20} color="#FFFFFF" />
      </Pressable>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[s.container, { paddingTop: topInset }]}>
        {headerRow}
        <View style={s.loadingState}>
          <ActivityIndicator color={CultureTokens.indigo} size="large" />
          <Text style={s.loadingText}>Loading ticket...</Text>
        </View>
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={[s.container, { paddingTop: topInset }]}>
        {headerRow}
        <View style={s.loadingState}>
          <View style={s.emptyIconContainer}>
            <Ionicons name="ticket-outline" size={48} color="rgba(255,255,255,0.4)" />
          </View>
          <Text style={s.emptyTitle}>Ticket Not Found</Text>
          <Pressable onPress={() => goBackOrReplace('/(tabs)')}>
            <Text style={s.backLink}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const t = ticket as any;
  const ticketStatus = ticket.status as string | null;
  const statusInfo =
    ticketStatus === 'confirmed' ? { color: CultureTokens.teal,      bg: CultureTokens.teal + '20',      label: 'Confirmed',      icon: 'checkmark-circle' as const } :
    ticketStatus === 'pending'   ? { color: CultureTokens.saffron,      bg: CultureTokens.saffron + '20',      label: 'Payment Pending',icon: 'time'             as const } :
    ticketStatus === 'used'      ? { color: 'rgba(255,255,255,0.6)',bg: 'rgba(255,255,255,0.1)',label: 'Scanned',        icon: 'checkmark-done'   as const } :
    ticketStatus === 'cancelled' ? { color: CultureTokens.coral,        bg: CultureTokens.coral + '20',        label: 'Cancelled',      icon: 'close-circle'     as const } :
    ticketStatus === 'expired'   ? { color: CultureTokens.saffron,      bg: CultureTokens.saffron + '20',      label: 'Expired',        icon: 'time'             as const } :
                                   { color: 'rgba(255,255,255,0.6)', bg: 'rgba(255,255,255,0.1)',label: ticketStatus || 'Unknown', icon: 'help-circle' as const };

  const isActive  = ticket.status === 'confirmed';
  const isScanned = ticket.status === 'used';
  const bannerColor = t.imageColor || CultureTokens.indigo;

  return (
    <View style={[s.container, { paddingTop: topInset }]}>
      <LinearGradient 
        colors={['rgba(44, 42, 114, 0.15)', 'transparent']} 
        style={StyleSheet.absoluteFillObject} 
        pointerEvents="none" 
      />
      {headerRow}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 + bottomInset }}>
        {/* Ticket card */}
        <View style={s.ticketContainer}>
          <View style={[s.ticketTop, { backgroundColor: bannerColor }]}>
            <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.5)']} style={StyleSheet.absoluteFillObject} />
            <View style={s.ticketTopOverlay}>
              <View style={[s.statusBadge, { backgroundColor: statusInfo.bg, borderColor: statusInfo.color + '40', borderWidth: 1 }]}>
                <Ionicons name={statusInfo.icon} size={14} color={statusInfo.color} />
                <Text style={[s.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
              </View>
              <Ionicons name="ticket" size={32} color="rgba(255,255,255,0.8)" />
            </View>
          </View>

          {/* Tear notch */}
          <View style={s.ticketNotchContainer}>
             <View style={[s.ticketNotchBackground, { backgroundColor: '#0B0B14' }]} />
             <View style={s.ticketNotch}>
               <View style={[s.notchCircle, s.notchLeft]} />
               <View style={s.notchLine} />
               <View style={[s.notchCircle, s.notchRight]} />
             </View>
          </View>

          <View style={s.ticketBody}>
            <Text style={s.eventTitle}>{t.eventTitle}</Text>

            <View style={s.infoGrid}>
              {t.eventDate && (
                <View style={s.infoItem}>
                  <View style={[s.infoIconWrap, { backgroundColor: CultureTokens.indigo + '15' }]}>
                    <Ionicons name="calendar" size={16} color={CultureTokens.indigo} />
                  </View>
                  <View>
                    <Text style={s.infoLabel}>Date</Text>
                    <Text style={s.infoValue}>{formatDate(t.eventDate)}</Text>
                  </View>
                </View>
              )}
              {t.eventTime && (
                <View style={s.infoItem}>
                  <View style={[s.infoIconWrap, { backgroundColor: CultureTokens.saffron + '15' }]}>
                    <Ionicons name="time" size={16} color={CultureTokens.saffron} />
                  </View>
                  <View>
                    <Text style={s.infoLabel}>Time</Text>
                    <Text style={s.infoValue}>{t.eventTime}</Text>
                  </View>
                </View>
              )}
              {t.eventVenue && (
                <View style={s.infoItem}>
                  <View style={[s.infoIconWrap, { backgroundColor: CultureTokens.teal + '15' }]}>
                    <Ionicons name="location" size={16} color={CultureTokens.teal} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.infoLabel}>Venue</Text>
                    <Text style={s.infoValue} numberOfLines={2}>{t.eventVenue}</Text>
                  </View>
                </View>
              )}
            </View>

            <View style={s.divider} />

            <View style={s.detailsRow}>
              {ticket.tierName && (
                <View style={s.detailItem}>
                  <Text style={s.detailLabel}>Tier</Text>
                  <Text style={s.detailValue}>{ticket.tierName}</Text>
                </View>
              )}
              <View style={s.detailItem}>
                <Text style={s.detailLabel}>Quantity</Text>
                <Text style={s.detailValue}>{ticket.quantity || 1}</Text>
              </View>
              <View style={s.detailItem}>
                <Text style={s.detailLabel}>Total</Text>
                <Text style={[s.detailValue, { color: CultureTokens.indigo }]}>
                  ${((ticket.totalPriceCents || 0) / 100).toFixed(2)}
                </Text>
              </View>
            </View>

            {ticket.ticketCode && (
              <>
                <View style={s.divider} />
                <View style={s.qrSection}>
                  <Text style={s.qrTitle}> 
                    {isScanned ? 'Ticket Scanned' : isActive ? 'Scan at Entry' : 'Ticket Code'}
                  </Text>
                  {(ticket.qrCode || cachedQr) && isActive ? (
                    <View style={s.qrImageContainer}>
                       <Image source={{ uri: ticket.qrCode ?? cachedQr ?? '' }} style={s.qrImage} resizeMode="contain" />
                    </View>
                  ) : isScanned ? (
                    <View style={s.scannedOverlay}>
                      <Ionicons name="checkmark-circle" size={48} color="rgba(255,255,255,0.4)" />
                      <Text style={s.scannedText}>Checked In</Text>
                      {t.scannedAt && (
                        <Text style={s.scannedTime}> 
                          {new Date(t.scannedAt).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}
                        </Text>
                      )}
                    </View>
                  ) : null}
                  <Text style={s.ticketCodeText}>{ticket.ticketCode}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Add to wallet */}
        {isActive && (
          <View style={s.walletSection}>
            <Text style={s.walletTitle}>Add to Wallet</Text>
            <View style={s.walletButtons}>
              {(Platform.OS === 'ios' || isWeb) && (
                <Pressable 
                  style={({pressed}) => [s.walletBtn, { backgroundColor: '#111111', borderWidth: 1, borderColor: '#333' }, pressed && { opacity: 0.8 }]} 
                  onPress={() => handleAddToWallet('apple')}
                >
                  <Ionicons name="wallet" size={20} color="#FFF" />
                  <Text style={s.walletBtnText}>Apple Wallet</Text>
                </Pressable>
              )}
              <Pressable 
                style={({pressed}) => [s.walletBtn, { backgroundColor: '#4285F4' }, pressed && { opacity: 0.8 }]} 
                onPress={() => handleAddToWallet('google')}
              >
                <Ionicons name="logo-google" size={18} color="#FFF" />
                <Text style={s.walletBtnText}>Google Wallet</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Actions list */}
        <View style={s.actionsSection}>
          <Pressable
            style={({pressed}) => [s.actionBtn, pressed && { backgroundColor: 'rgba(255,255,255,0.02)' }]}
            onPress={() => router.push({ pathname: '/event/[id]', params: { id: ticket.eventId } })}
          >
            <View style={[s.actionIcon, { backgroundColor: CultureTokens.indigo + '15' }]}>
              <Ionicons name="calendar" size={18} color={CultureTokens.indigo} />
            </View>
            <Text style={s.actionText}>View Event</Text>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.4)" />
          </Pressable>

          <Pressable 
            style={({pressed}) => [s.actionBtn, pressed && { backgroundColor: 'rgba(255,255,255,0.02)' }]} 
            onPress={handleShare}
          >
            <View style={[s.actionIcon, { backgroundColor: CultureTokens.saffron + '15' }]}>
              <Ionicons name="share-outline" size={18} color={CultureTokens.saffron} />
            </View>
            <Text style={s.actionText}>Share Ticket</Text>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.4)" />
          </Pressable>

          {(isActive || isScanned) && (
            <Pressable 
               style={({pressed}) => [s.actionBtn, pressed && { backgroundColor: 'rgba(255,255,255,0.02)' }]} 
               onPress={handlePrint}
            >
              <View style={[s.actionIcon, { backgroundColor: CultureTokens.teal + '15' }]}>
                <Ionicons name="print-outline" size={18} color={CultureTokens.teal} />
              </View>
              <Text style={s.actionText}>Print Ticket / Badge</Text>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.4)" />
            </Pressable>
          )}

          {isActive && (
            <Pressable 
              style={({pressed}) => [s.actionBtn, { borderBottomWidth: 0 }, pressed && { backgroundColor: 'rgba(255,255,255,0.02)' }]} 
              onPress={handleCancel}
            >
              <View style={[s.actionIcon, { backgroundColor: CultureTokens.coral + '15' }]}>
                <Ionicons name="close-circle-outline" size={18} color={CultureTokens.coral} />
              </View>
              <Text style={[s.actionText, { color: CultureTokens.coral }]}>Cancel Ticket</Text>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.4)" />
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0B0B14' },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
  backBtn:         { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  headerTitle:     { fontSize: 17, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
  
  loadingState:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:        { fontSize: 15, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.6)' },
  emptyIconContainer: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center' },
  emptyTitle:         { fontSize: 18, fontFamily: 'Poppins_700Bold', marginTop: 8, color: '#FFFFFF' },
  backLink:           { fontSize: 15, fontFamily: 'Poppins_600SemiBold', marginTop: 8, color: CultureTokens.indigo },

  ticketContainer: { marginHorizontal: 20, marginTop: 12, borderRadius: 24, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  ticketTop:       { height: 120, justifyContent: 'center', position: 'relative' },
  ticketTopOverlay:{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, zIndex: 1 },
  statusBadge:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusText:      { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },

  ticketNotchContainer: { position: 'relative', height: 20, marginTop: -10, marginBottom: -10, zIndex: 2 },
  ticketNotchBackground: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, opacity: 0 },
  ticketNotch:  { flexDirection: 'row', alignItems: 'center', height: '100%' },
  notchCircle:  { width: 30, height: 30, borderRadius: 15, backgroundColor: '#0B0B14', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  notchLeft:    { marginLeft: -16 },
  notchRight:   { marginRight: -16 },
  notchLine:    { flex: 1, height: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', opacity: 0.5, marginHorizontal: 10 },

  ticketBody:   { padding: 24 },
  eventTitle:   { fontSize: 22, fontFamily: 'Poppins_700Bold', marginBottom: 20, color: '#FFFFFF' },
  infoGrid:     { gap: 16 },
  infoItem:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  infoLabel:    { fontSize: 11, fontFamily: 'Poppins_500Medium', textTransform: 'uppercase', letterSpacing: 0.5, color: 'rgba(255,255,255,0.6)' },
  infoValue:    { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
  divider:      { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 20 },
  detailsRow:   { flexDirection: 'row', justifyContent: 'space-between' },
  detailItem:   { alignItems: 'center', flex: 1 },
  detailLabel:  { fontSize: 11, fontFamily: 'Poppins_500Medium', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, color: 'rgba(255,255,255,0.6)' },
  detailValue:  { fontSize: 17, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },

  qrSection:        { alignItems: 'center', gap: 16 },
  qrTitle:          { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
  qrImageContainer: { padding: 16, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  qrImage:          { width: 220, height: 220 },
  scannedOverlay:   { alignItems: 'center', gap: 6, paddingVertical: 16 },
  scannedText:      { fontSize: 16, fontFamily: 'Poppins_700Bold', color: 'rgba(255,255,255,0.6)' },
  scannedTime:      { fontSize: 13, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.4)' },
  ticketCodeText:   { fontSize: 20, fontFamily: 'Poppins_700Bold', letterSpacing: 3, color: CultureTokens.indigo, marginTop: 4 },

  walletSection: { marginHorizontal: 20, marginTop: 24 },
  walletTitle:   { fontSize: 18, fontFamily: 'Poppins_700Bold', marginBottom: 16, color: '#FFFFFF' },
  walletButtons: { flexDirection: 'row', gap: 12 },
  walletBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14 },
  walletBtnText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: '#FFF' },

  actionsSection: { marginHorizontal: 20, marginTop: 24, borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  actionBtn:      { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  actionIcon:     { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionText:     { flex: 1, fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
});
