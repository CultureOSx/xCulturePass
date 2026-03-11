import { useState, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { CultureTokens, shadows } from '@/constants/theme';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCouncil } from '@/hooks/useCouncil';
import type { EventData } from '@/shared/schema';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useLayout } from '@/hooks/useLayout';
import { useAuth } from '@/lib/auth';
import CalendarTabs from '@/components/calendar/CalendarTabs';
import CalendarFilters from '@/components/calendar/CalendarFilters';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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

function toSafeDateKey(value: string | undefined | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const styles = getStyles(colors);
  
  const { isDesktop, isTablet, width } = useLayout();
  const isWeb = Platform.OS === 'web';
  const isDesktopWeb = isWeb && isDesktop;
  
  const webTopInset = isWeb ? (isDesktopWeb ? 32 : 16) : insets.top;
  const contentMaxWidth = isDesktopWeb ? 1120 : isTablet ? 840 : width;
  const contentHorizontalPadding = isWeb ? (isDesktopWeb ? 32 : 20) : 0;
  
  const today = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  const { data: councilData } = useCouncil();
  const council = councilData?.council;
  const councilEvents = useMemo(() => councilData?.events ?? [], [councilData]);

  const { user, isAuthenticated, userId } = useAuth();
  
  const { data: allEventsRaw = [], isLoading } = useQuery<EventData[]>({
    queryKey: ['/api/events', user?.country, user?.city],
    queryFn: async () => {
      const data = await api.events.list({ city: user?.city, country: user?.country, pageSize: 150 });
      return data.events ?? [];
    },
    enabled: !!user,
  });

  const { data: tickets = [] } = useQuery<any[]>({
    queryKey: ['/api/tickets', userId],
    enabled: !!userId,
  });
  
  const { data: rsvps = [] } = useQuery<any[]>({
    queryKey: ['/api/user_event_rsvp', userId],
    enabled: !!userId,
  });
  
  const { data: likes = [] } = useQuery<any[]>({
    queryKey: ['/api/user_event_likes', userId],
    enabled: !!userId,
  });
  
  const { data: councilSubs = [] } = useQuery<any[]>({
    queryKey: ['/api/user_council_subscriptions', userId],
    enabled: !!userId,
  });
  
  const { data: interests = [] } = useQuery<any[]>({
    queryKey: ['/api/user_interests', userId],
    enabled: !!userId,
  });

  const allEvents = useMemo(() => {
    const ids = new Set();
    const merged = [...allEventsRaw];
    councilEvents.forEach((ev: any) => {
      if (!ids.has(ev.id)) {
        merged.push(ev);
        ids.add(ev.id);
      }
    });
    return merged;
  }, [allEventsRaw, councilEvents]);

  const [tab, setTab] = useState('All');
  const [filter, setFilter] = useState('All');

  const filteredEvents = useMemo(() => {
    let events = allEvents;
    if (filter !== 'All') {
      events = events.filter(e => e.category === filter || (e as any).councilId && filter === 'Council');
    }
    if (tab === 'My Events' && isAuthenticated) {
      const rsvpIds = new Set((rsvps as any[]).map((r: any) => r.eventId));
      events = events.filter(e => rsvpIds.has(e.id));
    }
    if (tab === 'Tickets' && isAuthenticated) {
      const ticketIds = new Set((tickets as any[]).map((t: any) => t.eventId));
      events = events.filter(e => ticketIds.has(e.id));
    }
    if (tab === 'Council' && isAuthenticated) {
      const councilIds = new Set((councilSubs as any[]).map((s: any) => s.councilId));
      events = events.filter(e => (e as any).councilId && councilIds.has((e as any).councilId));
    }
    if (tab === 'Interests' && isAuthenticated) {
      const likeIds = new Set((likes as any[]).map((l: any) => l.eventId));
      const interestTags = new Set((interests as any[]).map((i: any) => i.interestTag));
      events = events.filter(e => likeIds.has(e.id) || (e.tags && e.tags.some((tag: string) => interestTags.has(tag))));
    }
    return events;
  }, [tab, filter, allEvents, tickets, rsvps, likes, councilSubs, interests, isAuthenticated]);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth);
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

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

  const selectedEvents = useMemo(() => {
    if (!selectedDate) return [];
    return filteredEvents.filter(e => toSafeDateKey(e.date) === selectedDate);
  }, [filteredEvents, selectedDate]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return filteredEvents.filter(e => {
      const eventDate = toSafeDateKey(e.date);
      if (!eventDate) return false;
      const dateObj = new Date(`${eventDate}T00:00:00`);
      return dateObj.getTime() >= now.getTime() && dateObj.getTime() <= now.getTime() + sevenDays;
    }).slice(0, 10);
  }, [filteredEvents]);

  const civicReminders = useMemo(() => {
    return filteredEvents.filter(e => {
      const eventDate = toSafeDateKey(e.date);
      if (!eventDate) return false;
      const dateObj = new Date(`${eventDate}T00:00:00`);
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
    if (!isWeb) Haptics.selectionAsync();
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
    setSelectedDate(null);
  }, [currentMonth, isWeb]);

  const nextMonth = useCallback(() => {
    if (!isWeb) Haptics.selectionAsync();
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
    setSelectedDate(null);
  }, [currentMonth, isWeb]);

  const goToday = useCallback(() => {
    if (!isWeb) Haptics.selectionAsync();
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    const todayStr = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());
    setSelectedDate(todayStr);
  }, [today, isWeb]);

  const isCurrentMonthToday = currentMonth === today.getMonth() && currentYear === today.getFullYear();

  if (isLoading) {
    return (
      <ErrorBoundary>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={CultureTokens.indigo} />
            <Text style={styles.loadingText}>Loading Calendar...</Text>
          </View>
        </View>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <View style={[styles.container, { paddingTop: webTopInset }]}> 
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
          {!isDesktopWeb && (
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Calendar</Text>
                <Text style={styles.headerSub}>{allEvents.length} events this month</Text>
              </View>
              {!isCurrentMonthToday && (
                <Pressable style={styles.todayBtn} onPress={goToday}>
                  <Text style={styles.todayBtnText}>Today</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Summary chips */}
          <View style={styles.summaryRow}>
            <View style={styles.chipPrimary}>
              <Ionicons name="calendar" size={14} color={CultureTokens.indigo} />
              <Text style={styles.chipTextPrimary}>{allEvents.length} events</Text>
            </View>
            <View style={styles.chip}>
              <Ionicons name="today" size={14} color={colors.textSecondary} />
              <Text style={styles.chipText}>{eventDates.size} days active</Text>
            </View>
            {isDesktopWeb && (
              <Pressable style={styles.chip} onPress={() => router.push('/(tabs)/council')}>
                <Ionicons name="business-outline" size={14} color={CultureTokens.teal} />
                <Text style={styles.chipText}>Council Events</Text>
              </Pressable>
            )}
          </View>

          <CalendarTabs onChange={setTab} />
          <CalendarFilters onFilter={setFilter} />

          <View style={isDesktopWeb ? styles.desktopSplit : undefined}>
            <View style={isDesktopWeb ? styles.desktopCalendarCol : undefined}>
              {/* Calendar card */}
              <View style={[styles.calCard, isDesktopWeb && styles.calCardCompact]}> 
                <View style={styles.monthNav}>
                  <Pressable onPress={prevMonth} hitSlop={14} style={styles.navBtn}>
                    <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
                  </Pressable>
                  <Text style={styles.monthText}>{MONTHS[currentMonth]} {currentYear}</Text>
                  <Pressable onPress={nextMonth} hitSlop={14} style={styles.navBtn}>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <View style={styles.dayHeaders}>
                  {DAYS.map((d) => <Text key={d} style={styles.dayHeaderText}>{d}</Text>)}
                </View>

                <View style={styles.daysGrid}>
                  {days.map((day, idx) => {
                    if (day === null) return <View key={`e-${idx}`} style={[styles.dayCell, styles.dayCellEmpty]} />;
                    const dateKey  = formatDateKey(currentYear, currentMonth, day);
                    const hasEvent = eventDates.has(dateKey);
                    const count    = eventCountByDate[dateKey] ?? 0;
                    const isSelected = selectedDate === dateKey;
                    const isToday    = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

                    let dayStyle: any = styles.dayCellDefault;
                    let textStyle: any = styles.dayTextDefault;

                    if (isSelected) {
                      dayStyle = styles.dayCellSelected;
                      textStyle = styles.dayTextSelected;
                    } else if (isToday) {
                      dayStyle = styles.dayCellToday;
                      textStyle = styles.dayTextToday;
                    }

                    return (
                      <Pressable
                        key={dateKey}
                        onPress={() => { if(!isWeb) Haptics.selectionAsync(); setSelectedDate(isSelected ? null : dateKey); }}
                        style={[styles.dayCell, dayStyle]}
                      >
                        <Text style={[styles.dayText, textStyle]}>{day}</Text>
                        {hasEvent && (
                          <View style={styles.dotRow}>
                            {Array.from({ length: Math.min(count, 3) }).map((_, di) => (
                              <View key={di} style={[styles.dot, isSelected && styles.dotSelected]} />
                            ))}
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {selectedDate && (
                <View style={styles.eventsSection}>
                  <View style={styles.sectionRow}>
                    <Text style={styles.sectionTitle}> 
                      {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </Text>
                    <Text style={styles.sectionCount}>{selectedEvents.length} events</Text>
                  </View>
                  {selectedEvents.length === 0 ? (
                    <View style={styles.empty}> 
                      <Ionicons name="calendar-outline" size={42} color={colors.textTertiary} />
                      <Text style={styles.emptyText}>No events on this day.</Text>
                    </View>
                  ) : (
                    selectedEvents.map((event) => <EventRow key={event.id} event={event} colors={colors} styles={styles} isAuthenticated={isAuthenticated} isWeb={isWeb} />)
                  )}
                </View>
              )}
            </View>

            {isDesktopWeb && (
              <View style={styles.desktopUpcomingCol}>
                <View style={styles.eventsSectionSide}>
                  <View style={styles.sectionRow}>
                    <Text style={styles.sectionTitle}>Upcoming Events</Text>
                    <Pressable onPress={() => router.push('/allevents')}>
                      <Text style={styles.seeAll}>See all</Text>
                    </Pressable>
                  </View>
                  {upcomingEvents.length > 0 ? (
                    upcomingEvents.map((event) => <EventRow key={event.id} event={event} colors={colors} styles={styles} isAuthenticated={isAuthenticated} isWeb={isWeb} />)
                  ) : (
                    <View style={styles.empty}> 
                      <Ionicons name="calendar-clear-outline" size={42} color={colors.textTertiary} />
                      <Text style={styles.emptyText}>No upcoming events found.</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>

          {!isDesktopWeb && !selectedDate && upcomingEvents.length > 0 && (
            <View style={styles.eventsSection}>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Upcoming Events</Text>
                <Pressable onPress={() => router.push('/allevents')}>
                  <Text style={styles.seeAll}>See all</Text>
                </Pressable>
              </View>
              {upcomingEvents.map((event) => <EventRow key={event.id} event={event} colors={colors} styles={styles} isAuthenticated={isAuthenticated} isWeb={isWeb} />)}
            </View>
          )}

          {!selectedDate && civicReminders.length > 0 && (
            <View style={styles.eventsSection}>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Civic Reminders</Text>
                <Pressable onPress={() => router.push('/(tabs)/council')}>
                  <Text style={styles.seeAll}>Council</Text>
                </Pressable>
              </View>
              {civicReminders.map((reminder) => (
                <View key={reminder.id} style={styles.civicRow}>
                  <View style={styles.civicIcon}> 
                    <Ionicons name="business-outline" size={16} color={CultureTokens.indigo} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eventTitle}>{reminder.title}</Text>
                    <Text style={styles.eventVenue}>
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
            <View style={styles.eventsSection}>
              <View style={styles.empty}> 
                <Ionicons name="calendar-clear-outline" size={42} color={colors.textTertiary} />
                <Text style={styles.emptyText}>No events found.</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </ErrorBoundary>
  );
}

// ---------------------------------------------------------------------------
// Event row component
// ---------------------------------------------------------------------------
function EventRow({ event, colors, styles, isAuthenticated, isWeb }: { event: EventData; colors: ReturnType<typeof useColors>; styles: any; isAuthenticated: boolean; isWeb: boolean }) {
  const safeDate = toSafeDateKey(event.date);
  const eventDateLabel = safeDate
    ? new Date(`${safeDate}T00:00:00`).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
    : 'Date TBA';

  const isCouncilEvent = event.category === 'council' || event.category === 'Council' || event.category === 'civic';
  
  const handlePress = () => {
    if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isCouncilEvent && isAuthenticated) {
      router.push('/(tabs)/council');
    } else {
      router.push({ pathname: '/event/[id]', params: { id: event.id } });
    }
  };
  
  const isFree = (event.priceCents ?? 0) === 0;

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.eventRow, 
        pressed && !isWeb && { transform: [{ scale: 0.98 }] },
        pressed && isWeb && { opacity: 0.9 },
      ]}
    >
      <Image source={{ uri: event.imageUrl }} style={styles.eventImg} contentFit="cover" />

      <View style={styles.eventInfo}>
        <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
        <View style={styles.eventMeta}>
          <Ionicons name="time-outline" size={14} color={CultureTokens.indigo} />
          <Text style={styles.eventTime}>{eventDateLabel} · {event.time || 'Time TBA'}</Text>
        </View>
        <View style={styles.eventMeta}>
          <Ionicons name="location-outline" size={14} color={colors.textTertiary} />
          <Text style={styles.eventVenue} numberOfLines={1}>{event.venue}</Text>
        </View>
      </View>

      <View style={[styles.priceChip, isFree ? styles.priceChipFree : styles.priceChipPaid]}> 
        <Text style={[styles.priceText, isFree ? styles.priceTextFree : styles.priceTextPaid]}> 
          {formatPrice(event.priceCents ?? 0)}
        </Text>
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Styles Implementation
// ---------------------------------------------------------------------------
const getStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  loadingCard: { backgroundColor: colors.surface, borderRadius: 24, padding: 36, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 16, elevation: 4, alignItems: 'center', borderWidth: 1, borderColor: colors.borderLight },
  loadingText: { color: colors.text, fontFamily: 'Poppins_600SemiBold', fontSize: 16, marginTop: 20 },

  headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  headerTitle: { fontSize: 32, fontFamily: 'Poppins_700Bold', letterSpacing: -0.6, marginBottom: 4, color: colors.text },
  headerSub: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: colors.textSecondary },
  
  todayBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 50, backgroundColor: 'rgba(44, 42, 114, 0.1)' },
  todayBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: CultureTokens.indigo },

  summaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 18, flexWrap: 'wrap' },
  chipPrimary: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50, backgroundColor: 'rgba(44, 42, 114, 0.1)', borderWidth: 1, borderColor: 'rgba(44, 42, 114, 0.2)' },
  chipTextPrimary: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: CultureTokens.indigo },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight },
  chipText: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: colors.textSecondary },

  calCard: { marginHorizontal: 20, borderRadius: 24, padding: 24, paddingBottom: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, ...shadows.medium },
  calCardCompact: { marginHorizontal: 0 },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  navBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  monthText: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: colors.text },

  dayHeaders: { flexDirection: 'row', marginBottom: 12 },
  dayHeaderText: { flex: 1, textAlign: 'center', fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },

  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 14, marginVertical: 3, gap: 4, borderWidth: 1 },
  dayCellEmpty: { borderColor: 'transparent' },
  
  dayCellDefault: { backgroundColor: colors.background, borderColor: colors.borderLight },
  dayTextDefault: { color: colors.text },
  
  dayCellSelected: { backgroundColor: CultureTokens.indigo, borderColor: CultureTokens.indigo },
  dayTextSelected: { color: '#FFFFFF' },
  
  dayCellToday: { backgroundColor: 'rgba(44, 42, 114, 0.1)', borderColor: 'rgba(44, 42, 114, 0.25)' },
  dayTextToday: { color: CultureTokens.indigo },

  dayText: { fontFamily: 'Poppins_500Medium', fontSize: 16 },
  dotRow: { flexDirection: 'row', gap: 3, height: 4 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: CultureTokens.saffron },
  dotSelected: { backgroundColor: '#FFFFFF' },

  eventsSection: { paddingHorizontal: 20, paddingTop: 32 },
  eventsSectionSide: { paddingHorizontal: 0, paddingTop: 0 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: colors.text },
  sectionCount: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: colors.textSecondary },
  seeAll: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: CultureTokens.indigo },

  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 14, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight },
  emptyText: { fontFamily: 'Poppins_500Medium', fontSize: 15, color: colors.textSecondary },

  eventRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, marginBottom: 14, padding: 14, gap: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, ...shadows.small },
  eventImg: { width: 72, height: 72, borderRadius: 14 },
  eventInfo: { flex: 1, gap: 6 },
  eventTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: colors.text, letterSpacing: -0.2 },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eventTime: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: CultureTokens.indigo },
  eventVenue: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: colors.textSecondary, flexShrink: 1 },
  
  priceChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  priceChipFree: { backgroundColor: 'rgba(46, 196, 182, 0.15)' },
  priceTextFree: { color: CultureTokens.success },
  priceChipPaid: { backgroundColor: 'rgba(44, 42, 114, 0.15)' },
  priceTextPaid: { color: CultureTokens.indigo },
  priceText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
  
  civicRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, borderRadius: 16, padding: 16, marginBottom: 12, ...shadows.small },
  civicIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(44, 42, 114, 0.1)', alignItems: 'center', justifyContent: 'center' },

  desktopSplit: { flexDirection: 'row', alignItems: 'flex-start', gap: 32, paddingHorizontal: 20, width: '100%', alignSelf: 'center', marginTop: 8 },
  desktopCalendarCol: { flex: 1.5 },
  desktopUpcomingCol: { flex: 1, paddingTop: 4 },
});
