import { useState, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { Colors, BorderTokens } from '@/constants/theme';
import { useQuery } from '@tanstack/react-query';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { api } from '@/lib/api';
import { useCouncil } from '@/hooks/useCouncil';
import type { EventData } from '@/shared/schema';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useLayout } from '@/hooks/useLayout';
import { useAuth } from "@/lib/auth"

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
function formatPrice(cents: number) {
  return cents === 0 ? 'Free' : `$${(cents / 100).toFixed(0)}`;
}

function toSafeDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function weekdayIndex(day?: string): number | null {
  if (!day) return null;
  const map: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  return map[day.toLowerCase()] ?? null;
}

function nextDateForWeekday(weekday: number, from = new Date()): Date {
  const date = new Date(from);
  const distance = (weekday - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + distance);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { width } = useWindowDimensions();
  const { isDesktop, isTablet } = useLayout();
  const isDesktopWeb = Platform.OS === 'web' && isDesktop;
  const webTopInset = Platform.OS === 'web' ? (isDesktopWeb ? 72 : 0) : insets.top;
  const contentMaxWidth = Platform.OS === 'web'
    ? (isDesktopWeb ? 1280 : isTablet ? 1040 : width)
    : width;
  const contentHorizontalPadding = Platform.OS === 'web' ? (isDesktopWeb ? 24 : 16) : 0;
  const today = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear,  setCurrentYear]  = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { state } = useOnboarding();
  const { data: councilData } = useCouncil();
  const waste = councilData?.waste ?? null;
  const council = councilData?.council;
  const councilEvents = councilData?.events ?? [];

  const { user, isAuthenticated, userId } = useAuth();
  const { data: allEventsRaw = [], isLoading } = useQuery<EventData[]>({
    queryKey: ['/api/events', user?.country, user?.city],
    queryFn: async () => {
      const data = await api.events.list({ city: user?.city, country: user?.country, pageSize: 100 });
      return data.events ?? [];
    },
    enabled: !!user,
  });

  // Fetch user tickets
  const { data: tickets = [] } = useQuery<any[]>({
    queryKey: ['/api/tickets', userId],
    enabled: !!userId,
  })
  // Fetch user RSVPs
  const { data: rsvps = [] } = useQuery<any[]>({
    queryKey: ['/api/user_event_rsvp', userId],
    enabled: !!userId,
  })
  // Fetch user likes
  const { data: likes = [] } = useQuery<any[]>({
    queryKey: ['/api/user_event_likes', userId],
    enabled: !!userId,
  })
  // Fetch council subs
  const { data: councilSubs = [] } = useQuery<any[]>({
    queryKey: ['/api/user_council_subscriptions', userId],
    enabled: !!userId,
  })
  // Fetch interests
  const { data: interests = [] } = useQuery<any[]>({
    queryKey: ['/api/user_interests', userId],
    enabled: !!userId,
  })

  // Merge council events into allEvents
  const allEvents = useMemo(() => {
    const ids = new Set()
    const merged = [...allEventsRaw]
    councilEvents.forEach((ev: any) => {
      if (!ids.has(ev.id)) {
        merged.push(ev)
        ids.add(ev.id)
      }
    })
    return merged
  }, [allEventsRaw, councilEvents])

  // Tab filtering
  const [tab, setTab] = useState("All")
  const [filter, setFilter] = useState("All")
  const [showMap, setShowMap] = useState(false)

  const filteredEvents = useMemo(() => {
    let events = allEvents
    if (filter !== "All") {
      events = events.filter(e => e.category === filter || (e as any).councilId && filter === "Council")
    }
    if (tab === "My Events" && isAuthenticated) {
      const rsvpIds = new Set((rsvps as any[]).map((r: any) => r.eventId))
      events = events.filter(e => rsvpIds.has(e.id))
    }
    if (tab === "Tickets" && isAuthenticated) {
      const ticketIds = new Set((tickets as any[]).map((t: any) => t.eventId))
      events = events.filter(e => ticketIds.has(e.id))
    }
    if (tab === "Council" && isAuthenticated) {
      const councilIds = new Set((councilSubs as any[]).map((s: any) => s.councilId))
      events = events.filter(e => (e as any).councilId && councilIds.has((e as any).councilId))
    }
    if (tab === "Interests" && isAuthenticated) {
      const likeIds = new Set((likes as any[]).map((l: any) => l.eventId))
      const interestTags = new Set((interests as any[]).map((i: any) => i.interestTag))
      events = events.filter(e => likeIds.has(e.id) || (e.tags && e.tags.some((tag: string) => interestTags.has(tag))))
    }
    return events
  }, [tab, filter, allEvents, tickets, rsvps, likes, councilSubs, interests, isAuthenticated])

  const eventsForSelectedDate = useMemo(() => {
    if (!selectedDate) return filteredEvents
    return filteredEvents.filter(e => {
      const eventDate = toSafeDateKey(e.date);
      return eventDate === selectedDate;
    });
  }, [filteredEvents, selectedDate])
  // Calendar grid variables
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth);
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  // Event dates and counts
  const eventDates = useMemo(() => {
    const set = new Set<string>();
    filteredEvents.forEach(e => {
      const dateKey = toSafeDateKey(e.date);
      if (dateKey) set.add(dateKey);
    });
    return set;
  }, [filteredEvents]);

  const eventCountByDate = useMemo(() => {
    const map: Record<string, number> = {};
    filteredEvents.forEach(e => {
      const dateKey = toSafeDateKey(e.date);
      if (dateKey) map[dateKey] = (map[dateKey] || 0) + 1;
    });
    return map;
  }, [filteredEvents]);

  // Selected events for the day
  const selectedEvents = useMemo(() => {
    if (!selectedDate) return [];
    return filteredEvents.filter(e => toSafeDateKey(e.date) === selectedDate);
  }, [filteredEvents, selectedDate]);

  // Upcoming events (next 7 days)
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return filteredEvents.filter(e => {
      const eventDate = toSafeDateKey(e.date);
      if (!eventDate) return false;
      const dateObj = new Date(eventDate + 'T00:00:00');
      return dateObj.getTime() >= now.getTime() && dateObj.getTime() <= now.getTime() + sevenDays;
    });
  }, [filteredEvents]);

  // Civic reminders (council events in current month)
  const civicReminders = useMemo(() => {
    return filteredEvents.filter(e => {
      const eventDate = toSafeDateKey(e.date);
      if (!eventDate) return false;
      const dateObj = new Date(eventDate + 'T00:00:00');
      return (e.category === 'council' || e.category === 'civic' || (e as any).councilId) &&
        dateObj.getMonth() === currentMonth && dateObj.getFullYear() === currentYear;
    }).map(e => ({
      id: e.id,
      title: e.title,
      dateKey: toSafeDateKey(e.date),
      note: e.description,
    }));
  }, [filteredEvents, currentMonth, currentYear]);

  const prevMonth = useCallback(() => {
    Haptics.selectionAsync();
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
    setSelectedDate(null);
  }, [currentMonth]);

  const nextMonth = useCallback(() => {
    Haptics.selectionAsync();
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
    setSelectedDate(null);
  }, [currentMonth]);

  const goToday = useCallback(() => {
    Haptics.selectionAsync();
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDate(null);
  }, [today]);

  const isCurrentMonthToday = currentMonth === today.getMonth() && currentYear === today.getFullYear();

  if (isLoading) {
    return (
      <ErrorBoundary>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
          <View style={{ backgroundColor: '#FFFFFF', borderColor: BorderTokens.black, borderWidth: BorderTokens.widthBold, borderRadius: 20, padding: 32, shadowColor: colors.primary, shadowOpacity: 0.10, shadowRadius: 16, elevation: 4, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.primary, fontFamily: 'Poppins_600SemiBold', fontSize: 16, marginTop: 18 }}>Loading Calendar tab...</Text>
          </View>
        </View>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <View style={[s.container, { paddingTop: webTopInset, backgroundColor: Platform.OS === 'web' ? '#FFFFFF' : colors.background }]}> 
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: 120,
            maxWidth: contentMaxWidth,
            width: '100%',
            alignSelf: 'center',
            paddingHorizontal: contentHorizontalPadding,
          }}
        >

          {/* Header */}
          <View style={s.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[s.headerTitle, { color: colors.text }]}>Calendar</Text>
              <Text style={[s.headerSub, { color: colors.textSecondary }]}>
                {allEvents.length} events this month
              </Text>
            </View>
            {!isCurrentMonthToday && (
              <Pressable style={[s.todayBtn, { backgroundColor: colors.primary }]} onPress={goToday}>
                <Text style={[s.todayBtnText, { color: colors.textInverse }]}>Today</Text>
              </Pressable>
            )}
          </View>

          {/* Summary chips */}
          <View style={s.summaryRow}>
            <View style={[s.chip, { backgroundColor: colors.primaryGlow, borderColor: colors.primary + '30' }]}>
              <Ionicons name="calendar" size={13} color={colors.primary} />
              <Text style={[s.chipText, { color: colors.primary }]}>{allEvents.length} events</Text>
            </View>
            <View style={[s.chip, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <Ionicons name="today" size={13} color={colors.accent} />
              <Text style={[s.chipText, { color: colors.textSecondary }]}>{eventDates.size} days with events</Text>
            </View>
            {isDesktopWeb ? (
              <Pressable style={[s.chip, { backgroundColor: colors.surface, borderColor: colors.borderLight }]} onPress={() => router.push('/(tabs)/council' as never)}>
                <Ionicons name="business-outline" size={13} color={colors.info} />
                <Text style={[s.chipText, { color: colors.textSecondary }]}>Council Events</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={isDesktopWeb ? s.desktopSplit : undefined}>
            <View style={isDesktopWeb ? s.desktopCalendarCol : undefined}>
              {/* Calendar card */}
              <View style={[s.calCard, isDesktopWeb && s.calCardCompact, { backgroundColor: '#FFFFFF', borderColor: colors.borderLight, borderWidth: 1, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 }]}> 
                <View style={s.monthNav}>
                  <Pressable onPress={prevMonth} hitSlop={14} style={[s.navBtn, { backgroundColor: colors.backgroundSecondary }]}>
                    <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
                  </Pressable>
                  <Text style={[s.monthText, { color: colors.text }]}>{MONTHS[currentMonth]} {currentYear}</Text>
                  <Pressable onPress={nextMonth} hitSlop={14} style={[s.navBtn, { backgroundColor: colors.backgroundSecondary }]}>
                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <View style={s.dayHeaders}>
                  {DAYS.map((d) => (
                    <Text key={d} style={[s.dayHeaderText, { color: colors.textTertiary }]}>{d}</Text>
                  ))}
                </View>

                <View style={s.daysGrid}>
                  {days.map((day, idx) => {
                    if (day === null) return <View key={`e-${idx}`} style={[s.dayCell, { borderColor: colors.borderLight, borderWidth: 1 }]} />;
                    const dateKey  = formatDateKey(currentYear, currentMonth, day);
                    const hasEvent = eventDates.has(dateKey);
                    const count    = eventCountByDate[dateKey] ?? 0;
                    const isSelected = selectedDate === dateKey;
                    const isToday    = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

                    let dayTextColor = '#222';
                    if (isSelected) dayTextColor = '#FFF';
                    else if (isToday) dayTextColor = '#007AFF';

                    return (
                      <Pressable
                        key={dateKey}
                        onPress={() => { Haptics.selectionAsync(); setSelectedDate(isSelected ? null : dateKey); }}
                        style={[s.dayCell, { borderColor: colors.borderLight, borderWidth: 1, borderRadius: 12, backgroundColor: '#FFFFFF' },
                          isSelected && { backgroundColor: '#007AFF', borderWidth: 2, borderColor: '#007AFF', shadowColor: '#007AFF', shadowOpacity: 0.12, shadowRadius: 8 },
                          isToday && !isSelected && { backgroundColor: '#E3F0FF', borderWidth: 2, borderColor: '#007AFF' },
                        ]}
                      >
                        <Text style={[s.dayText, { color: dayTextColor, fontWeight: '700', textAlign: 'center' }]}> 
                          {day}
                        </Text>
                        {hasEvent && (
                          <View style={s.dotRow}>
                            {Array.from({ length: Math.min(count, 3) }).map((_, di) => (
                              <View
                                key={di}
                                style={[s.dot, { backgroundColor: isSelected ? '#FFFFFF' : colors.accent, width: 7, height: 7, borderRadius: 3.5 }]}
                              />
                            ))}
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {selectedDate && (
                <View style={s.eventsSection}>
                  <View style={s.sectionRow}>
                    <Text style={[s.sectionTitle, { color: colors.text }]}> 
                      {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </Text>
                    <Text style={[s.sectionCount, { color: colors.textTertiary }]}>{selectedEvents.length} events</Text>
                  </View>
                  {selectedEvents.length === 0 ? (
                    <View style={[s.empty, { backgroundColor: colors.surface }]}> 
                      <Ionicons name="calendar-outline" size={40} color={colors.textTertiary} />
                      <Text style={[s.emptyText, { color: colors.textSecondary }]}>No events in Calendar for this day.</Text>
                    </View>
                  ) : (
                    selectedEvents.map((event) => <EventRow key={event.id} event={event} colors={colors} isAuthenticated={isAuthenticated} />)
                  )}
                </View>
              )}
            </View>

            {isDesktopWeb && (
              <View style={s.desktopUpcomingCol}>
                <View style={s.eventsSectionSide}>
                  <View style={s.sectionRow}>
                    <Text style={[s.sectionTitle, { color: colors.text }]}>Upcoming Events</Text>
                    <Pressable onPress={() => router.push('/allevents' as never)}>
                      <Text style={[s.seeAll, { color: colors.primary }]}>See all</Text>
                    </Pressable>
                  </View>
                  {upcomingEvents.length > 0 ? (
                    upcomingEvents.map((event) => <EventRow key={event.id} event={event} colors={colors} isAuthenticated={isAuthenticated} />)
                  ) : (
                    <View style={[s.empty, { backgroundColor: '#FFFFFF', borderColor: BorderTokens.white, borderWidth: BorderTokens.widthBold }]}> 
                      <Ionicons name="calendar-clear-outline" size={40} color={colors.textTertiary} />
                      <Text style={[s.emptyText, { color: colors.textSecondary }]}>No upcoming events yet.</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>

          {!isDesktopWeb && !selectedDate && upcomingEvents.length > 0 && (
            <View style={s.eventsSection}>
              <View style={s.sectionRow}>
                <Text style={[s.sectionTitle, { color: colors.text }]}>Upcoming Events</Text>
                <Pressable onPress={() => router.push('/allevents' as never)}>
                  <Text style={[s.seeAll, { color: colors.primary }]}>See all</Text>
                </Pressable>
              </View>
              {upcomingEvents.map((event) => <EventRow key={event.id} event={event} colors={colors} isAuthenticated={isAuthenticated} />)}
            </View>
          )}

          {!selectedDate && civicReminders.length > 0 && (
            <View style={s.eventsSection}>
              <View style={s.sectionRow}>
                <Text style={[s.sectionTitle, { color: colors.text }]}>Civic Reminders</Text>
                <Pressable onPress={() => router.push('/(tabs)/council' as never)}>
                  <Text style={[s.seeAll, { color: colors.primary }]}>Council Events</Text>
                </Pressable>
              </View>
              {civicReminders.map((reminder) => (
                <View key={reminder.id} style={[s.civicRow, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                  <View style={[s.civicIcon, { backgroundColor: colors.primaryGlow }]}> 
                    <Ionicons name="business-outline" size={14} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.eventTitle, { color: colors.text }]}>{reminder.title}</Text>
                    <Text style={[s.eventVenue, { color: colors.textSecondary }]}>
                      {new Date(`${reminder.dateKey}T00:00:00`).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' })}
                      {' • '}{reminder.note}
                      {council ? ` • ${council.name}` : ''}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {!isDesktopWeb && !selectedDate && upcomingEvents.length === 0 && (
            <View style={s.eventsSection}>
              <View style={[s.empty, { backgroundColor: colors.surface }]}> 
                <Ionicons name="calendar-clear-outline" size={40} color={colors.textTertiary} />
                <Text style={[s.emptyText, { color: colors.textSecondary }]}>No events in Calendar tab yet.</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </ErrorBoundary>
  );
}

// ---------------------------------------------------------------------------
// Event row
// ---------------------------------------------------------------------------
function EventRow({ event, colors, isAuthenticated }: { event: EventData; colors: ReturnType<typeof useColors>; isAuthenticated: boolean }) {
  const safeDate = toSafeDateKey(event.date);
  const eventDateLabel = safeDate
    ? new Date(`${safeDate}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
    : 'Date TBA';

  // If event is a council event, clicking navigates to My Council
  const isCouncilEvent = event.category === 'council' || event.category === 'Council' || event.category === 'civic';
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isCouncilEvent && isAuthenticated) {
      router.push('/(tabs)/council');
    } else {
      router.push({ pathname: '/event/[id]', params: { id: event.id } });
    }
  };
  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [s.eventRow, { backgroundColor: '#FFFFFF', borderColor: BorderTokens.black, borderWidth: BorderTokens.widthBold, opacity: pressed ? 0.85 : 1, shadowColor: colors.primary, shadowOpacity: pressed ? 0.18 : 0.08, shadowRadius: pressed ? 12 : 8, elevation: 2 }]}
    >
      <Image source={{ uri: event.imageUrl }} style={s.eventImg} contentFit="cover" />

      <View style={s.eventInfo}>
        <Text style={[s.eventTitle, { color: colors.text }]} numberOfLines={1}>{event.title}</Text>
        <View style={s.eventMeta}>
          <Ionicons name="time-outline" size={12} color={colors.primary} />
          <Text style={[s.eventTime, { color: colors.primary }]}> 
            {eventDateLabel} · {event.time || 'Time TBA'}
          </Text>
        </View>
        <View style={s.eventMeta}>
          <Ionicons name="location-outline" size={12} color={colors.textTertiary} />
          <Text style={[s.eventVenue, { color: colors.textSecondary }]} numberOfLines={1}>{event.venue}</Text>
        </View>
      </View>

      <View style={[s.priceChip, { backgroundColor: (event.priceCents ?? 0) === 0 ? colors.success + '15' : colors.primaryGlow }]}> 
        <Text style={[s.priceText, { color: (event.priceCents ?? 0) === 0 ? colors.success : colors.primary }]}> 
          {formatPrice(event.priceCents ?? 0)}
        </Text>
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const s = StyleSheet.create({
  container: { flex: 1 },
  loadingText: { marginTop: 10, fontSize: 14, fontFamily: 'Poppins_500Medium' },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  headerTitle: { fontSize: 28, fontFamily: Platform.OS === 'ios' || Platform.OS === 'macos' ? 'San Francisco' : 'Helvetica Neue', fontWeight: '700', letterSpacing: -0.4, color: '#222', marginBottom: 2 },
  headerSub: { fontSize: 13, fontFamily: Platform.OS === 'ios' || Platform.OS === 'macos' ? 'San Francisco' : 'Helvetica Neue', fontWeight: '400', marginTop: 1, color: '#A3A6AE' },
  todayBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 50 },
  todayBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },

  summaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 14, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 50, borderWidth: 1, backgroundColor: '#F8F9FB', borderColor: '#E3E4E8' },
  chipText: { fontFamily: Platform.OS === 'ios' || Platform.OS === 'macos' ? 'San Francisco' : 'Helvetica Neue', fontWeight: '500', fontSize: 13, color: '#222' },

  calCard: { marginHorizontal: 16, borderRadius: 20, padding: 18, backgroundColor: '#FFFFFF', borderColor: '#E3E4E8', borderWidth: 1, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  calCardCompact: { marginHorizontal: 0, maxWidth: 760 },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  navBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F6FA' },
  monthText: { fontFamily: Platform.OS === 'ios' || Platform.OS === 'macos' ? 'San Francisco' : 'Helvetica Neue', fontWeight: '600', fontSize: 17, color: '#222' },

  dayHeaders: { flexDirection: 'row', marginBottom: 6 },
  dayHeaderText: { flex: 1, textAlign: 'center', fontFamily: Platform.OS === 'ios' || Platform.OS === 'macos' ? 'San Francisco' : 'Helvetica Neue', fontWeight: '600', fontSize: 12, color: '#A3A6AE' },

  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 12, marginVertical: 2, gap: 2, backgroundColor: '#FFFFFF', borderColor: '#E3E4E8', borderWidth: 1 },
  dayCellSelected: { transform: [{ scale: 1.08 }], backgroundColor: '#007AFF', borderWidth: 2, borderColor: '#007AFF' },
  dayText: { fontFamily: Platform.OS === 'ios' || Platform.OS === 'macos' ? 'San Francisco' : 'Helvetica Neue', fontWeight: '500', fontSize: 14, color: '#222' },
  dayTextSelected: { fontWeight: '600', color: '#FFFFFF' },
  dotRow: { flexDirection: 'row', gap: 2 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#007AFF' },

  eventsSection: { paddingHorizontal: 16, paddingTop: 24 },
  eventsSectionSide: { paddingHorizontal: 0, paddingTop: 0 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 19 },
  sectionCount: { fontFamily: 'Poppins_500Medium', fontSize: 13 },
  seeAll: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },

  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 10, borderRadius: 16 },
  emptyText: { fontFamily: 'Poppins_500Medium', fontSize: 15 },

  eventRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, marginBottom: 10, padding: 12, gap: 12, backgroundColor: '#FFFFFF', borderColor: '#E3E4E8', borderWidth: 1, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  eventImg: { width: 60, height: 60, borderRadius: 12 },
  eventInfo: { flex: 1, gap: 3 },
  eventTitle: { fontFamily: Platform.OS === 'ios' || Platform.OS === 'macos' ? 'San Francisco' : 'Helvetica Neue', fontWeight: '600', fontSize: 14 },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventTime: { fontFamily: Platform.OS === 'ios' || Platform.OS === 'macos' ? 'San Francisco' : 'Helvetica Neue', fontWeight: '500', fontSize: 12 },
  eventVenue: { fontFamily: Platform.OS === 'ios' || Platform.OS === 'macos' ? 'San Francisco' : 'Helvetica Neue', fontWeight: '400', fontSize: 12, flexShrink: 1 },
  priceChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#F5F6FA' },
  priceText: { fontFamily: Platform.OS === 'ios' || Platform.OS === 'macos' ? 'San Francisco' : 'Helvetica Neue', fontWeight: '600', fontSize: 12, color: '#007AFF' },
  civicRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 11, marginBottom: 8 },
  civicIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  desktopSplit: { flexDirection: 'row', alignItems: 'flex-start', gap: 20, paddingHorizontal: 16, width: '100%', alignSelf: 'center' },
  desktopCalendarCol: { flex: 1.5 },
  desktopUpcomingCol: { flex: 1, paddingTop: 4 },
});
