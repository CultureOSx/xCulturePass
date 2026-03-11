import {
  View, Text, Pressable, ScrollView, Platform, Share, Image, Modal, Alert,
  ActivityIndicator, Linking, StyleSheet, useWindowDimensions
} from 'react-native';
import { router, useLocalSearchParams, usePathname } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSaved } from '@/contexts/SavedContext';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/query-client';
import * as WebBrowser from 'expo-web-browser';
import { confirmAndReport } from '@/lib/reporting';
import { api } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAuth } from '@/lib/auth';
import { useColors } from '@/hooks/useColors';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { calculateDistance, getPostcodesByPlace } from '@shared/location/australian-postcodes';
import * as Location from 'expo-location';
import { CultureTokens } from '@/constants/theme';

const isWeb = Platform.OS === 'web';

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}


function cityToCoordinates(city?: string): { latitude: number; longitude: number } | null {
  if (!city) return null;
  const match = getPostcodesByPlace(city)[0];
  if (!match) return null;
  return { latitude: match.latitude, longitude: match.longitude };
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const colors = useColors();

  const { data: event, isLoading } = useQuery({
    queryKey: ['/api/events', id],
    queryFn: () => api.events.get(String(id)),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={CultureTokens.indigo} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[s.emptyContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="calendar-outline" size={64} color={colors.textTertiary} />
        <Text style={[s.errorText, { color: colors.text }]}>Event not found</Text>
        <Text style={[s.errorDesc, { color: colors.textSecondary }]}>This event may have been removed or is currently unavailable.</Text>
        <Pressable onPress={() => goBackOrReplace('/(tabs)')} style={[s.backActionBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <Text style={[s.backActionText, { color: colors.text }]}>Return Home</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <EventDetail event={event} colors={colors} insets={insets} />
    </ErrorBoundary>
  );
}

function EventDetail({ event, colors, insets }: any) {
  const { isEventSaved, toggleSaveEvent } = useSaved();
  const { state } = useOnboarding();
  const { userId } = useAuth();
  const saved = isEventSaved(event.id);
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const topInset = isWeb ? 0 : insets.top;
  const bottomInset = isWeb ? 34 : insets.bottom;

  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    let isMounted = true;
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') return;
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then(position => {
        if (isMounted) setGpsCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      }).catch(() => { if (isMounted) setGpsCoords(null); });
    }).catch(() => { if (isMounted) setGpsCoords(null); });
    return () => { isMounted = false; };
  }, []);

  const distanceKm = useMemo(() => {
    const to = cityToCoordinates(event.city);
    if (!to) return null;
    if (gpsCoords) return calculateDistance(gpsCoords.latitude, gpsCoords.longitude, to.latitude, to.longitude);
    const fallbackFrom = cityToCoordinates(state.city);
    if (!fallbackFrom) return null;
    return calculateDistance(fallbackFrom.latitude, fallbackFrom.longitude, to.latitude, to.longitude);
  }, [gpsCoords, state.city, event.city]);

  const [now, setNow] = useState(() => new Date());
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [selectedTierIndex, setSelectedTierIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [buyMode, setBuyMode] = useState<"single" | "family" | "group">("single");

  const { data: membership } = useQuery<{ tier: string; cashbackMultiplier?: number; }>({
    queryKey: [`/api/membership/${userId}`],
    queryFn: () => api.membership.get(userId!),
    enabled: !!userId,
  });
  const isPlus = membership?.tier === "plus";

  const [paymentLoading, setPaymentLoading] = useState(false);

  const purchaseMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/stripe/create-checkout-session", { ticketData: body });
      return await res.json();
    },
    onSuccess: async (data: any) => {
      if (data.checkoutUrl) {
        setPaymentLoading(true);
        setTicketModalVisible(false);
        try {
          const result = await WebBrowser.openBrowserAsync(data.checkoutUrl, { dismissButtonStyle: "cancel", presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN });
          queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
          if (result.type === "cancel" || result.type === "dismiss") {
            const ticketRes = await apiRequest("GET", `/api/ticket/${data.ticketId}`);
            const ticket = await ticketRes.json();
            if (ticket.paymentStatus === "paid" || ticket.status === "confirmed") {
              if(!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Ticket Purchased!", "Your payment was successful.", [
                { text: "View Ticket", onPress: () => router.push(`/tickets/${data.ticketId}` as never) },
                { text: "OK" },
              ]);
            }
          }
        } catch {
          Alert.alert("Payment Error", "Could not open payment page. Please try again.");
        } finally {
          setPaymentLoading(false);
        }
      }
    },
    onError: (error: Error) => Alert.alert("Purchase Failed", error.message),
  });

  const selectedTier = useMemo(() => event.tiers?.[selectedTierIndex] || { priceCents: 0, available: 0, name: 'Standard' }, [event.tiers, selectedTierIndex]);
  const maxQty = buyMode === "family" ? 1 : Math.min(20, selectedTier?.available ?? 1);
  const familySize = 4;
  const familyDiscount = 0.1;
  const groupDiscount = quantity >= 10 ? 0.15 : quantity >= 5 ? 0.1 : 0;
  const basePrice = selectedTier?.priceCents ?? 0;

  const rawTotal = buyMode === "family" ? basePrice * familySize : basePrice * quantity;
  const discountRate = buyMode === "family" ? familyDiscount : buyMode === "group" ? groupDiscount : 0;
  const discountAmount = rawTotal * discountRate;
  const totalPrice = rawTotal - discountAmount;
  const effectiveQty = buyMode === "family" ? familySize : quantity;
  const purchaseFreeTicket = useCallback(async (body: Record<string, unknown>) => {
    try {
      const res = await apiRequest("POST", "/api/tickets", body);
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      setTicketModalVisible(false);
      if(!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Ticket Confirmed!", "Your free ticket has been reserved.", [
        { text: "View Ticket", onPress: () => router.push(`/tickets/${data.id}` as never) },
        { text: "OK" },
      ]);
    } catch {
      Alert.alert("Error", "Failed to reserve ticket. Please try again.");
    }
  }, []);

  const handlePurchase = useCallback(() => {
    if (!userId) {
      Alert.alert("Login required", "Please sign in to complete ticket purchase.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign in", onPress: () => router.push({ pathname: '/(onboarding)/login', params: { redirectTo: pathname } } as never) },
      ]);
      return;
    }
    const ticketLabel = buyMode === "family" ? `${selectedTier.name} (Family Pack)` : buyMode === "group" ? `${selectedTier.name} (Group)` : selectedTier.name;
    const body = {
      userId, eventId: event.id, eventTitle: event.title, eventDate: event.date, eventTime: event.time,
      eventVenue: event.venue, tierName: ticketLabel, quantity: effectiveQty, totalPriceCents: totalPrice,
      currency: "AUD", imageColor: (event as any).imageColor ?? CultureTokens.indigo,
    };
    if (totalPrice <= 0) { purchaseFreeTicket(body); return; }
    purchaseMutation.mutate(body);
  }, [userId, event, selectedTier, totalPrice, effectiveQty, buyMode, pathname, purchaseMutation, purchaseFreeTicket]);

  const openTicketModal = useCallback((tierIdx?: number) => {
    setSelectedTierIndex(tierIdx ?? 0);
    setQuantity(1);
    setBuyMode("single");
    setTicketModalVisible(true);
    if(!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const countdown = useMemo(() => {
    const [year, month, day] = event.date.split("-").map(Number);
    if (!year || !month || !day) return null;
    const eventDate = new Date(year, month - 1, day);
    const timeParts = event.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (timeParts) {
      let hours = parseInt(timeParts[1], 10);
      const mins = parseInt(timeParts[2], 10);
      const ampm = timeParts[3].toUpperCase();
      if (ampm === "PM" && hours !== 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
      eventDate.setHours(hours, mins, 0, 0);
    }
    const diff = eventDate.getTime() - now.getTime();
    if (diff <= 0) return { ended: true as const, days: 0, hours: 0, minutes: 0 };
    return {
      ended: false as const,
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000)
    };
  }, [event.date, event.time, now]);

  const capacityPercent = useMemo(() => event.capacity > 0 ? Math.min(100, Math.round((event.attending / event.capacity) * 100)) : 0, [event.attending, event.capacity]);


  const handleShare = useCallback(async () => {
    try {
      const shareUrl = `https://culturepass.app/event/${event.id}`;
      await Share.share({ title: `${event.title} on CulturePass`, message: `Check out ${event.title} on CulturePass! ${event.venue} - ${formatDate(event.date)}\n\n${shareUrl}`, url: shareUrl });
    } catch {}
  }, [event.id, event.title, event.venue, event.date]);

  const handleSave = useCallback(() => {
    if(!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleSaveEvent(event.id);
  }, [event.id, toggleSaveEvent]);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[isDesktop && s.desktopShellWrapper]}>
        <View style={[isDesktop && s.desktopShell]}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset + 120 }}>
            {/* Hero Image Block */}
            <View style={s.heroWrapper}>
              <View style={[s.heroSection, { height: isDesktop ? 400 : 360 + topInset }, isDesktop && { borderRadius: 24, marginHorizontal: 20, marginTop: 20, overflow: 'hidden' }]}>
                <Image source={{ uri: event.imageUrl }} style={StyleSheet.absoluteFillObject} />
                <LinearGradient colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.4)", "rgba(11,11,20,1)"]} locations={[0, 0.4, 1]} style={[StyleSheet.absoluteFillObject, { paddingTop: topInset }]} >
                  
                  {/* Nav */}
                  <View style={s.heroNav}>
                    <Pressable style={({pressed}) => [s.navBtn, { transform: [{ scale: pressed ? 0.9 : 1 }] }]} onPress={() => goBackOrReplace("/(tabs)")}>
                      <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                    </Pressable>
                    <View style={s.heroActions}>
                      <Pressable style={({pressed}) => [s.navBtn, { transform: [{ scale: pressed ? 0.9 : 1 }] }]} onPress={handleShare}>
                        <Ionicons name="share-outline" size={22} color="#FFFFFF" />
                      </Pressable>
                      <Pressable style={({pressed}) => [s.navBtn, { transform: [{ scale: pressed ? 0.9 : 1 }] }]} onPress={() => confirmAndReport({ targetType: "event", targetId: String(event.id) })}>
                        <Ionicons name="flag-outline" size={20} color="#FFFFFF" />
                      </Pressable>
                      <Pressable style={({pressed}) => [s.navBtn, { transform: [{ scale: pressed ? 0.9 : 1 }] }]} onPress={handleSave}>
                        <Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={22} color={saved ? CultureTokens.saffron : "#FFFFFF"} />
                      </Pressable>
                    </View>
                  </View>

                  <View style={s.heroContent}>
                    <View style={s.heroBadges}>
                      <View style={[s.heroBadge, { backgroundColor: CultureTokens.saffron }]}>
                        <Text style={s.heroBadgeText}>{event.communityTag}</Text>
                      </View>
                      {event.councilTag && (
                        <View style={[s.heroBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                          <Ionicons name="shield-checkmark" size={12} color="#FFFFFF" />
                          <Text style={[s.heroBadgeText, { color: '#FFFFFF' }]}>{event.councilTag}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.heroTitle}>{event.title}</Text>
                    <Text style={s.heroOrganizer}>by {event.organizer}</Text>
                  </View>
                </LinearGradient>
              </View>
            </View>

            {/* General Info Grid */}
            <View style={s.detailShell}>
              
              {countdown && (
                <View style={s.countdownWrapper}>
                  {countdown.ended ? (
                    <View style={[s.countdownEndedBox, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                      <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
                      <Text style={[s.countdownEndedText, { color: colors.textSecondary }]}>Event has ended</Text>
                    </View>
                  ) : (
                    <View style={[s.countdownRow, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                      <View style={s.countBlock}>
                        <Text style={[s.countNum, { color: colors.text }]}>{countdown.days}</Text>
                        <Text style={[s.countLabel, { color: colors.textTertiary }]}>days</Text>
                      </View>
                      <Text style={[s.countSep, { color: colors.borderLight }]}>:</Text>
                      <View style={s.countBlock}>
                        <Text style={[s.countNum, { color: colors.text }]}>{countdown.hours}</Text>
                        <Text style={[s.countLabel, { color: colors.textTertiary }]}>hrs</Text>
                      </View>
                      <Text style={[s.countSep, { color: colors.borderLight }]}>:</Text>
                      <View style={s.countBlock}>
                        <Text style={[s.countNum, { color: colors.text }]}>{countdown.minutes}</Text>
                        <Text style={[s.countLabel, { color: colors.textTertiary }]}>mins</Text>
                      </View>
                    </View>
                  )}
                </View>
              )}

              <View style={s.infoGrid}>
                <View style={[s.infoCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                  <View style={[s.infoIconWrap, { backgroundColor: CultureTokens.indigo + '15' }]}>
                    <Ionicons name="calendar" size={20} color={CultureTokens.indigo} />
                  </View>
                  <View style={s.infoTextWrap}>
                    <Text style={[s.infoLabel, { color: colors.textTertiary }]}>Date & Time</Text>
                    <Text style={[s.infoVal, { color: colors.text }]}>{formatDate(event.date)}</Text>
                    <Text style={[s.infoSub, { color: colors.textSecondary }]}>{event.time}</Text>
                  </View>
                </View>

                <Pressable 
                  style={({pressed}) => [s.infoCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }, pressed && { opacity: 0.8 }]} 
                  onPress={() => {
                    if(!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    const q = [event.venue, event.city, event.country].filter(Boolean).join(", ");
                    Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(q)}`);
                  }}
                >
                  <View style={[s.infoIconWrap, { backgroundColor: CultureTokens.teal + '15' }]}>
                    <Ionicons name="location" size={20} color={CultureTokens.teal} />
                  </View>
                  <View style={[s.infoTextWrap, { flex: 1 }]}>
                    <Text style={[s.infoLabel, { color: colors.textTertiary }]}>Venue</Text>
                    <Text style={[s.infoVal, { color: colors.text }]}>{event.venue}</Text>
                    <Text style={[s.infoSub, { color: colors.textSecondary }]} numberOfLines={1}>{event.address}</Text>
                  </View>
                  <Ionicons name="open-outline" size={16} color={colors.textTertiary} />
                </Pressable>
              </View>

              {isPlus && (
                <View style={[s.earlyAccessBanner, { backgroundColor: CultureTokens.indigo + '10', borderColor: CultureTokens.indigo + '30' }]}>
                  <Ionicons name="star" size={16} color={CultureTokens.indigo} />
                  <Text style={[s.earlyAccessText, { color: CultureTokens.indigo }]}>CulturePass+ Priority Member</Text>
                </View>
              )}

              <View style={[s.divider, { backgroundColor: colors.borderLight }]} />

              {/* Sections */}
              <View style={s.section}>
                <Text style={[s.sectionTitle, { color: colors.text }]}>About</Text>
                <Text style={[s.aboutDesc, { color: colors.textSecondary }]}>{event.description}</Text>
              </View>

              <View style={[s.divider, { backgroundColor: colors.borderLight }]} />

              <View style={s.section}>
                <View style={s.capacityHeader}>
                  <Text style={[s.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Capacity</Text>
                  <Text style={[s.capacityPercent, { color: colors.textTertiary }]}>{capacityPercent}% filled</Text>
                </View>
                <View style={[s.capacityBarBg, { backgroundColor: colors.backgroundSecondary }]}>
                  <View style={[s.capacityBarFill, { width: `${capacityPercent}%`, backgroundColor: capacityPercent > 80 ? CultureTokens.coral : CultureTokens.teal }]} />
                </View>
                <View style={s.capacityFooter}>
                  <Text style={[s.capacityFootText, { color: colors.textSecondary }]}>{event.attending} attending</Text>
                  <Text style={[s.capacityFootText, { color: colors.textSecondary }]}>{Math.max(0, event.capacity - event.attending)} spots left</Text>
                </View>
              </View>

              {event.tiers && event.tiers.length > 0 && (
                <>
                  <View style={[s.divider, { backgroundColor: colors.borderLight }]} />
                  <View style={s.section}>
                    <Text style={[s.sectionTitle, { color: colors.text }]}>Tickets</Text>
                    {event.tiers.map((tier: any, idx: number) => (
                      <Pressable 
                        key={`${tier.name}-${idx}`} 
                        style={({pressed}) => [s.tierCard, { backgroundColor: colors.surface, borderColor: colors.borderLight, transform: [{ scale: pressed ? 0.98 : 1 }] }]} 
                        onPress={() => openTicketModal(idx)}
                      >
                        <View style={s.tierLeft}>
                          <Text style={[s.tierName, { color: colors.text }]}>{tier.name}</Text>
                          <Text style={[s.tierAvail, { color: colors.textTertiary }]}>{tier.available} available</Text>
                        </View>
                        <View style={s.tierRight}>
                          <Text style={[s.tierPrice, { color: CultureTokens.saffron }]}>
                            {tier.priceCents === 0 ? "Free" : `$${(tier.priceCents / 100).toFixed(2)}`}
                          </Text>
                          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              <View style={[s.divider, { backgroundColor: colors.borderLight }]} />

              <View style={s.section}>
                 <Text style={[s.sectionTitle, { color: colors.text }]}>Event Details</Text>
                 <View style={s.metricRow}>
                   <Ionicons name="finger-print-outline" size={16} color={CultureTokens.indigo} />
                   <Text style={[s.metricText, { color: CultureTokens.indigo }]}>CPID: {event.cpid}</Text>
                 </View>
                 <View style={s.metricRow}>
                   <Ionicons name="pricetag-outline" size={16} color={colors.textSecondary} />
                   <Text style={[s.metricText, { color: colors.textSecondary }]}>Category: {event.category}</Text>
                 </View>
                 <View style={s.metricRow}>
                   <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
                   <Text style={[s.metricText, { color: colors.textSecondary }]}>Community: {event.communityTag}</Text>
                 </View>
                 {typeof distanceKm === 'number' && (
                   <View style={s.metricRow}>
                     <Ionicons name="navigate-outline" size={16} color={CultureTokens.teal} />
                     <Text style={[s.metricText, { color: colors.text }]}>Distance: {distanceKm.toFixed(1)} km away</Text>
                   </View>
                 )}
              </View>

            </View>
          </ScrollView>
        </View>
      </View>

      {/* Floating Bottom Bar Container */}
      <View style={[s.floatingBottomBarWrapper, { paddingBottom: bottomInset + 16 }]}>
        <View style={[s.floatingBottomBar, isDesktop && { maxWidth: 800, alignSelf: 'center', width: '100%', bottom: 0 }, { backgroundColor: colors.surface, borderTopColor: colors.borderLight }]}>
          <View style={s.bottomPriceSection}>
            <Text style={[s.bottomPriceLabel, { color: colors.textSecondary }]}>From</Text>
            <Text style={[s.bottomPriceValue, { color: colors.text }]}>{event.priceLabel}</Text>
          </View>
          <View style={s.bottomBtnGroup}>
            {event.externalTicketUrl ? (
              <Pressable style={({ pressed }) => [s.externalBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight, opacity: pressed ? 0.7 : 1 }]} onPress={() => { if(event.externalTicketUrl) Linking.openURL(event.externalTicketUrl); }}>
                <Ionicons name="open-outline" size={16} color={colors.text} />
                <Text style={[s.externalBtnText, { color: colors.text }]}>Organiser Site</Text>
              </Pressable>
            ) : null}
            <Pressable 
              style={({ pressed }) => [s.buyBtn, { backgroundColor: CultureTokens.indigo, transform: [{ scale: pressed ? 0.98 : 1 }] }]} 
              onPress={() => openTicketModal()}
            >
              <Ionicons name="ticket" size={20} color="#FFFFFF" />
              <Text style={s.buyBtnText}>Get Tickets</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Ticket Modal */}
      <Modal visible={ticketModalVisible} animationType="slide" transparent onRequestClose={() => setTicketModalVisible(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setTicketModalVisible(false)}>
          <Pressable style={[s.modalSheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 20 }, isDesktop && { maxWidth: 600, width: '100%', alignSelf: 'center' }]} onPress={e => e.stopPropagation()}>
            <View style={[s.modalHandle, { backgroundColor: colors.borderLight }]} />
            <View style={[s.modalHeader, { borderBottomColor: colors.borderLight }]}>
              <Text style={[s.modalTitle, { color: colors.text }]}>Select Tickets</Text>
              <Pressable onPress={() => setTicketModalVisible(false)} hitSlop={10}>
                <Ionicons name="close-circle" size={28} color={colors.textTertiary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
              <Text style={[s.modalGroupLabel, { color: colors.textSecondary }]}>How are you booking?</Text>
              <View style={s.buyModeRow}>
                {([
                  { key: "single", icon: "person", label: "Single" },
                  { key: "family", icon: "people", label: "Family" },
                  { key: "group", icon: "people-circle", label: "Group" }
                ] as const).map((mode) => (
                  <Pressable
                    key={mode.key}
                    style={[s.buyModeBtn, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight }, buyMode === mode.key && { backgroundColor: CultureTokens.indigo + '15', borderColor: CultureTokens.indigo }]}
                    onPress={() => { setBuyMode(mode.key); setQuantity(1); if(!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  >
                    <Ionicons name={mode.icon as never} size={18} color={buyMode === mode.key ? CultureTokens.indigo : colors.textTertiary} />
                    <Text style={[s.buyModeText, { color: colors.textSecondary }, buyMode === mode.key && { color: CultureTokens.indigo, fontFamily: 'Poppins_600SemiBold' }]}>{mode.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[s.modalGroupLabel, { color: colors.textSecondary, marginTop: 20 }]}>Ticket Tier</Text>
              {event.tiers && event.tiers.map((tier: any, idx: number) => {
                const isSelected = idx === selectedTierIndex;
                return (
                  <Pressable 
                    key={`modal-tier-${idx}`} 
                    style={[s.modalTierCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight }, isSelected && { backgroundColor: CultureTokens.indigo + '10', borderColor: CultureTokens.indigo }]} 
                    onPress={() => { setSelectedTierIndex(idx); setQuantity(1); if(!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  >
                    <View style={s.modalTierLeft}>
                      <View style={[s.radioOuter, { borderColor: isSelected ? CultureTokens.indigo : colors.textTertiary }]}>
                        {isSelected && <View style={[s.radioInner, { backgroundColor: CultureTokens.indigo }]} />}
                      </View>
                      <View>
                        <Text style={[s.modalTierName, { color: colors.text }]}>{tier.name}</Text>
                        <Text style={[s.modalTierAvail, { color: colors.textSecondary }]}>{tier.available} available</Text>
                      </View>
                    </View>
                    <Text style={[s.modalTierPrice, { color: isSelected ? CultureTokens.indigo : colors.text }]}>
                      {tier.priceCents === 0 ? "Free" : `$${(tier.priceCents / 100).toFixed(2)}`}
                    </Text>
                  </Pressable>
                );
              })}

              {buyMode !== "family" && (
                <>
                  <Text style={[s.modalGroupLabel, { color: colors.textSecondary, marginTop: 20 }]}>{buyMode === "group" ? "Group Size" : "Quantity"}</Text>
                  <View style={[s.quantityRow, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight }]}>
                    <Pressable style={s.quantityBtn} onPress={() => { if(quantity > 1) { setQuantity(q => q - 1); if(!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }}>
                      <Ionicons name="remove" size={24} color={quantity <= 1 ? colors.textTertiary : colors.text} />
                    </Pressable>
                    <Text style={[s.quantityNum, { color: colors.text }]}>{quantity}</Text>
                    <Pressable style={s.quantityBtn} onPress={() => { if(quantity < maxQty) { setQuantity(q => q + 1); if(!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }}>
                      <Ionicons name="add" size={24} color={quantity >= maxQty ? colors.textTertiary : colors.text} />
                    </Pressable>
                  </View>
                </>
              )}

              <View style={[s.priceSummaryBox, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight }]}>
                <View style={s.pRow}>
                  <Text style={[s.pRowLabel, { color: colors.textSecondary }]}>{effectiveQty}x {selectedTier?.name}</Text>
                  <Text style={[s.pRowVal, { color: colors.text }]}>${(rawTotal / 100).toFixed(2)}</Text>
                </View>
                {discountAmount > 0 && (
                  <View style={s.pRow}>
                    <Text style={[s.pRowLabel, { color: CultureTokens.teal }]}>{buyMode === "family" ? "Family" : "Group"} Discount</Text>
                    <Text style={[s.pRowVal, { color: CultureTokens.teal }]}>-${(discountAmount / 100).toFixed(2)}</Text>
                  </View>
                )}
                <View style={[s.pDiv, { backgroundColor: colors.borderLight }]} />
                <View style={s.pRow}>
                  <Text style={[s.pTotalLabel, { color: colors.text }]}>Total</Text>
                  <Text style={[s.pTotalVal, { color: colors.text }]}>{totalPrice === 0 ? "Free" : `A$${(totalPrice / 100).toFixed(2)}`}</Text>
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [ s.confirmBtn, { backgroundColor: CultureTokens.indigo, transform: [{ scale: pressed ? 0.98 : 1 }] }, (purchaseMutation.isPending || paymentLoading) && { opacity: 0.6 } ]}
                onPress={handlePurchase}
                disabled={purchaseMutation.isPending || paymentLoading}
              >
                {purchaseMutation.isPending || paymentLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={s.confirmBtnText}>{totalPrice === 0 ? "Get Free Ticket" : `Pay A$${(totalPrice / 100).toFixed(2)}`}</Text>
                )}
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  errorText: { fontSize: 20, fontFamily: 'Poppins_700Bold', marginTop: 12 },
  errorDesc: { fontSize: 15, fontFamily: 'Poppins_400Regular', textAlign: 'center', marginBottom: 20 },
  backActionBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  backActionText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold' },

  desktopShellWrapper: { flex: 1, alignItems: 'center' },
  desktopShell: { width: '100%', maxWidth: 800 },
  detailShell: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },

  heroWrapper: { width: '100%' },
  heroSection: { position: 'relative', justifyContent: 'flex-end' },
  heroNav: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16 },
  navBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  heroActions: { flexDirection: 'row', gap: 12 },
  
  heroContent: { paddingHorizontal: 20, paddingBottom: 24, gap: 8 },
  heroBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  heroBadgeText: { color: '#1B0F2E', fontSize: 11, fontFamily: 'Poppins_700Bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  heroTitle: { fontSize: 28, fontFamily: 'Poppins_700Bold', color: '#FFFFFF', lineHeight: 34 },
  heroOrganizer: { fontSize: 15, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.8)' },

  countdownWrapper: { marginBottom: 20 },
  countdownEndedBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, borderRadius: 16, borderWidth: 1, justifyContent: 'center' },
  countdownEndedText: { fontSize: 15, fontFamily: 'Poppins_500Medium' },
  countdownRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 16, borderRadius: 16, borderWidth: 1 },
  countBlock: { alignItems: 'center', minWidth: 44 },
  countNum: { fontSize: 22, fontFamily: 'Poppins_700Bold', lineHeight: 28 },
  countLabel: { fontSize: 12, fontFamily: 'Poppins_500Medium', textTransform: 'uppercase' },
  countSep: { fontSize: 20, fontFamily: 'Poppins_700Bold', paddingBottom: 8 },

  infoGrid: { gap: 12, marginBottom: 20 },
  infoCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, gap: 14 },
  infoIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  infoTextWrap: { gap: 2 },
  infoLabel: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoVal: { fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
  infoSub: { fontSize: 13, fontFamily: 'Poppins_400Regular' },
  
  earlyAccessBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 20, justifyContent: 'center' },
  earlyAccessText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },

  divider: { height: 1, width: '100%', marginVertical: 24, borderRadius: 1 },

  section: { gap: 12 },
  sectionTitle: { fontSize: 20, fontFamily: 'Poppins_700Bold', marginBottom: 4 },
  aboutDesc: { fontSize: 15, fontFamily: 'Poppins_400Regular', lineHeight: 24 },

  capacityHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  capacityPercent: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  capacityBarBg: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 4 },
  capacityBarFill: { height: '100%', borderRadius: 4 },
  capacityFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  capacityFootText: { fontSize: 13, fontFamily: 'Poppins_500Medium' },

  tierCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  tierLeft: { gap: 2 },
  tierName: { fontSize: 16, fontFamily: 'Poppins_600SemiBold' },
  tierAvail: { fontSize: 13, fontFamily: 'Poppins_500Medium' },
  tierRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tierPrice: { fontSize: 16, fontFamily: 'Poppins_700Bold' },

  metricRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  metricText: { fontSize: 14, fontFamily: 'Poppins_500Medium' },

  floatingBottomBarWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  floatingBottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 10 },
  bottomPriceSection: { gap: 2 },
  bottomPriceLabel: { fontSize: 12, fontFamily: 'Poppins_500Medium', textTransform: 'uppercase' },
  bottomPriceValue: { fontSize: 20, fontFamily: 'Poppins_700Bold' },
  bottomBtnGroup: { flexDirection: 'row', gap: 10 },
  externalBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  externalBtnText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  buyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  buyBtnText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', maxHeight: '90%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontFamily: 'Poppins_700Bold' },
  modalGroupLabel: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },

  buyModeRow: { flexDirection: 'row', gap: 8 },
  buyModeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  buyModeText: { fontSize: 13, fontFamily: 'Poppins_500Medium' },

  modalTierCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  modalTierLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  modalTierName: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', marginBottom: 2 },
  modalTierAvail: { fontSize: 12, fontFamily: 'Poppins_400Regular' },
  modalTierPrice: { fontSize: 16, fontFamily: 'Poppins_700Bold' },

  quantityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  quantityBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  quantityNum: { fontSize: 18, fontFamily: 'Poppins_700Bold' },

  priceSummaryBox: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 10, marginTop: 24, marginBottom: 24 },
  pRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pRowLabel: { fontSize: 14, fontFamily: 'Poppins_400Regular' },
  pRowVal: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  pDiv: { height: 1, width: '100%', marginVertical: 4 },
  pTotalLabel: { fontSize: 16, fontFamily: 'Poppins_700Bold' },
  pTotalVal: { fontSize: 18, fontFamily: 'Poppins_700Bold' },

  confirmBtn: { paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  confirmBtnText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Poppins_700Bold' }
});
