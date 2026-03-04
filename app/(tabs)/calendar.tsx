import { useState, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { Colors } from '@/constants/theme';
import { useQuery } from '@tanstack/react-query';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { api } from '@/lib/api';
import { useCouncil } from '@/hooks/useCouncil';
import type { EventData } from '@/shared/schema';
import { ErrorBoundary } from '@/components/ErrorBoundary';

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
  const isDesktopWeb = Platform.OS === 'web' && width >= 1024;
  const webTopInset = Platform.OS === 'web' ? 0 : 0;
  const today = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear,  setCurrentYear]  = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { state } = useOnboarding();
  const { waste, council } = useCouncil({ city: state.city, country: state.country });

  const { data: allEvents = [], isLoading } = useQuery<EventData[]>({
    queryKey: ['/api/events', state.country, state.city],
    queryFn: async () => {
      const data = await api.events.list({ city: state.city, country: state.country, pageSize: 100 });
      return data.events ?? [];
    },
  });

  // Get unique event dates and count events per date for the dot indicator
  const { eventDates, eventCountByDate } = useMemo(() => {
    const dates = new Set<string>();
    const counts: Record<string, number> = {};
    allEvents.forEach((e) => {
      const safeDate = toSafeDateKey(e.date);
      if (!safeDate) return;
      dates.add(safeDate);
      counts[safeDate] = (counts[safeDate] ?? 0) + 1;
    });
    return { eventDates: dates, eventCountByDate: counts };
  }, [allEvents]);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay    = getFirstDayOfMonth(currentYear, currentMonth);
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const selectedEvents = useMemo(
    () => selectedDate ? allEvents.filter((e) => toSafeDateKey(e.date) === selectedDate) : [],
    [selectedDate, allEvents]
  );

  const upcomingEvents = useMemo(() => {
    const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());
    return allEvents
      .filter((e) => {
        const safeDate = toSafeDateKey(e.date);
        return Boolean(safeDate && safeDate >= todayKey);
      })
      .slice(0, 6);
  }, [allEvents, today]);

  const civicReminders = useMemo(() => {
    if (!waste) return [] as { id: string; title: string; dateKey: string; note: string }[];
    const rows = [
      { id: 'general', day: waste.generalWasteDay, title: 'General Waste Collection', note: waste.frequencyGeneral },
      { id: 'recycling', day: waste.recyclingDay, title: 'Recycling Collection', note: waste.frequencyRecycling },
      { id: 'green', day: waste.greenWasteDay, title: 'Green Waste Collection', note: waste.frequencyGreen ?? 'schedule varies' },
    ].filter((item) => Boolean(item.day));

    return rows
      .map((item) => {
        const weekday = weekdayIndex(item.day);
        if (weekday == null) return null;
        const date = nextDateForWeekday(weekday, today);
        const dateKey = formatDateKey(date.getFullYear(), date.getMonth(), date.getDate());
        return {
          id: item.id,
          title: item.title,
          dateKey,
          note: item.note,
        };
      })
      .filter((item): item is { id: string; title: string; dateKey: string; note: string } => Boolean(item));
  }, [waste, today]);

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
        <View style={[s.container, { paddingTop: insets.top + webTopInset, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[s.loadingText, { color: colors.textSecondary }]}>Loading Calendar tab...</Text>
        </View>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <View style={[s.container, { paddingTop: insets.top + webTopInset, backgroundColor: colors.background }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

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
          </View>

          <View style={isDesktopWeb ? s.desktopSplit : undefined}>
            <View style={isDesktopWeb ? s.desktopCalendarCol : undefined}>
              {/* Calendar card */}
              <View style={[s.calCard, isDesktopWeb && s.calCardCompact, { backgroundColor: colors.surface, shadowColor: '#000', borderColor: colors.borderLight, borderWidth: isDesktopWeb ? 1 : 0 }]}> 
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
                    if (day === null) return <View key={`e-${idx}`} style={s.dayCell} />;
                    const dateKey  = formatDateKey(currentYear, currentMonth, day);
                    const hasEvent = eventDates.has(dateKey);
                    const count    = eventCountByDate[dateKey] ?? 0;
                    const isSelected = selectedDate === dateKey;
                    const isToday    = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

                    return (
                      <Pressable
                        key={dateKey}
                        onPress={() => { Haptics.selectionAsync(); setSelectedDate(isSelected ? null : dateKey); }}
                        style={[
                          s.dayCell,
                          isSelected && [s.dayCellSelected, { backgroundColor: colors.primary }],
                          isToday && !isSelected && { backgroundColor: colors.primaryGlow },
                        ]}
                      >
                        <Text style={[
                          s.dayText,
                          { color: colors.text },
                          isSelected && s.dayTextSelected,
                          isToday && !isSelected && { color: colors.primary, fontFamily: 'Poppins_700Bold' },
                        ]}>
                          {day}
                        </Text>
                        {hasEvent && (
                          <View style={s.dotRow}>
                            {Array.from({ length: Math.min(count, 3) }).map((_, di) => (
                              <View
                                key={di}
                                style={[s.dot, { backgroundColor: isSelected ? colors.textInverse : colors.primary }]}
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
                    selectedEvents.map((event) => <EventRow key={event.id} event={event} colors={colors} />)
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
                    upcomingEvents.map((event) => <EventRow key={event.id} event={event} colors={colors} />)
                  ) : (
                    <View style={[s.empty, { backgroundColor: colors.surface, borderColor: colors.borderLight, borderWidth: 1 }]}> 
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
              {upcomingEvents.map((event) => <EventRow key={event.id} event={event} colors={colors} />)}
            </View>
          )}

          {!selectedDate && civicReminders.length > 0 && (
            <View style={s.eventsSection}>
              <View style={s.sectionRow}>
                <Text style={[s.sectionTitle, { color: colors.text }]}>Civic Reminders</Text>
                <Pressable onPress={() => router.push('/(tabs)/council' as never)}>
                  <Text style={[s.seeAll, { color: colors.primary }]}>Open Council</Text>
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
function EventRow({ event, colors }: { event: EventData; colors: ReturnType<typeof useColors> }) {
  const safeDate = toSafeDateKey(event.date);
  const eventDateLabel = safeDate
    ? new Date(`${safeDate}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
    : 'Date TBA';

  return (
    <Pressable
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/event/[id]', params: { id: event.id } }); }}
      style={({ pressed }) => [s.eventRow, { backgroundColor: colors.surface, opacity: pressed ? 0.85 : 1 }]}
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
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  headerTitle: { fontSize: 28, fontFamily: 'Poppins_700Bold', letterSpacing: -0.4 },
  headerSub: { fontSize: 13, fontFamily: 'Poppins_400Regular', marginTop: 1 },
  todayBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 50 },
  todayBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },

  summaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 14 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 50, borderWidth: 1 },
  chipText: { fontFamily: 'Poppins_500Medium', fontSize: 13 },

  calCard: { marginHorizontal: 16, borderRadius: 20, padding: 18, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 },
  calCardCompact: { marginHorizontal: 0, maxWidth: 760 },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  navBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  monthText: { fontFamily: 'Poppins_600SemiBold', fontSize: 17 },

  dayHeaders: { flexDirection: 'row', marginBottom: 6 },
  dayHeaderText: { flex: 1, textAlign: 'center', fontFamily: 'Poppins_600SemiBold', fontSize: 12 },

  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 12, marginVertical: 2, gap: 2 },
  dayCellSelected: { transform: [{ scale: 1.08 }] },
  dayText: { fontFamily: 'Poppins_500Medium', fontSize: 14 },
  dayTextSelected: { fontFamily: 'Poppins_600SemiBold' },
  dotRow: { flexDirection: 'row', gap: 2 },
  dot: { width: 4, height: 4, borderRadius: 2 },

  eventsSection: { paddingHorizontal: 16, paddingTop: 24 },
  eventsSectionSide: { paddingHorizontal: 0, paddingTop: 0 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 19 },
  sectionCount: { fontFamily: 'Poppins_500Medium', fontSize: 13 },
  seeAll: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },

  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 10, borderRadius: 16 },
  emptyText: { fontFamily: 'Poppins_500Medium', fontSize: 15 },

  eventRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, marginBottom: 10, padding: 12, gap: 12, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, borderWidth: Platform.OS === 'web' ? 1 : 0, borderColor: Colors.borderLight },
  eventImg: { width: 60, height: 60, borderRadius: 12 },
  eventInfo: { flex: 1, gap: 3 },
  eventTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventTime: { fontFamily: 'Poppins_500Medium', fontSize: 12 },
  eventVenue: { fontFamily: 'Poppins_400Regular', fontSize: 12, flexShrink: 1 },
  priceChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  priceText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12 },
  civicRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 11, marginBottom: 8 },
  civicIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  desktopSplit: { flexDirection: 'row', alignItems: 'flex-start', gap: 20, paddingHorizontal: 16, maxWidth: 1120, width: '100%', alignSelf: 'center' },
  desktopCalendarCol: { flex: 1.5 },
  desktopUpcomingCol: { flex: 1, paddingTop: 4 },
});
