import {
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
  Share,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { router, useLocalSearchParams, usePathname } from "expo-router";
import { goBackOrReplace } from "@/lib/navigation";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSaved } from "@/contexts/SavedContext";
import { Colors } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/query-client";
import * as WebBrowser from "expo-web-browser";
import { confirmAndReport } from "@/lib/reporting";
import { api } from "@/lib/api";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAuth } from "@/lib/auth";
import { styles, modalStyles } from "./styles/EventDetailStyles";
import { useColors } from '@/hooks/useColors';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { calculateDistance, getPostcodesByPlace } from '@shared/location/australian-postcodes';
import * as Location from 'expo-location';

type SampleEvent = any;

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return dateStr;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateShort(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return dateStr;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
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
  const topInset = Platform.OS === "web" ? 0 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const { data: event, isLoading } = useQuery({
    queryKey: ["/api/events", id],
    queryFn: () => api.events.get(String(id)),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <ErrorBoundary>
        <View
          style={[
            styles.container,
            {
              paddingTop: topInset,
              justifyContent: "center",
              alignItems: "center",
            },
          ]}
        >
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </ErrorBoundary>
    );
  }

  if (!event) {
    return (
      <ErrorBoundary>
        <View
          style={[
            styles.container,
            {
              paddingTop: topInset,
              justifyContent: "center",
              alignItems: "center",
            },
          ]}
        >
          <Text style={styles.errorText}>Event not found</Text>
          <Pressable onPress={() => goBackOrReplace("/(tabs)")}>
            <Text style={styles.backLink}>Go Back</Text>
          </Pressable>
        </View>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <EventDetail
        event={event}
        topInset={topInset}
        bottomInset={bottomInset}
      />
    </ErrorBoundary>
  );
}

interface EventDetailProps {
  event: SampleEvent;
  topInset: number;
  bottomInset: number;
}

function EventDetail({ event, topInset, bottomInset }: EventDetailProps) {
  const { isEventSaved, toggleSaveEvent } = useSaved();
  const { state } = useOnboarding();
  const { userId } = useAuth();
  const saved = isEventSaved(event.id);
  const pathname = usePathname();

  const colors = useColors();
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    let isMounted = true;

    const resolveGpsLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (isMounted) {
          setGpsCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        }
      } catch {
        if (isMounted) {
          setGpsCoords(null);
        }
      }
    };

    resolveGpsLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  const distanceKm = useMemo(() => {
    const to = cityToCoordinates(event.city);
    if (!to) return null;

    if (gpsCoords) {
      return calculateDistance(gpsCoords.latitude, gpsCoords.longitude, to.latitude, to.longitude);
    }

    const fallbackFrom = cityToCoordinates(state.city);
    if (!fallbackFrom) return null;

    return calculateDistance(fallbackFrom.latitude, fallbackFrom.longitude, to.latitude, to.longitude);
  }, [gpsCoords, state.city, event.city]);

  const [now, setNow] = useState(() => new Date());
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [selectedTierIndex, setSelectedTierIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [buyMode, setBuyMode] = useState<"single" | "family" | "group">(
    "single",
  );

  const { data: membership } = useQuery<{
    tier: string;
    cashbackMultiplier?: number;
  }>({
    queryKey: [`/api/membership/${userId}`],
    queryFn: () => api.membership.get(userId!),
    enabled: !!userId,
  });
  const isPlus = membership?.tier === "plus";

  const [paymentLoading, setPaymentLoading] = useState(false);

  // Feedback state
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  const handleSubmitFeedback = useCallback(async () => {
    if (!feedbackRating || !userId) return;
    setFeedbackSubmitting(true);
    try {
      await apiRequest("POST", `/api/events/${event.id}/feedback`, {
        userId,
        rating: feedbackRating,
      });
      setFeedbackSubmitted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // silently fail — feedback is non-critical
    } finally {
      setFeedbackSubmitting(false);
    }
  }, [feedbackRating, userId, event.id]);

  const handleDiscoveryFeedback = useCallback(
    async (signal: "up" | "down") => {
      if (!userId) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      try {
        await apiRequest("POST", "/api/discover/feedback", {
          userId,
          eventId: event.id,
          signal,
        });
      } catch {
        // silently fail
      }
    },
    [userId, event.id],
  );

  const purchaseMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await apiRequest(
        "POST",
        "/api/stripe/create-checkout-session",
        { ticketData: body },
      );
      return await res.json();
    },
    onSuccess: async (data: any) => {
      if (data.checkoutUrl) {
        setPaymentLoading(true);
        setTicketModalVisible(false);

        try {
          const result = await WebBrowser.openBrowserAsync(data.checkoutUrl, {
            dismissButtonStyle: "cancel",
            presentationStyle:
              WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
          });

          queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });

          if (result.type === "cancel" || result.type === "dismiss") {
            const ticketRes = await apiRequest(
              "GET",
              `/api/ticket/${data.ticketId}`,
              undefined,
            );
            const ticket = await ticketRes.json();

            if (
              ticket.paymentStatus === "paid" ||
              ticket.status === "confirmed"
            ) {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              Alert.alert("Ticket Purchased!", "Your payment was successful.", [
                {
                  text: "View Ticket",
                  onPress: () =>
                    router.push(`/tickets/${data.ticketId}` as any),
                },
                { text: "OK" },
              ]);
            }
          }
        } catch {
          Alert.alert(
            "Payment Error",
            "Could not open payment page. Please try again.",
          );
        } finally {
          setPaymentLoading(false);
        }
      }
    },
    onError: (error: Error) => {
      Alert.alert("Purchase Failed", error.message);
    },
  });

  const selectedTier = event.tiers[selectedTierIndex];
  const maxQty =
    buyMode === "family" ? 1 : Math.min(20, selectedTier?.available ?? 1);
  const familySize = 4;
  const familyDiscount = 0.1;
  const groupDiscount = quantity >= 10 ? 0.15 : quantity >= 5 ? 0.1 : 0;
  const basePrice = selectedTier?.priceCents ?? 0;

  const rawTotal =
    buyMode === "family" ? basePrice * familySize : basePrice * quantity;
  const discountRate =
    buyMode === "family"
      ? familyDiscount
      : buyMode === "group"
        ? groupDiscount
        : 0;
  const discountAmount = rawTotal * discountRate;
  const totalPrice = rawTotal - discountAmount;
  const effectiveQty = buyMode === "family" ? familySize : quantity;
  const cashbackAmount = isPlus ? (totalPrice / 100) * 0.02 : 0;

  const purchaseFreeTicket = useCallback(
    async (body: Record<string, unknown>) => {
      try {
        const res = await apiRequest("POST", "/api/tickets", body);
        const data = await res.json();
        queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
        setTicketModalVisible(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "Ticket Confirmed!",
          "Your free ticket has been reserved.",
          [
            {
              text: "View Ticket",
              onPress: () => router.push(`/tickets/${data.id}` as any),
            },
            { text: "OK" },
          ],
        );
      } catch {
        Alert.alert("Error", "Failed to reserve ticket. Please try again.");
      }
    },
    [],
  );

  const handlePurchase = useCallback(() => {
    if (!userId) {
      Alert.alert(
        "Login required",
        "Please sign in to complete ticket purchase.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Sign in",
            onPress: () => router.push({ pathname: '/(onboarding)/login', params: { redirectTo: pathname } } as any),
          },
        ],
      );
      return;
    }

    const ticketLabel =
      buyMode === "family"
        ? `${selectedTier.name} (Family Pack)`
        : buyMode === "group"
          ? `${selectedTier.name} (Group)`
          : selectedTier.name;

    if (totalPrice <= 0) {
      purchaseFreeTicket({
        userId,
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.date,
        eventTime: event.time,
        eventVenue: event.venue,
        tierName: ticketLabel,
        quantity: effectiveQty,
        totalPriceCents: 0,
        currency: "AUD",
        imageColor: (event as any).imageColor ?? Colors.primary,
      });
      return;
    }

    purchaseMutation.mutate({
      userId,
      eventId: event.id,
      eventTitle: event.title,
      eventDate: event.date,
      eventTime: event.time,
      eventVenue: event.venue,
      tierName: ticketLabel,
      quantity: effectiveQty,
      totalPriceCents: totalPrice,
      currency: "AUD",
      imageColor: (event as any).imageColor ?? Colors.primary,
    });
  }, [
    userId,
    event,
    selectedTier,
    totalPrice,
    effectiveQty,
    buyMode,
    purchaseMutation,
    purchaseFreeTicket,
  ]);

  const openTicketModal = useCallback((tierIdx?: number) => {
    setSelectedTierIndex(tierIdx ?? 0);
    setQuantity(1);
    setBuyMode("single");
    setTicketModalVisible(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
    if (diff <= 0)
      return { ended: true as const, days: 0, hours: 0, minutes: 0 };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { ended: false as const, days, hours, minutes };
  }, [event.date, event.time, now]);

  const capacityPercent = useMemo(
    () =>
      event.capacity > 0
        ? Math.min(100, Math.round((event.attending / event.capacity) * 100))
        : 0,
    [event.attending, event.capacity],
  );

  const { data: allEventsForRelated = [] } = useQuery({
    queryKey: ["events", "list", "related", event.id],
    queryFn: async () => {
      const data = await api.events.list({ pageSize: 50 });
      return Array.isArray(data.events) ? data.events : [];
    },
  });

  const relatedEvents = useMemo(
    () =>
      allEventsForRelated
        .filter(
          (e: any) =>
            e.id !== event.id &&
            (e.category === event.category ||
              e.communityTag === event.communityTag),
        )
        .slice(0, 3),
    [event.id, event.category, event.communityTag, allEventsForRelated],
  );

  const avatarCount = 5;
  const remainingCount = Math.max(0, event.attending - avatarCount);

  const handleShare = useCallback(async () => {
    try {
      const shareUrl = `https://culturepass.app/event/${event.id}`;
      await Share.share({
        title: `${event.title} on CulturePass`,
        message: `Check out ${event.title} on CulturePass! ${event.venue} - ${formatDate(event.date)}\n\n${shareUrl}`,
        url: shareUrl,
      });
    } catch {}
  }, [event.id, event.title, event.venue, event.date]);

  const handleSave = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleSaveEvent(event.id);
  }, [event.id, toggleSaveEvent]);

  const handleGetTickets = useCallback(() => {
    openTicketModal();
  }, [openTicketModal]);

  const handleExternalTickets = useCallback(() => {
    if (event.externalTicketUrl) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Linking.openURL(event.externalTicketUrl);
    }
  }, [event.externalTicketUrl]);

  return (
    <View style={styles.container}>
      <View style={[styles.heroSection, { height: 320 + topInset }]}>
        <Image
          source={{ uri: event.imageUrl }}
          style={{ position: "absolute", width: "100%", height: "100%" }}
        />
        <LinearGradient
          colors={["rgba(0,0,0,0.15)", "rgba(0,0,0,0.35)", "rgba(0,0,0,0.75)"]}
          locations={[0, 0.4, 1]}
          style={[styles.heroOverlay, { paddingTop: topInset }]}
        >
          <View style={styles.heroNav}>
            <Pressable
              style={styles.navButton}
              onPress={() => goBackOrReplace("/(tabs)")}
            >
              <Ionicons name="chevron-back" size={22} color={colors.textInverse} />
            </Pressable>
            <View style={styles.heroActions}>
              <Pressable style={styles.navButton} onPress={handleShare}>
                <Ionicons name="share-outline" size={22} color={colors.textInverse} />
              </Pressable>
              <Pressable
                style={styles.navButton}
                onPress={() =>
                  confirmAndReport({
                    targetType: "event",
                    targetId: String(event.id),
                  })
                }
              >
                <Ionicons name="flag-outline" size={20} color={colors.textInverse} />
              </Pressable>
              <Pressable style={styles.navButton} onPress={handleSave}>
                <Ionicons
                  name={saved ? "bookmark" : "bookmark-outline"}
                  size={22}
                  color={colors.textInverse}
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.heroContent}>
            <View style={styles.heroBadges}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>{event.communityTag}</Text>
              </View>
              {event.councilTag ? (
                <View
                  style={[
                    styles.heroBadge,
                    { backgroundColor: "rgba(255,255,255,0.3)" },
                  ]}
                >
                  <Ionicons name="shield-checkmark" size={12} color={colors.textInverse} />
                  <Text style={styles.heroBadgeText}>{event.councilTag}</Text>
                </View>
              ) : null}
              {event.indigenousTags?.map((tag: string) => (
                <View
                  key={tag}
                  style={[
                    styles.heroBadge,
                    { backgroundColor: "rgba(139,69,19,0.7)" },
                  ]}
                >
                  <Ionicons name="earth" size={11} color={colors.textInverse} />
                  <Text style={styles.heroBadgeText}>{tag}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.heroTitle, { color: colors.textInverse }]}>{event.title}</Text>
            <Text style={styles.heroOrganizer}>by {event.organizer}</Text>
          </View>
        </LinearGradient>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
      >
        {countdown && (
          <View style={styles.countdownContainer}>
            {countdown.ended ? (
              <View style={styles.countdownEndedBox}>
                <Ionicons
                  name="time-outline"
                  size={18}
                  color={Colors.textSecondary}
                />
                <Text style={styles.countdownEndedText}>Event has ended</Text>
              </View>
            ) : (
              <View style={styles.countdownRow}>
                <View style={styles.countdownBox}>
                  <Text style={styles.countdownNumber}>{countdown.days}</Text>
                  <Text style={styles.countdownLabel}>days</Text>
                </View>
                <Text style={styles.countdownSeparator}>:</Text>
                <View style={styles.countdownBox}>
                  <Text style={styles.countdownNumber}>{countdown.hours}</Text>
                  <Text style={styles.countdownLabel}>hrs</Text>
                </View>
                <Text style={styles.countdownSeparator}>:</Text>
                <View style={styles.countdownBox}>
                  <Text style={styles.countdownNumber}>
                    {countdown.minutes}
                  </Text>
                  <Text style={styles.countdownLabel}>mins</Text>
                </View>
              </View>
            )}
          </View>
        )}

        <View style={styles.infoCards}>
          <View style={styles.infoCard}>
            <View
              style={[
                styles.infoIconBg,
                { backgroundColor: Colors.primary + "12" },
              ]}
            >
              <Ionicons name="calendar" size={20} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.infoLabel}>Date & Time</Text>
              <Text style={styles.infoValue}>{formatDate(event.date)}</Text>
              <Text style={styles.infoSub}>{event.time}</Text>
            </View>
          </View>
          <Pressable
            style={styles.infoCard}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const query = [event.venue, event.city, event.country]
                .filter(Boolean)
                .join(", ");
              Linking.openURL(
                `https://maps.google.com/?q=${encodeURIComponent(query)}`,
              );
            }}
          >
            <View
              style={[
                styles.infoIconBg,
                { backgroundColor: Colors.secondary + "12" },
              ]}
            >
              <Ionicons name="location" size={20} color={Colors.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Venue</Text>
              <Text style={styles.infoValue}>{event.venue}</Text>
              <Text style={styles.infoSub} numberOfLines={1}>
                {event.address}
              </Text>
            </View>
            <Ionicons
              name="open-outline"
              size={14}
              color={Colors.textTertiary}
            />
          </Pressable>
        </View>

        {isPlus && (
          <View style={styles.earlyAccessBadge}>
            <Ionicons name="flash" size={14} color="#2E86C1" />
            <Text style={styles.earlyAccessText}>48h Early Access</Text>
            <View style={styles.earlyAccessDot} />
            <Ionicons name="star" size={12} color="#2E86C1" />
            <Text style={styles.earlyAccessText}>CulturePass+ Member</Text>
          </View>
        )}

        <View style={styles.sectionDivider}>
          <View style={styles.accentBar} />
        </View>

        <View style={styles.section}>
          <View style={styles.capacityRow}>
            <Text style={styles.sectionTitle}>Capacity</Text>
            <Text style={styles.capacityLabel}>{capacityPercent}% filled</Text>
          </View>
          <View style={styles.capacityBar}>
            <View
              style={[
                styles.capacityFill,
                {
                  width: `${capacityPercent}%`,
                  backgroundColor:
                    capacityPercent > 80 ? Colors.warning : Colors.secondary,
                },
              ]}
            />
          </View>
          <View style={styles.capacityDetails}>
            <Text style={styles.capacityText}>{event.attending} attending</Text>
            <Text style={styles.capacityText}>
              {Math.max(0, event.capacity - event.attending)} spots left
            </Text>
          </View>
        </View>

        <View style={styles.sectionDivider}>
          <View style={styles.accentBar} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{event.description}</Text>
        </View>

        <View style={styles.sectionDivider}>
          <View style={styles.accentBar} />
        </View>

        {event.indigenousTags && event.indigenousTags.length > 0 && (
          <>
            <View style={styles.section}>
              <View style={styles.educationCard}>
                <View style={styles.educationHeader}>
                  <View style={styles.educationIconBg}>
                    <Ionicons name="book" size={18} color="#8B4513" />
                  </View>
                  <Text style={styles.educationTitle}>
                    Cultural Information
                  </Text>
                </View>
                <Text style={styles.educationBody}>
                  This is an event led by Aboriginal and Torres Strait Islander
                  peoples. Please be mindful of cultural protocols and respect
                  the traditions shared during this event.
                </Text>
                {event.indigenousTags.includes("NAIDOC Week") && (
                  <View style={styles.educationHighlight}>
                    <Ionicons
                      name="information-circle"
                      size={16}
                      color="#1A5276"
                    />
                    <Text style={styles.educationHighlightText}>
                      NAIDOC Week celebrates the history, culture, and
                      achievements of Aboriginal and Torres Strait Islander
                      peoples.
                    </Text>
                  </View>
                )}
                {event.indigenousTags.includes("Reconciliation Week") && (
                  <View style={styles.educationHighlight}>
                    <Ionicons
                      name="information-circle"
                      size={16}
                      color="#1A5276"
                    />
                    <Text style={styles.educationHighlightText}>
                      National Reconciliation Week commemorates two significant
                      milestones in the reconciliation journey.
                    </Text>
                  </View>
                )}
                {event.indigenousTags.includes("Cultural Ceremony") && (
                  <View style={styles.educationHighlight}>
                    <Ionicons
                      name="information-circle"
                      size={16}
                      color="#1A5276"
                    />
                    <Text style={styles.educationHighlightText}>
                      This event includes cultural ceremonies. Photography may
                      be restricted during certain performances. Please follow
                      the guidance of event organisers.
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.sectionDivider}>
              <View style={styles.accentBar} />
            </View>
          </>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tickets</Text>
          {event.tiers.map((tier: any, idx: number) => (
            <Pressable
              key={`${tier.name}-${idx}`}
              style={styles.tierCard}
              onPress={() => openTicketModal(idx)}
            >
              <View style={styles.tierInfo}>
                <Text style={styles.tierName}>{tier.name}</Text>
                <Text style={styles.tierAvail}>{tier.available} available</Text>
              </View>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Text style={styles.tierPrice}>
                  {tier.priceCents === 0
                    ? "Free"
                    : `$${(tier.priceCents / 100).toFixed(2)}`}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={Colors.textTertiary}
                />
              </View>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionDivider}>
          <View style={styles.accentBar} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Details</Text>
          <View style={styles.detailRow}>
            <Ionicons
              name="finger-print-outline"
              size={16}
              color={Colors.secondary}
            />
            <Text
              style={[
                styles.detailText,
                { color: Colors.secondary, fontFamily: "Poppins_600SemiBold" },
              ]}
            >
              CPID: {event.cpid}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons
              name="pricetag-outline"
              size={16}
              color={Colors.textSecondary}
            />
            <Text style={styles.detailText}>Category: {event.category}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons
              name="people-outline"
              size={16}
              color={Colors.textSecondary}
            />
            <Text style={styles.detailText}>
              Community: {event.communityTag}
            </Text>
          </View>
          {typeof distanceKm === 'number' && (
            <View style={styles.detailRow}>
              <Ionicons
                name="navigate-outline"
                size={16}
                color={Colors.secondary}
              />
              <Text style={styles.detailText}>
                Distance: {distanceKm.toFixed(1)} km away
              </Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={Colors.textSecondary}
            />
            <Text style={styles.detailText}>
              Refund policy applies. Contact organizer for details.
            </Text>
          </View>
        </View>

        <View style={styles.sectionDivider}>
          <View style={styles.accentBar} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Who&apos;s Going</Text>
          <View style={styles.whosGoingRow}>
            <View style={styles.avatarStack}>
              {Array.from({ length: avatarCount }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.avatarCircle,
                    { marginLeft: i === 0 ? 0 : -12, zIndex: avatarCount - i },
                    {
                      backgroundColor: [
                        Colors.primary,
                        Colors.secondary,
                        Colors.accent,
                        Colors.primaryLight,
                        Colors.secondaryLight,
                      ][i % 5],
                    },
                  ]}
                >
                  <Ionicons name="person" size={14} color={colors.textInverse} />
                </View>
              ))}
            </View>
            <View style={styles.whosGoingInfo}>
              <Text style={styles.whosGoingCount}>
                {event.attending} attending
              </Text>
              {remainingCount > 0 && (
                <Text style={styles.whosGoingOthers}>
                  +{remainingCount} others
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Post-event rating — only shows after the event has ended */}
        {countdown?.ended && (
          <>
            <View style={styles.sectionDivider}>
              <View style={styles.accentBar} />
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Rate this Event</Text>
              {feedbackSubmitted ? (
                <View style={styles.feedbackThanks}>
                  <Ionicons
                    name="checkmark-circle"
                    size={28}
                    color={Colors.secondary}
                  />
                  <Text style={styles.feedbackThanksText}>
                    Thanks for your feedback!
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.feedbackPrompt}>
                    How was {event.title}?
                  </Text>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Pressable
                        key={star}
                        onPress={() => {
                          setFeedbackRating(star);
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light,
                          );
                        }}
                        hitSlop={6}
                      >
                        <Ionicons
                          name={
                            star <= feedbackRating ? "star" : "star-outline"
                          }
                          size={32}
                          color={
                            star <= feedbackRating
                              ? "#F39C12"
                              : Colors.textTertiary
                          }
                        />
                      </Pressable>
                    ))}
                  </View>
                  {feedbackRating > 0 && (
                    <Pressable
                      style={[
                        styles.feedbackSubmitBtn,
                        feedbackSubmitting && { opacity: 0.6 },
                      ]}
                      onPress={handleSubmitFeedback}
                      disabled={feedbackSubmitting}
                    >
                      <Text style={styles.feedbackSubmitText}>
                        {feedbackSubmitting ? "Submitting…" : "Submit Rating"}
                      </Text>
                    </Pressable>
                  )}
                </>
              )}
            </View>
          </>
        )}

        {/* Discovery feedback — always visible */}
        <View style={styles.sectionDivider}>
          <View style={styles.accentBar} />
        </View>
        <View style={[styles.section, styles.discoveryFeedbackRow]}>
          <Text style={styles.discoveryFeedbackLabel}>
            Is this relevant to you?
          </Text>
          <View style={styles.discoveryFeedbackBtns}>
            <Pressable
              style={styles.discoveryFeedbackBtn}
              onPress={() => handleDiscoveryFeedback("up")}
            >
              <Ionicons
                name="thumbs-up-outline"
                size={20}
                color={Colors.secondary}
              />
              <Text
                style={[
                  styles.discoveryFeedbackBtnText,
                  { color: Colors.secondary },
                ]}
              >
                Yes
              </Text>
            </Pressable>
            <Pressable
              style={styles.discoveryFeedbackBtn}
              onPress={() => handleDiscoveryFeedback("down")}
            >
              <Ionicons
                name="thumbs-down-outline"
                size={20}
                color={Colors.textSecondary}
              />
              <Text style={styles.discoveryFeedbackBtnText}>No</Text>
            </Pressable>
          </View>
        </View>

        {relatedEvents.length > 0 && (
          <>
            <View style={styles.sectionDivider}>
              <View style={styles.accentBar} />
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>You Might Also Like</Text>
              {relatedEvents.map((re: any) => (
                <Pressable
                  key={re.id}
                  style={styles.relatedCard}
                  onPress={() => router.push(`/event/${re.id}`)}
                >
                  <Image
                    source={{ uri: re.imageUrl }}
                    style={styles.relatedSwatch}
                  />
                  <View style={styles.relatedInfo}>
                    <Text style={styles.relatedTitle} numberOfLines={1}>
                      {re.title}
                    </Text>
                    <Text style={styles.relatedMeta}>
                      {formatDateShort(re.date)}
                    </Text>
                    <Text style={styles.relatedMeta} numberOfLines={1}>
                      {re.venue}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={Colors.textTertiary}
                  />
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: bottomInset + 14 }]}>
        <View style={styles.priceSection}>
          <Text style={styles.priceFrom}>From</Text>
          <Text style={styles.priceBig}>{event.priceLabel}</Text>
        </View>
        <View style={styles.ticketButtonsRow}>
          {event.externalTicketUrl ? (
            <Pressable
              style={({ pressed }) => [
                styles.externalButton,
                pressed && { opacity: 0.85 },
              ]}
              onPress={handleExternalTickets}
            >
              <Ionicons name="open-outline" size={15} color={Colors.primary} />
              <Text style={styles.externalButtonText}>Organiser Site</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={({ pressed }) => [
              styles.buyButton,
              pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
            ]}
            onPress={handleGetTickets}
          >
            <Ionicons name="ticket" size={20} color={colors.textInverse} />
            <Text style={styles.buyText}>Get Tickets</Text>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={ticketModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setTicketModalVisible(false)}
      >
        <Pressable
          style={modalStyles.overlay}
          onPress={() => setTicketModalVisible(false)}
        >
          <Pressable
            style={modalStyles.sheet}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={modalStyles.handle} />
            <View style={modalStyles.header}>
              <Text style={modalStyles.headerTitle}>Select Tickets</Text>
              <Pressable onPress={() => setTicketModalVisible(false)}>
                <Ionicons
                  name="close-circle"
                  size={28}
                  color={Colors.textTertiary}
                />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={modalStyles.content}
            >
              <Text style={modalStyles.sectionLabel}>How are you booking?</Text>
              <View style={modalStyles.buyModeRow}>
                {(
                  [
                    {
                      key: "single" as const,
                      icon: "person" as const,
                      label: "Single",
                    },
                    {
                      key: "family" as const,
                      icon: "people" as const,
                      label: "Family Pack",
                    },
                    {
                      key: "group" as const,
                      icon: "people-circle" as const,
                      label: "Group",
                    },
                  ] as const
                ).map((mode) => {
                  const active = buyMode === mode.key;
                  return (
                    <Pressable
                      key={mode.key}
                      style={[
                        modalStyles.buyModeBtn,
                        active && modalStyles.buyModeBtnActive,
                      ]}
                      onPress={() => {
                        setBuyMode(mode.key);
                        setQuantity(mode.key === "family" ? 1 : 1);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Ionicons
                        name={mode.icon}
                        size={20}
                        color={active ? Colors.primary : Colors.textSecondary}
                      />
                      <Text
                        style={[
                          modalStyles.buyModeText,
                          active && {
                            color: Colors.primary,
                            fontFamily: "Poppins_600SemiBold",
                          },
                        ]}
                      >
                        {mode.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {buyMode === "family" && (
                <View style={modalStyles.savingsBadge}>
                  <Ionicons name="pricetag" size={14} color="#27AE60" />
                  <Text style={modalStyles.savingsText}>
                    Family of {familySize} — Save 10%
                  </Text>
                </View>
              )}
              {buyMode === "group" && quantity >= 5 && (
                <View style={modalStyles.savingsBadge}>
                  <Ionicons name="pricetag" size={14} color="#27AE60" />
                  <Text style={modalStyles.savingsText}>
                    {quantity >= 10
                      ? "Group of 10+ — Save 15%"
                      : "Group of 5+ — Save 10%"}
                  </Text>
                </View>
              )}

              <Text style={[modalStyles.sectionLabel, { marginTop: 20 }]}>
                Ticket Tier
              </Text>
              {event.tiers.map((tier: any, idx: number) => {
                const isSelected = idx === selectedTierIndex;
                return (
                  <Pressable
                    key={`modal-tier-${idx}`}
                    style={[
                      modalStyles.tierOption,
                      isSelected && modalStyles.tierOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedTierIndex(idx);
                      setQuantity(1);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <View style={modalStyles.tierOptionLeft}>
                      <View
                        style={[
                          modalStyles.radioOuter,
                          isSelected && modalStyles.radioOuterSelected,
                        ]}
                      >
                        {isSelected && <View style={modalStyles.radioInner} />}
                      </View>
                      <View>
                        <Text
                          style={[
                            modalStyles.tierOptionName,
                            isSelected && { color: Colors.primary },
                          ]}
                        >
                          {tier.name}
                        </Text>
                        <Text style={modalStyles.tierOptionAvail}>
                          {tier.available} available
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        modalStyles.tierOptionPrice,
                        isSelected && { color: Colors.primary },
                      ]}
                    >
                      {tier.priceCents === 0
                        ? "Free"
                        : `$${(tier.priceCents / 100).toFixed(2)}`}
                    </Text>
                  </Pressable>
                );
              })}

              {buyMode !== "family" && (
                <>
                  <Text style={[modalStyles.sectionLabel, { marginTop: 20 }]}>
                    {buyMode === "group" ? "Group Size" : "Quantity"}
                  </Text>
                  <View style={modalStyles.quantityRow}>
                    <Pressable
                      style={[
                        modalStyles.quantityBtn,
                        quantity <= 1 && modalStyles.quantityBtnDisabled,
                      ]}
                      onPress={() => {
                        if (quantity > 1) {
                          setQuantity((q) => q - 1);
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light,
                          );
                        }
                      }}
                    >
                      <Ionicons
                        name="remove"
                        size={20}
                        color={
                          quantity <= 1 ? Colors.textTertiary : Colors.primary
                        }
                      />
                    </Pressable>
                    <Text style={modalStyles.quantityText}>{quantity}</Text>
                    <Pressable
                      style={[
                        modalStyles.quantityBtn,
                        quantity >= maxQty && modalStyles.quantityBtnDisabled,
                      ]}
                      onPress={() => {
                        if (quantity < maxQty) {
                          setQuantity((q) => q + 1);
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light,
                          );
                        }
                      }}
                    >
                      <Ionicons
                        name="add"
                        size={20}
                        color={
                          quantity >= maxQty
                            ? Colors.textTertiary
                            : Colors.primary
                        }
                      />
                    </Pressable>
                  </View>
                </>
              )}

              <View style={modalStyles.priceSummary}>
                <View style={modalStyles.priceRow}>
                  <Text style={modalStyles.priceRowLabel}>
                    {effectiveQty}x {selectedTier?.name} @ $
                    {(basePrice / 100).toFixed(2)}
                  </Text>
                  <Text style={modalStyles.priceRowValue}>
                    ${(rawTotal / 100).toFixed(2)}
                  </Text>
                </View>
                {discountAmount > 0 && (
                  <View style={modalStyles.priceRow}>
                    <Text
                      style={[modalStyles.priceRowLabel, { color: "#27AE60" }]}
                    >
                      {buyMode === "family" ? "Family" : "Group"} Discount (
                      {Math.round(discountRate * 100)}%)
                    </Text>
                    <Text
                      style={[modalStyles.priceRowValue, { color: "#27AE60" }]}
                    >
                      -${(discountAmount / 100).toFixed(2)}
                    </Text>
                  </View>
                )}
                <View style={modalStyles.totalDivider} />
                <View style={modalStyles.priceRow}>
                  <Text style={modalStyles.totalLabel}>Total</Text>
                  <Text style={modalStyles.totalValue}>
                    {totalPrice === 0
                      ? "Free"
                      : `A$${(totalPrice / 100).toFixed(2)}`}
                  </Text>
                </View>
              </View>

              {isPlus && totalPrice > 0 && (
                <View style={modalStyles.cashbackNote}>
                  <Ionicons name="star" size={14} color="#2E86C1" />
                  <Text style={modalStyles.cashbackNoteText}>
                    You&apos;ll earn ${cashbackAmount.toFixed(2)} cashback with
                    CulturePass+
                  </Text>
                </View>
              )}

              {!isPlus && totalPrice > 0 && (
                <Pressable
                  style={modalStyles.upgradeNote}
                  onPress={() => {
                    setTicketModalVisible(false);
                    router.push("/membership/upgrade");
                  }}
                >
                  <Ionicons name="star-outline" size={14} color="#2E86C1" />
                  <Text style={modalStyles.upgradeNoteText}>
                    CulturePass+ members earn 2% cashback on tickets
                  </Text>
                  <Ionicons name="chevron-forward" size={12} color="#2E86C1" />
                </Pressable>
              )}

              <Pressable
                style={({ pressed }) => [
                  modalStyles.purchaseBtn,
                  pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                  (purchaseMutation.isPending || paymentLoading) && {
                    opacity: 0.6,
                  },
                ]}
                onPress={handlePurchase}
                disabled={purchaseMutation.isPending || paymentLoading}
              >
                {purchaseMutation.isPending || paymentLoading ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <ActivityIndicator size="small" color={colors.textInverse} />
                    <Text style={modalStyles.purchaseBtnText}>
                      Processing...
                    </Text>
                  </View>
                ) : totalPrice > 0 ? (
                  <>
                    <Ionicons name="card" size={20} color={colors.textInverse} />
                    <Text style={modalStyles.purchaseBtnText}>
                      Pay A${(totalPrice / 100).toFixed(2)}
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="ticket" size={20} color={colors.textInverse} />
                    <Text style={modalStyles.purchaseBtnText}>
                      Get Free{" "}
                      {effectiveQty === 1
                        ? "Ticket"
                        : `${effectiveQty} Tickets`}
                    </Text>
                  </>
                )}
              </Pressable>

              <View style={{ height: bottomInset + 20 }} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
