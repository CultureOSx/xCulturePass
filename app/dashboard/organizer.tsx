import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/query-client';
import { useAuth } from '@/lib/auth';
import { useLayout } from '@/hooks/useLayout';
import { useRole } from '@/hooks/useRole';
import { CultureTokens } from '@/constants/theme';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { EventData } from '@/shared/schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrganizerStats {
  totalEvents: number;
  publishedEvents: number;
  draftEvents: number;
  totalTicketsSold: number;
  totalRevenueCents: number;
}

interface EventsResponse {
  events: EventData[];
  total?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusColor(status?: string): string {
  switch (status) {
    case 'published': return CultureTokens.success;
    case 'draft': return CultureTokens.saffron;
    case 'deleted': return CultureTokens.coral;
    default: return 'rgba(255,255,255,0.4)';
  }
}

function statusLabel(status?: string): string {
  switch (status) {
    case 'published': return 'Live';
    case 'draft': return 'Draft';
    case 'deleted': return 'Deleted';
    default: return status ?? 'Unknown';
  }
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({ label, value, icon, accent }: { label: string; value: string; icon: string; accent: string }) {
  return (
    <View style={[styles.statCard, { borderColor: accent + '30', backgroundColor: accent + '05' }]}>
      <View style={[styles.statIcon, { backgroundColor: accent + '15' }]}>
        <Ionicons name={icon as never} size={18} color={accent} />
      </View>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Event Row
// ---------------------------------------------------------------------------

function EventRow({
  event,
  onPublish,
  onDelete,
  isPublishing,
  isDeleting,
}: {
  event: EventData;
  onPublish: (id: string) => void;
  onDelete: (id: string) => void;
  isPublishing: boolean;
  isDeleting: boolean;
}) {
  const status = (event as EventData & { status?: string }).status;
  const accentColor = statusColor(status);

  return (
    <View style={[styles.eventRow, status === 'draft' && { borderColor: CultureTokens.saffron + '40', backgroundColor: CultureTokens.saffron + '05' }]}>
      <Pressable
        style={styles.eventRowContent}
        onPress={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })}
      >
        <View style={styles.eventHeaderRow}>
          <Text style={styles.eventTitle} numberOfLines={2}>
            {event.title}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: accentColor + '15' }]}>
            <View style={[styles.statusDot, { backgroundColor: accentColor }]} />
            <Text style={[styles.statusText, { color: accentColor }]}>{statusLabel(status)}</Text>
          </View>
        </View>
        
        <Text style={styles.eventMeta}>
          {formatDate(event.date)} · {event.venue ?? '—'}
        </Text>

        <View style={styles.eventFooter}>
          <View style={styles.eventStats}>
            <Ionicons name="people" size={14} color="rgba(255,255,255,0.4)" />
            <Text style={styles.eventStatText}>
              {event.attending ?? 0}/{event.capacity ?? '∞'}
            </Text>
          </View>
          <Text style={styles.eventPrice}>
            {event.isFree ? 'Free' : event.priceLabel ?? formatCurrency(event.priceCents ?? 0)}
          </Text>
        </View>
      </Pressable>

