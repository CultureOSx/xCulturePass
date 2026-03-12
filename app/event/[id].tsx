import {
  View, Text, Pressable, ScrollView, Platform, Share, Modal, Alert,
  ActivityIndicator, Linking, StyleSheet, useWindowDimensions
} from 'react-native';
import { Image } from 'expo-image';
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
import { calculateDistance, getPostcodesByPlace } from '@shared/location/australian-postcodes';
import { CultureTokens } from '@/constants/theme';
import { BlurView } from 'expo-blur';

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

  const { data: event, isLoading } = useQuery({
    queryKey: ['/api/events', id],
    queryFn: () => api.events.get(String(id)),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={CultureTokens.indigo} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={s.emptyContainer}>
        <Ionicons name="calendar-outline" size={64} color="rgba(255,255,255,0.4)" />
        <Text style={s.errorText}>Event not found</Text>
        <Text style={s.errorDesc}>This event may have been removed or is currently unavailable.</Text>
        <Pressable onPress={() => goBackOrReplace('/(tabs)')} style={s.backActionBtn}>
          <Text style={s.backActionText}>Return Home</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <EventDetail event={event} insets={insets} />
    </ErrorBoundary>
  );
}

function EventDetail({ event, insets }: any) {
  const { isEventSaved, toggleSaveEvent } = useSaved();
  const { userId } = useAuth();
  const saved = isEventSaved(event.id);
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const topInset = isWeb ? 0 : insets.top;
  const bottomInset = isWeb ? 34 : insets.bottom;

  const distanceKm: number | null = null; // Disabled distance calculation locally
  
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
    <View style={s.container}>
      <View style={[isDesktop && s.desktopShellWrapper]}>
        <View style={[isDesktop && s.desktopShell]}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset + 120 }}>
            {/* Hero Image Block */}
            <View style={s.heroWrapper}>
              <View style={[s.heroSection, { height: isDesktop ? 400 : 360 + topInset }, isDesktop && { borderRadius: 24, marginHorizontal: 20, marginTop: 20, overflow: 'hidden' }]}>
                <Image source={{ uri: event.imageUrl }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                <LinearGradient colors={["rgba(11,11,20,0.1)", "rgba(11,11,20,0.6)", "rgba(11,11,20,1)"]} locations={[0, 0.4, 1]} style={[StyleSheet.absoluteFillObject, { paddingTop: topInset }]} >
                  
                  {/* Nav */}
                  <View style={s.heroNav}>
                    <Pressable style={({pressed}) => [s.navBtn, { transform: [{ scale: pressed ? 0.9 : 1 }] }]} onPress={() => goBackOrReplace("/(tabs)")}>
                      <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                      {!isWeb && <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />}
                    </Pressable>
                    <View style={s.heroActions}>
                      <Pressable style={({pressed}) => [s.navBtn, { transform: [{ scale: pressed ? 0.9 : 1 }] }]} onPress={handleShare}>
                        <Ionicons name="share-outline" size={20} color="#FFFFFF" />
                        {!isWeb && <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />}
                      </Pressable>
                      <Pressable style={({pressed}) => [s.navBtn, { transform: [{ scale: pressed ? 0.9 : 1 }] }]} onPress={() => confirmAndReport({ targetType: "event", targetId: String(event.id) })}>
                        <Ionicons name="flag-outline" size={20} color="#FFFFFF" />
                        {!isWeb && <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />}
                      </Pressable>
                      <Pressable style={({pressed}) => [s.navBtn, { transform: [{ scale: pressed ? 0.9 : 1 }] }]} onPress={handleSave}>
                        <Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={22} color={saved ? CultureTokens.saffron : "#FFFFFF"} />
                        {!isWeb && <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />}
                      </Pressable>
                    </View>
                  </View>

                  <View style={s.heroContent}>
                    <View style={s.heroBadges}>
                      <View style={[s.heroBadge, { backgroundColor: CultureTokens.saffron }]}>
                        <Text style={s.heroBadgeText}>{event.communityId}</Text>
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
                    <View style={s.countdownEndedBox}>
                      <Ionicons name="time-outline" size={18} color="rgba(255,255,255,0.6)" />
                      <Text style={s.countdownEndedText}>Event has ended</Text>
                    </View>
                  ) : (
                    <View style={s.countdownRow}>
                      <View style={s.countBlock}>
                        <Text style={s.countNum}>{countdown.days}</Text>
                        <Text style={s.countLabel}>days</Text>
                      </View>
                      <Text style={s.countSep}>:</Text>
                      <View style={s.countBlock}>
                        <Text style={s.countNum}>{countdown.hours}</Text>
                        <Text style={s.countLabel}>hrs</Text>
                      </View>
                      <Text style={s.countSep}>:</Text>
                      <View style={s.countBlock}>
                        <Text style={s.countNum}>{countdown.minutes}</Text>
                        <Text style={s.countLabel}>mins</Text>
                      </View>
                    </View>
                  )}
                </View>
              )}

              <View style={s.infoGrid}>
                <View style={s.infoCard}>
                  <View style={[s.infoIconWrap, { backgroundColor: CultureTokens.indigo + '20' }]}>
                    <Ionicons name="calendar-outline" size={20} color={CultureTokens.indigo} />
                  </View>
                  <View style={s.infoTextWrap}>
                    <Text style={s.infoLabel}>Date & Time</Text>
                    <Text style={s.infoVal}>{formatDate(event.date)}</Text>
                    <Text style={s.infoSub}>{event.time}</Text>
                  </View>
                </View>

                <Pressable 
                  style={({pressed}) => [s.infoCard, pressed && { opacity: 0.8 }]} 
                  onPress={() => {
                    if(!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    const q = [event.venue, event.city, event.country].filter(Boolean).join(", ");
                    Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(q)}`);
                  }}
                >
                  <View style={[s.infoIconWrap, { backgroundColor: CultureTokens.teal + '20' }]}>
                    <Ionicons name="location-outline" size={20} color={CultureTokens.teal} />
                  </View>
                  <View style={[s.infoTextWrap, { flex: 1 }]}>
                    <Text style={s.infoLabel}>Venue</Text>
                    <Text style={s.infoVal}>{event.venue}</Text>
                    <Text style={s.infoSub} numberOfLines={1}>{event.address || event.city}</Text>
                  </View>
                  <Ionicons name="open-outline" size={16} color="rgba(255,255,255,0.4)" />
                </Pressable>
              </View>

              {isPlus && (
                <View style={s.earlyAccessBanner}>
                  <Ionicons name="star" size={16} color={CultureTokens.indigo} />
                  <Text style={s.earlyAccessText}>CulturePass+ Priority Member</Text>
                </View>
              )}

              <View style={s.divider} />

              {/* Sections */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>About</Text>
                <Text style={s.aboutDesc}>{event.description}</Text>
              </View>

              <View style={s.divider} />

              <View style={s.section}>
                <View style={s.capacityHeader}>
                  <Text style={[s.sectionTitle, { marginBottom: 0 }]}>Capacity</Text>
                  <Text style={s.capacityPercent}>{capacityPercent}% filled</Text>
                </View>
                <View style={s.capacityBarBg}>
                  <View style={[s.capacityBarFill, { width: `${capacityPercent}%`, backgroundColor: capacityPercent > 80 ? CultureTokens.coral : CultureTokens.teal }]} />
                </View>
                <View style={s.capacityFooter}>
                  <Text style={s.capacityFootText}>{event.attending} attending</Text>
                  <Text style={s.capacityFootText}>{Math.max(0, event.capacity - event.attending)} spots left</Text>
                </View>
              </View>

              {event.tiers && event.tiers.length > 0 && (
                <>
                  <View style={s.divider} />
                  <View style={s.section}>
                    <Text style={s.sectionTitle}>Tickets</Text>
                    {event.tiers.map((tier: any, idx: number) => (
                      <Pressable 
                        key={`${tier.name}-${idx}`} 
                        style={({pressed}) => [s.tierCard, pressed && { opacity: 0.8, backgroundColor: 'rgba(44, 42, 114, 0.15)', borderColor: 'rgba(44, 42, 114, 0.4)' }]} 
                        onPress={() => openTicketModal(idx)}
                      >
                        <View style={s.tierLeft}>
                          <Text style={s.tierName}>{tier.name}</Text>
                          <Text style={s.tierAvail}>{tier.available} available</Text>
                        </View>
                        <View style={s.tierRight}>
                          <Text style={s.tierPrice}>
                            {tier.priceCents === 0 ? "Free" : `$${(tier.priceCents / 100).toFixed(2)}`}
                          </Text>
                          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.4)" />
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              <View style={s.divider} />

              <View style={s.section}>
                 <Text style={s.sectionTitle}>Event Details</Text>
                 <View style={s.metricRow}>
                   <View style={s.metricIconBg}><Ionicons name="finger-print-outline" size={16} color={CultureTokens.indigo} /></View>
                   <Text style={[s.metricText, { color: '#FFFFFF' }]}>CPID: {event.cpid}</Text>
                 </View>
                 <View style={s.metricRow}>
                   <View style={s.metricIconBg}><Ionicons name="pricetag-outline" size={16} color="rgba(255,255,255,0.6)" /></View>
                   <Text style={s.metricText}>Category: {event.category}</Text>
                 </View>
                 <View style={s.metricRow}>
                   <View style={s.metricIconBg}><Ionicons name="people-outline" size={16} color="rgba(255,255,255,0.6)" /></View>
                   <Text style={s.metricText}>Community: {event.communityId}</Text>
                 </View>
              </View>

            </View>
          </ScrollView>
        </View>
      </View>

      {/* Floating Bottom Bar Container */}
      <View style={[s.floatingBottomBarWrapper, { paddingBottom: bottomInset + 16 }]}>
        <LinearGradient colors={['transparent', '#0B0B14']} style={StyleSheet.absoluteFillObject} />
        <View style={{ overflow: 'hidden', borderRadius: 24, marginHorizontal: 20 }}>
          <BlurView 
            intensity={isWeb ? 80 : 30} 
            tint="dark" 
            style={[s.floatingBottomBar, isDesktop && { maxWidth: 800, alignSelf: 'center', width: '100%', bottom: 0 }]}
          >
            <View style={s.bottomPriceSection}>
              <Text style={s.bottomPriceLabel}>From</Text>
              <Text style={s.bottomPriceValue}>{event.priceLabel}</Text>
            </View>
            <View style={s.bottomBtnGroup}>
              {event.externalTicketUrl ? (
                <Pressable style={({ pressed }) => [s.externalBtn, { opacity: pressed ? 0.7 : 1 }]} onPress={() => { if(event.externalTicketUrl) Linking.openURL(event.externalTicketUrl); }}>
                  <Ionicons name="open-outline" size={16} color="#FFFFFF" />
                  <Text style={s.externalBtnText}>Organiser</Text>
                </Pressable>
              ) : null}
              <Pressable 
                style={({ pressed }) => [s.buyBtn, { transform: [{ scale: pressed ? 0.98 : 1 }] }]} 
                onPress={() => openTicketModal()}
              >
                <Ionicons name="ticket" size={20} color="#FFFFFF" />
                <Text style={s.buyBtnText}>Get Tickets</Text>
              </Pressable>
            </View>
          </BlurView>
        </View>
      </View>

      {/* Ticket Modal */}
      <Modal visible={ticketModalVisible} animationType="fade" transparent onRequestClose={() => setTicketModalVisible(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setTicketModalVisible(false)}>
          <Pressable style={[s.modalSheet, { paddingBottom: insets.bottom + 20 }, isDesktop && { maxWidth: 600, width: '100%', alignSelf: 'center' }]} onPress={e => e.stopPropagation()}>
            {isWeb ? <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0B0B14'}]} /> : <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.03)', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)'}]} />
            <View style={s.modalHandle} />
            
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Select Tickets</Text>
              <Pressable onPress={() => setTicketModalVisible(false)} hitSlop={10} style={({pressed}) => [pressed && {opacity:0.6}]}>
                <Ionicons name="close-circle" size={28} color="rgba(255,255,255,0.4)" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
              <Text style={s.modalGroupLabel}>How are you booking?</Text>
              <View style={s.buyModeRow}>
                {([
                  { key: "single", icon: "person", label: "Single" },
                  { key: "family", icon: "people", label: "Family" },
                  { key: "group", icon: "people-circle", label: "Group" }
                ] as const).map((mode) => (
                  <Pressable
                    key={mode.key}
                    style={[s.buyModeBtn, buyMode === mode.key && { backgroundColor: 'rgba(44, 42, 114, 0.25)', borderColor: CultureTokens.indigo }]}
                    onPress={() => { setBuyMode(mode.key); setQuantity(1); if(!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  >
                    <Ionicons name={mode.icon as never} size={18} color={buyMode === mode.key ? '#A5B4FC' : 'rgba(255,255,255,0.4)'} />
                    <Text style={[s.buyModeText, buyMode === mode.key && { color: '#A5B4FC', fontFamily: 'Poppins_600SemiBold' }]}>{mode.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[s.modalGroupLabel, { marginTop: 20 }]}>Ticket Tier</Text>
              {event.tiers && event.tiers.map((tier: any, idx: number) => {
                const isSelected = idx === selectedTierIndex;
                return (
                  <Pressable 
                    key={`modal-tier-${idx}`} 
                    style={[s.modalTierCard, isSelected && { backgroundColor: 'rgba(44, 42, 114, 0.25)', borderColor: CultureTokens.indigo }]} 
                    onPress={() => { setSelectedTierIndex(idx); setQuantity(1); if(!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  >
                    <View style={s.modalTierLeft}>
                      <View style={[s.radioOuter, { borderColor: isSelected ? CultureTokens.indigo : 'rgba(255,255,255,0.3)' }]}>
                        {isSelected && <View style={[s.radioInner, { backgroundColor: CultureTokens.indigo }]} />}
                      </View>
                      <View>
                        <Text style={s.modalTierName}>{tier.name}</Text>
                        <Text style={s.modalTierAvail}>{tier.available} available</Text>
                      </View>
                    </View>
                    <Text style={[s.modalTierPrice, isSelected && { color: '#8898FF' }]}>
                      {tier.priceCents === 0 ? "Free" : `$${(tier.priceCents / 100).toFixed(2)}`}
                    </Text>
                  </Pressable>
                );
              })}

              {buyMode !== "family" && (
                <>
                  <Text style={[s.modalGroupLabel, { marginTop: 20 }]}>{buyMode === "group" ? "Group Size" : "Quantity"}</Text>
                  <View style={s.quantityRow}>
                    <Pressable style={s.quantityBtn} onPress={() => { if(quantity > 1) { setQuantity(q => q - 1); if(!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }}>
                      <Ionicons name="remove" size={24} color={quantity <= 1 ? 'rgba(255,255,255,0.3)' : '#FFFFFF'} />
                    </Pressable>
                    <Text style={s.quantityNum}>{quantity}</Text>
                    <Pressable style={s.quantityBtn} onPress={() => { if(quantity < maxQty) { setQuantity(q => q + 1); if(!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }}>
                      <Ionicons name="add" size={24} color={quantity >= maxQty ? 'rgba(255,255,255,0.3)' : '#FFFFFF'} />
                    </Pressable>
                  </View>
                </>
              )}

              <View style={s.priceSummaryBox}>
                <View style={s.pRow}>
                  <Text style={s.pRowLabel}>{effectiveQty}x {selectedTier?.name}</Text>
                  <Text style={s.pRowVal}>${(rawTotal / 100).toFixed(2)}</Text>
                </View>
                {discountAmount > 0 && (
                  <View style={s.pRow}>
                    <Text style={[s.pRowLabel, { color: CultureTokens.teal }]}>{buyMode === "family" ? "Family" : "Group"} Discount</Text>
                    <Text style={[s.pRowVal, { color: CultureTokens.teal }]}>-${(discountAmount / 100).toFixed(2)}</Text>
                  </View>
                )}
                <View style={s.pDiv} />
                <View style={s.pRow}>
                  <Text style={s.pTotalLabel}>Total</Text>
                  <Text style={s.pTotalVal}>{totalPrice === 0 ? "Free" : `A$${(totalPrice / 100).toFixed(2)}`}</Text>
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [ s.confirmBtn, { transform: [{ scale: pressed ? 0.98 : 1 }] }, (purchaseMutation.isPending || paymentLoading) && { opacity: 0.6 } ]}
                onPress={handlePurchase}
                disabled={purchaseMutation.isPending || paymentLoading}
              >
                {/* Glowing underlay for confirm btn */}
                <LinearGradient colors={['rgba(255,255,255,0.05)', 'transparent']} style={StyleSheet.absoluteFillObject} />
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
  container: { flex: 1, backgroundColor: '#0B0B14' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B0B14' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12, backgroundColor: '#0B0B14' },
  errorText: { fontSize: 20, fontFamily: 'Poppins_700Bold', marginTop: 12, color: '#FFFFFF' },
  errorDesc: { fontSize: 15, fontFamily: 'Poppins_400Regular', textAlign: 'center', marginBottom: 20, color: 'rgba(255,255,255,0.6)' },
  backActionBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' },
  backActionText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },

  desktopShellWrapper: { flex: 1, alignItems: 'center' },
  desktopShell: { width: '100%', maxWidth: 800 },
  detailShell: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },

  heroWrapper: { width: '100%' },
  heroSection: { position: 'relative', justifyContent: 'flex-end' },
  heroNav: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, zIndex: 10 },
  navBtn: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  heroActions: { flexDirection: 'row', gap: 12 },
  
  heroContent: { paddingHorizontal: 20, paddingBottom: 32, gap: 8, zIndex: 2 },
  heroBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  heroBadgeText: { color: '#0B0B14', fontSize: 12, fontFamily: 'Poppins_700Bold', textTransform: 'uppercase', letterSpacing: 1.2 },
  heroTitle: { fontSize: 34, fontFamily: 'Poppins_700Bold', color: '#FFFFFF', lineHeight: 40, letterSpacing: -0.5 },
  heroOrganizer: { fontSize: 16, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.85)' },

  countdownWrapper: { marginBottom: 20 },
  countdownEndedBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, borderRadius: 16, borderWidth: 1, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' },
  countdownEndedText: { fontSize: 15, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.6)' },
  countdownRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 16, borderRadius: 16, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' },
  countBlock: { alignItems: 'center', minWidth: 44 },
  countNum: { fontSize: 22, fontFamily: 'Poppins_700Bold', lineHeight: 28, color: '#FFFFFF' },
  countLabel: { fontSize: 12, fontFamily: 'Poppins_500Medium', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' },
  countSep: { fontSize: 20, fontFamily: 'Poppins_700Bold', paddingBottom: 8, color: 'rgba(255,255,255,0.1)' },

  infoGrid: { gap: 12, marginBottom: 20 },
  infoCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, gap: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' },
  infoIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  infoTextWrap: { gap: 2 },
  infoLabel: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5, color: 'rgba(255,255,255,0.4)' },
  infoVal: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
  infoSub: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.6)' },
  
  earlyAccessBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 20, justifyContent: 'center', backgroundColor: 'rgba(44, 42, 114, 0.15)', borderColor: 'rgba(44, 42, 114, 0.4)' },
  earlyAccessText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: '#A5B4FC' },

  divider: { height: 1, width: '100%', marginVertical: 24, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.1)' },

  section: { gap: 12 },
  sectionTitle: { fontSize: 20, fontFamily: 'Poppins_700Bold', marginBottom: 4, color: '#FFFFFF' },
  aboutDesc: { fontSize: 15, fontFamily: 'Poppins_400Regular', lineHeight: 24, color: 'rgba(255,255,255,0.8)' },

  capacityHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  capacityPercent: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: 'rgba(255,255,255,0.4)' },
  capacityBarBg: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 4, backgroundColor: 'rgba(255,255,255,0.1)' },
  capacityBarFill: { height: '100%', borderRadius: 4 },
  capacityFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  capacityFootText: { fontSize: 13, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.6)' },

  tierCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' },
  tierLeft: { gap: 2 },
  tierName: { fontSize: 16, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
  tierAvail: { fontSize: 13, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.4)' },
  tierRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tierPrice: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: CultureTokens.saffron },

  metricRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  metricIconBg: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  metricText: { fontSize: 14, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.6)' },

  floatingBottomBarWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100 },
  floatingBottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 18, backgroundColor: 'rgba(20,20,30,0.7)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  bottomPriceSection: { gap: 2 },
  bottomPriceLabel: { fontSize: 12, fontFamily: 'Poppins_500Medium', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', letterSpacing: 0.5 },
  bottomPriceValue: { fontSize: 24, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  bottomBtnGroup: { flexDirection: 'row', gap: 10 },
  externalBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.15)' },
  externalBtnText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
  buyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, backgroundColor: CultureTokens.indigo, shadowColor: CultureTokens.indigo, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  buyBtnText: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: '#FFFFFF', letterSpacing: 0.5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', maxHeight: '90%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.2)' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  modalGroupLabel: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, color: 'rgba(255,255,255,0.6)' },

  buyModeRow: { flexDirection: 'row', gap: 8 },
  buyModeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' },
  buyModeText: { fontSize: 13, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.6)' },

  modalTierCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' },
  modalTierLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  modalTierName: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', marginBottom: 2, color: '#FFFFFF' },
  modalTierAvail: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.6)' },
  modalTierPrice: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },

  quantityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' },
  quantityBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  quantityNum: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },

  priceSummaryBox: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 10, marginTop: 24, marginBottom: 24, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' },
  pRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pRowLabel: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.6)' },
  pRowVal: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
  pDiv: { height: 1, width: '100%', marginVertical: 4, backgroundColor: 'rgba(255,255,255,0.1)' },
  pTotalLabel: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  pTotalVal: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },

  confirmBtn: { paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: CultureTokens.indigo, overflow: 'hidden' },
  confirmBtnText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Poppins_700Bold' }
});
