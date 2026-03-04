import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useRole } from '@/hooks/useRole';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { InlinePopoverSelect } from '@/components/ui/InlinePopoverSelect';

const STATE_FILTERS = ['ALL', 'NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'] as const;
const VERIFICATION_FILTERS = ['all', 'verified', 'unverified'] as const;
const SORT_FIELDS = ['name', 'state', 'verification'] as const;
const SORT_DIRECTIONS = ['asc', 'desc'] as const;

function StatCard({ label, value, icon, color, mutedColor }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap; color: string; mutedColor: string }) {
  return (
    <View style={[styles.statCard, { borderColor: color + '55' }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '1A' }]}>
        <Ionicons name={icon} size={14} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: mutedColor }]}>{label}</Text>
    </View>
  );
}

export default function AdminCouncilManagementScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isAdmin, isLoading: roleLoading } = useRole();
  const [stateFilter, setStateFilter] = useState<(typeof STATE_FILTERS)[number]>('ALL');
  const [verificationFilter, setVerificationFilter] = useState<(typeof VERIFICATION_FILTERS)[number]>('all');
  const [sortField, setSortField] = useState<(typeof SORT_FIELDS)[number]>('name');
  const [sortDirection, setSortDirection] = useState<(typeof SORT_DIRECTIONS)[number]>('asc');
  const [showSortFieldMenu, setShowSortFieldMenu] = useState(false);
  const [showSortDirectionMenu, setShowSortDirectionMenu] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const normalizedSearch = searchText.trim();
  const stateParam = stateFilter === 'ALL' ? undefined : stateFilter;
  const verificationParam = verificationFilter === 'all' ? undefined : verificationFilter;

  const councilsQuery = useQuery({
    queryKey: ['/api/council/list', 'admin-management', stateParam, verificationParam, normalizedSearch, sortField, sortDirection, page, pageSize],
    queryFn: () => api.council.list({
      state: stateParam,
      verificationStatus: verificationParam,
      q: normalizedSearch || undefined,
      sortBy: sortField,
      sortDir: sortDirection,
      page,
      pageSize,
    }),
    enabled: isAdmin,
  });

  const summaryCouncilsQuery = useQuery({
    queryKey: ['/api/council/list', 'admin-management-summary'],
    queryFn: () => api.council.list({ pageSize: 200 }),
    enabled: isAdmin,
  });

  const pendingClaimsQuery = useQuery({
    queryKey: ['/api/admin/council/claims', 'pending_admin_review', 'admin-management'],
    queryFn: () => api.council.admin.listClaims('pending_admin_review'),
    enabled: isAdmin,
  });

  if (!roleLoading && !isAdmin) {
    router.replace('/(tabs)');
    return null;
  }

  const councils = councilsQuery.data?.councils ?? [];
  const total = councilsQuery.data?.total ?? 0;
  const hasNextPage = councilsQuery.data?.hasNextPage ?? false;
  const pendingClaims = pendingClaimsQuery.data ?? [];
  const summaryCouncils = summaryCouncilsQuery.data?.councils ?? [];
  const verifiedCount = summaryCouncils.filter((item) => item.verificationStatus === 'verified').length;
  const unverifiedCount = summaryCouncils.filter((item) => item.verificationStatus !== 'verified').length;

  const applyStateFilter = (state: (typeof STATE_FILTERS)[number]) => {
    setStateFilter(state);
    setPage(1);
  };

  const applyVerificationFilter = (status: (typeof VERIFICATION_FILTERS)[number]) => {
    setVerificationFilter(status);
    setPage(1);
  };

  const applySortField = (value: (typeof SORT_FIELDS)[number]) => {
    setSortField(value);
    setShowSortFieldMenu(false);
    setPage(1);
  };

  const applySortDirection = (value: (typeof SORT_DIRECTIONS)[number]) => {
    setSortDirection(value);
    setShowSortDirectionMenu(false);
    setPage(1);
  };

  const closeSortMenus = () => {
    setShowSortFieldMenu(false);
    setShowSortDirectionMenu(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === 'web' ? 12 : insets.top + 8 }]}>
      <View style={styles.header}>
        <Button variant="ghost" size="sm" onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>Back</Button>
        <Text style={[styles.title, { color: colors.text }]}>Council Management</Text>
        <View style={{ width: 56 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        onTouchStart={closeSortMenus}
        onScrollBeginDrag={closeSortMenus}
        onMomentumScrollBegin={closeSortMenus}
      >
        <View style={styles.statsRow}>
          <StatCard label="Councils" value={String(councils.length)} icon="business-outline" color={colors.primary} mutedColor={colors.textTertiary} />
          <StatCard label="Pending Claims" value={String(pendingClaims.length)} icon="time-outline" color={colors.warning} mutedColor={colors.textTertiary} />
          <StatCard label="Verified" value={String(verifiedCount)} icon="checkmark-circle-outline" color={colors.success} mutedColor={colors.textTertiary} />
          <StatCard label="Unverified" value={String(unverifiedCount)} icon="alert-circle-outline" color={colors.error} mutedColor={colors.textTertiary} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Admin Actions</Text>
          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>Invite councils to claim, review claims, and manage council operations.</Text>
          <View style={styles.actions}>
            <Button onPress={() => router.push('/admin/council-claims')}>Open Council Claims</Button>
            <Button variant="secondary" onPress={() => router.push('/dashboard/council')}>Open Council Ops Dashboard</Button>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Councils Snapshot</Text>
          <TextInput
            value={searchText}
            onChangeText={(value) => {
              setSearchText(value);
              setPage(1);
            }}
            placeholder="Search council, suburb, LGA"
            placeholderTextColor={colors.textTertiary}
            style={[styles.searchInput, { color: colors.text, borderColor: colors.borderLight, backgroundColor: colors.backgroundSecondary }]}
          />

          <View style={styles.filterRow}>
            {STATE_FILTERS.map((state) => {
              const active = stateFilter === state;
              return (
                <Pressable
                  key={state}
                  onPress={() => applyStateFilter(state)}
                  style={[styles.filterChip, { borderColor: active ? colors.primary : colors.borderLight, backgroundColor: active ? colors.primary + '1A' : colors.backgroundSecondary }]}
                >
                  <Text style={[styles.filterChipText, { color: active ? colors.primary : colors.textSecondary }]}>{state}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.filterRow}>
            {VERIFICATION_FILTERS.map((status) => {
              const active = verificationFilter === status;
              const label = status === 'all' ? 'All' : status === 'verified' ? 'Verified' : 'Unverified';
              return (
                <Pressable
                  key={status}
                  onPress={() => applyVerificationFilter(status)}
                  style={[styles.filterChip, { borderColor: active ? colors.info : colors.borderLight, backgroundColor: active ? colors.info + '1A' : colors.backgroundSecondary }]}
                >
                  <Text style={[styles.filterChipText, { color: active ? colors.info : colors.textSecondary }]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.sortControlRow}>
            <InlinePopoverSelect
              label="Sort"
              value={sortField}
              valueLabel={sortField === 'name' ? 'Name' : sortField === 'state' ? 'State' : 'Verification'}
              valueColor={colors.secondary}
              options={SORT_FIELDS.map((field) => ({
                value: field,
                label: field === 'name' ? 'Name' : field === 'state' ? 'State' : 'Verification',
              }))}
              isOpen={showSortFieldMenu}
              onToggle={() => {
                setShowSortDirectionMenu(false);
                setShowSortFieldMenu((prev) => !prev);
              }}
              onSelect={applySortField}
            />

            <InlinePopoverSelect
              label="Order"
              value={sortDirection}
              valueLabel={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
              valueColor={colors.primary}
              options={SORT_DIRECTIONS.map((direction) => ({
                value: direction,
                label: direction === 'asc' ? 'Ascending' : 'Descending',
              }))}
              isOpen={showSortDirectionMenu}
              onToggle={() => {
                setShowSortFieldMenu(false);
                setShowSortDirectionMenu((prev) => !prev);
              }}
              onSelect={applySortDirection}
            />
          </View>

          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>Showing {councils.length} of {total} councils</Text>

          {councils.map((council) => (
            <View key={council.id} style={[styles.row, { borderColor: colors.borderLight }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>{council.name}</Text>
                <Text style={[styles.rowSub, { color: colors.textSecondary }]}>{council.suburb}, {council.state} · LGA {council.lgaCode}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: council.verificationStatus === 'verified' ? colors.success + '22' : colors.warning + '22' }]}>
                <Text style={[styles.badgeText, { color: council.verificationStatus === 'verified' ? colors.success : colors.warning }]}>
                  {council.verificationStatus === 'verified' ? 'Verified' : 'Unverified'}
                </Text>
              </View>
            </View>
          ))}

          <View style={styles.paginationRow}>
            <Button size="sm" variant="secondary" onPress={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1}>
              Prev
            </Button>
            <Text style={[styles.pageText, { color: colors.textSecondary }]}>Page {page}</Text>
            <Button size="sm" variant="secondary" onPress={() => setPage((prev) => prev + 1)} disabled={!hasNextPage}>
              Next
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  title: { fontSize: 18, fontFamily: 'Poppins_700Bold' },
  content: { paddingHorizontal: 16, paddingBottom: 110, gap: 12 },
  statsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statCard: { minWidth: 138, flexGrow: 1, borderWidth: 1, borderRadius: 12, padding: 10, gap: 4 },
  statIcon: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 18, fontFamily: 'Poppins_700Bold' },
  statLabel: { fontSize: 11, fontFamily: 'Poppins_500Medium' },
  card: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 },
  cardTitle: { fontSize: 14, fontFamily: 'Poppins_700Bold' },
  cardSub: { fontSize: 12, fontFamily: 'Poppins_400Regular' },
  searchInput: { borderWidth: 1, borderRadius: 10, height: 42, paddingHorizontal: 12, fontSize: 13, fontFamily: 'Poppins_500Medium' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filterChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  filterChipText: { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
  sortControlRow: { flexDirection: 'row', gap: 8 },
  actions: { gap: 8 },
  row: { borderWidth: 1, borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  rowSub: { fontSize: 12, fontFamily: 'Poppins_400Regular' },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
  paginationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  pageText: { fontSize: 12, fontFamily: 'Poppins_500Medium' },
});