      {/* Action buttons — only for non-deleted events */}
      {status !== 'deleted' && (
        <View style={styles.eventActions}>
          {status === 'draft' && (
            <Pressable
              style={[styles.actionBtn, { backgroundColor: CultureTokens.success + '15' }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPublish(event.id);
              }}
              disabled={isPublishing}
            >
              {isPublishing ? (
                <ActivityIndicator size={14} color={CultureTokens.success} />
              ) : (
                <Ionicons name="cloud-upload" size={16} color={CultureTokens.success} />
              )}
              <Text style={[styles.actionBtnText, { color: CultureTokens.success }]}>Publish</Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.actionBtn, { backgroundColor: CultureTokens.coral + '15' }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onDelete(event.id);
            }}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size={14} color={CultureTokens.coral} />
            ) : (
              <Ionicons name="trash" size={16} color={CultureTokens.coral} />
            )}
            <Text style={[styles.actionBtnText, { color: CultureTokens.coral }]}>Delete</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

function OrganizerDashboardContent() {
  const insets = useSafeAreaInsets();
  const { hPad } = useLayout();
  const { userId, user } = useAuth();
  const { isOrganizer, isLoading: roleLoading } = useRole();

  useEffect(() => {
    if (!roleLoading && !isOrganizer) {
      router.replace('/(tabs)');
    }
  }, [isOrganizer, roleLoading]);

  const topPad = Platform.OS === 'web' ? 0 : insets.top;

  // My events
  const {
    data: eventsData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<EventsResponse>({
    queryKey: ['/api/events', { organizerId: userId }],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/events?organizerId=${userId}&page=1&pageSize=50`);
      return res.json();
    },
    enabled: !!userId,
  });

  const events: EventData[] = eventsData?.events ?? [];

  // Compute stats locally from event data
  const stats: OrganizerStats = {
    totalEvents: events.length,
    publishedEvents: events.filter((e) => (e as EventData & { status?: string }).status === 'published').length,
    draftEvents: events.filter((e) => (e as EventData & { status?: string }).status === 'draft').length,
    totalTicketsSold: events.reduce((sum, e) => sum + (e.attending ?? 0), 0),
    totalRevenueCents: events.reduce(
      (sum, e) => sum + (e.priceCents ?? 0) * (e.attending ?? 0),
      0
    ),
  };

  // Publish event
  const publishMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const res = await apiRequest('POST', `/api/events/${eventId}/publish`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', { organizerId: userId }] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  });

  // Delete (soft) event
  const deleteMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const res = await apiRequest('DELETE', `/api/events/${eventId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', { organizerId: userId }] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  });

  function handleDelete(eventId: string) {
    Alert.alert(
      'Delete Event',
      'Are you sure? This will soft-delete the event and hide it from all users.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(eventId),
        },
      ]
    );
  }

  const sortedEvents = [...events].sort((a, b) => {
    // Draft first, then published, then deleted
    const order = { draft: 0, published: 1, deleted: 2 };
    const sa = (a as EventData & { status?: string }).status ?? 'published';
    const sb = (b as EventData & { status?: string }).status ?? 'published';
    return (order[sa as keyof typeof order] ?? 1) - (order[sb as keyof typeof order] ?? 1);
  });

  return (
    <View style={styles.container}>
      <LinearGradient colors={['rgba(44, 42, 114, 0.25)', '#0B0B14']} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
      <View style={[styles.orb, { top: -50, right: -100, backgroundColor: CultureTokens.indigo, opacity: 0.15, ...Platform.select({ web: { filter: 'blur(80px)' }, default: {} }) } as any]} />
      <View style={[styles.orb, { top: 400, left: -100, backgroundColor: CultureTokens.saffron, opacity: 0.1, ...Platform.select({ web: { filter: 'blur(100px)' }, default: {} }) } as any]} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, paddingHorizontal: hPad }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Organizer Dashboard</Text>
          {user?.displayName && (
            <Text style={styles.headerSub}>{user.displayName}</Text>
          )}
        </View>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/submit');
          }}
          style={styles.createBtn}
        >
          <Ionicons name="add" size={24} color={CultureTokens.indigo} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: hPad }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={CultureTokens.indigo} />
        }
      >
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Pressable
            style={[styles.quickAction, { backgroundColor: CultureTokens.indigo + '15', borderColor: CultureTokens.indigo + '30' }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/submit');
            }}
          >
            <Ionicons name="calendar" size={20} color={CultureTokens.indigo} />
            <Text style={[styles.quickActionText, { color: CultureTokens.indigo }]}>Create Event</Text>
          </Pressable>

          <Pressable
            style={[styles.quickAction, { backgroundColor: CultureTokens.teal + '15', borderColor: CultureTokens.teal + '30' }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/scanner');
            }}
          >
            <Ionicons name="qr-code" size={20} color={CultureTokens.teal} />
            <Text style={[styles.quickActionText, { color: CultureTokens.teal }]}>Scan Tickets</Text>
          </Pressable>

          <Pressable
            style={[styles.quickAction, { backgroundColor: CultureTokens.coral + '15', borderColor: CultureTokens.coral + '30' }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/tickets');
            }}
          >
            <Ionicons name="ticket" size={20} color={CultureTokens.coral} />
            <Text style={[styles.quickActionText, { color: CultureTokens.coral }]}>All Tickets</Text>
          </Pressable>
        </View>

        {/* Stats Row */}
        {!isLoading && (
          <View style={styles.statsRow}>
            <StatCard
              label="Total Events"
              value={String(stats.totalEvents)}
              icon="calendar"
              accent={CultureTokens.indigo}
            />
            <StatCard
              label="Published"
              value={String(stats.publishedEvents)}
              icon="radio-button-on"
              accent={CultureTokens.success}
            />
            <StatCard
              label="Attending"
              value={String(stats.totalTicketsSold)}
              icon="people"
              accent={CultureTokens.teal}
            />
            <StatCard
              label="Revenue"
              value={formatCurrency(stats.totalRevenueCents)}
              icon="wallet"
              accent={CultureTokens.gold}
            />
          </View>
        )}

        {/* Events Section */}
        <View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Events</Text>
            {stats.draftEvents > 0 && (
              <View style={[styles.draftBadge, { backgroundColor: CultureTokens.saffron + '15' }]}>
                <Text style={styles.draftBadgeText}>
                  {stats.draftEvents} draft{stats.draftEvents > 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={CultureTokens.indigo} size="large" />
              <Text style={styles.loadingText}>Loading your events…</Text>
            </View>
          ) : sortedEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBg}>
                <Ionicons name="calendar-outline" size={48} color="rgba(255,255,255,0.4)" />
              </View>
              <Text style={styles.emptyTitle}>No events yet</Text>
              <Text style={styles.emptySubtitle}>
                Create your first event to get started.
              </Text>
              <Pressable
                style={styles.emptyBtn}
                onPress={() => router.push('/submit')}
              >
                <Text style={styles.emptyBtnText}>Create Event</Text>
              </Pressable>
            </View>
          ) : (
            sortedEvents.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                onPublish={(id) => publishMutation.mutate(id)}
                onDelete={handleDelete}
                isPublishing={publishMutation.isPending && publishMutation.variables === event.id}
                isDeleting={deleteMutation.isPending && deleteMutation.variables === event.id}
              />
            ))
          )}
        </View>

        <View style={{ height: insets.bottom + 32 }} />
      </ScrollView>
    </View>
  );
}

export default function OrganizerDashboard() {
  return (
    <ErrorBoundary>
      <OrganizerDashboardContent />
    </ErrorBoundary>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B14' },
  orb: { position: 'absolute', width: 350, height: 350, borderRadius: 175 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    gap: 16,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: '#FFFFFF', letterSpacing: -0.3 },
  headerSub: { fontSize: 13, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  createBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CultureTokens.indigo + '20',
  },
  scroll: { paddingTop: 4, gap: 24 },
  quickActions: { flexDirection: 'row', gap: 12 },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  quickActionText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    width: '48%',
    flexGrow: 1,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  statIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statValue: { fontSize: 24, fontFamily: 'Poppins_700Bold', letterSpacing: -0.5, marginBottom: 2 },
  statLabel: { fontSize: 13, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.6)' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  draftBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  draftBadgeText: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: CultureTokens.saffron },
  eventRow: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
    marginBottom: 12,
  },
  eventRowContent: { padding: 18, gap: 8 },
  eventHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: 'Poppins_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5 },
  eventTitle: { fontSize: 16, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF', lineHeight: 22, flex: 1 },
  eventMeta: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.6)' },
  eventFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  eventStats: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eventStatText: { fontSize: 13, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.5)' },
  eventPrice: { fontSize: 15, fontFamily: 'Poppins_700Bold', color: CultureTokens.indigo },
  eventActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  loadingContainer: { alignItems: 'center', paddingVertical: 60, gap: 16 },
  loadingText: { fontSize: 15, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.6)' },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    marginTop: 10,
  },
  emptyIconBg: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: '#FFFFFF', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 20 },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, backgroundColor: CultureTokens.indigo },
  emptyBtnText: { color: '#0B0B14', fontFamily: 'Poppins_700Bold', fontSize: 15 },
});
