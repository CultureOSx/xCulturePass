import { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { api, type CouncilClaim, type CouncilData } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { InlinePopoverSelect } from '@/components/ui/InlinePopoverSelect';

const STATE_FILTERS = ['ALL', 'NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'] as const;
const VERIFICATION_FILTERS = ['all', 'verified', 'unverified'] as const;
const SORT_FIELDS = ['name', 'state', 'verification'] as const;
const SORT_DIRECTIONS = ['asc', 'desc'] as const;

export default function AdminCouncilClaimsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [councilSearch, setCouncilSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<(typeof STATE_FILTERS)[number]>('ALL');
  const [verificationFilter, setVerificationFilter] = useState<(typeof VERIFICATION_FILTERS)[number]>('all');
  const [sortField, setSortField] = useState<(typeof SORT_FIELDS)[number]>('name');
  const [sortDirection, setSortDirection] = useState<(typeof SORT_DIRECTIONS)[number]>('asc');
  const [showStateMenu, setShowStateMenu] = useState(false);
  const [showVerificationMenu, setShowVerificationMenu] = useState(false);
  const [showSortFieldMenu, setShowSortFieldMenu] = useState(false);
  const [showSortDirectionMenu, setShowSortDirectionMenu] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const normalizedSearch = councilSearch.trim();
  const stateParam = stateFilter === 'ALL' ? undefined : stateFilter;
  const verificationParam = verificationFilter === 'all' ? undefined : verificationFilter;

  const claimsQuery = useQuery({
    queryKey: ['/api/admin/council/claims', 'pending_admin_review'],
    queryFn: () => api.council.admin.listClaims('pending_admin_review'),
  });

  const councilsQuery = useQuery({
    queryKey: ['/api/council/list', 'admin-claim-letter', normalizedSearch, stateParam, verificationParam, sortField, sortDirection, page, pageSize],
    queryFn: () => api.council.list({
      page,
      pageSize,
      q: normalizedSearch || undefined,
      state: stateParam,
      verificationStatus: verificationParam,
      sortBy: sortField,
      sortDir: sortDirection,
    }),
  });

  const closeMenus = () => {
    setShowStateMenu(false);
    setShowVerificationMenu(false);
    setShowSortFieldMenu(false);
    setShowSortDirectionMenu(false);
  };

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['/api/admin/council/claims'] });
  };

  const approveMutation = useMutation({
    mutationFn: (claimId: string) => api.council.admin.approveClaim(claimId),
    onSuccess: refresh,
    onError: () => Alert.alert('Approval failed', 'Unable to approve claim right now.'),
  });

  const rejectMutation = useMutation({
    mutationFn: (claimId: string) => api.council.admin.rejectClaim(claimId, 'Rejected by super admin'),
    onSuccess: refresh,
    onError: () => Alert.alert('Rejection failed', 'Unable to reject claim right now.'),
  });

  const sendLetterMutation = useMutation({
    mutationFn: (payload: { councilId: string; recipientEmail?: string }) =>
      api.council.admin.sendClaimLetter(payload.councilId, payload.recipientEmail),
    onSuccess: (result) => {
      Alert.alert('Claim letter ready', `Claim URL:\n${result.letter.claimUrl}`);
    },
    onError: (error: Error) => {
      Alert.alert('Letter failed', error.message || 'Unable to prepare claim letter right now.');
    },
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === 'web' ? 12 : insets.top + 8 }]}>
      <View style={styles.header}>
        <Button variant="ghost" size="sm" onPress={() => router.back()}>Back</Button>
        <Text style={[styles.title, { color: colors.text }]}>Council claims</Text>
        <View style={{ width: 56 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        onTouchStart={closeMenus}
        onScrollBeginDrag={closeMenus}
        onMomentumScrollBegin={closeMenus}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Send claim letter</Text>
        <TextInput
          value={councilSearch}
          onChangeText={(value) => {
            setCouncilSearch(value);
            setPage(1);
          }}
          placeholder="Search council, suburb, LGA"
          placeholderTextColor={colors.textTertiary}
          style={[styles.searchInput, { color: colors.text, borderColor: colors.borderLight, backgroundColor: colors.backgroundSecondary }]}
        />

        <View style={styles.controlRow}>
          <InlinePopoverSelect
            label="State"
            value={stateFilter}
            valueLabel={stateFilter}
            valueColor={colors.primary}
            options={STATE_FILTERS.map((state) => ({ value: state, label: state }))}
            isOpen={showStateMenu}
            onToggle={() => {
              setShowVerificationMenu(false);
              setShowSortFieldMenu(false);
              setShowSortDirectionMenu(false);
              setShowStateMenu((prev: boolean) => !prev);
            }}
            onSelect={(state) => {
              setStateFilter(state);
              setShowStateMenu(false);
              setPage(1);
            }}
          />

          <InlinePopoverSelect
            label="Verification"
            value={verificationFilter}
            valueLabel={verificationFilter === 'all' ? 'All' : verificationFilter === 'verified' ? 'Verified' : 'Unverified'}
            valueColor={colors.info}
            options={VERIFICATION_FILTERS.map((status) => ({
              value: status,
              label: status === 'all' ? 'All' : status === 'verified' ? 'Verified' : 'Unverified',
            }))}
            isOpen={showVerificationMenu}
            onToggle={() => {
              setShowStateMenu(false);
              setShowSortFieldMenu(false);
              setShowSortDirectionMenu(false);
              setShowVerificationMenu((prev: boolean) => !prev);
            }}
            onSelect={(status) => {
              setVerificationFilter(status);
              setShowVerificationMenu(false);
              setPage(1);
            }}
          />

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
              setShowStateMenu(false);
              setShowVerificationMenu(false);
              setShowSortDirectionMenu(false);
              setShowSortFieldMenu((prev: boolean) => !prev);
            }}
            onSelect={(field) => {
              setSortField(field);
              setShowSortFieldMenu(false);
              setPage(1);
            }}
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
              setShowStateMenu(false);
              setShowVerificationMenu(false);
              setShowSortFieldMenu(false);
              setShowSortDirectionMenu((prev: boolean) => !prev);
            }}
            onSelect={(direction) => {
              setSortDirection(direction);
              setShowSortDirectionMenu(false);
              setPage(1);
            }}
          />
        </View>

        <Text style={[styles.hint, { color: colors.textSecondary }]}>Showing {(councilsQuery.data?.councils ?? []).length} of {councilsQuery.data?.total ?? 0} councils</Text>

        {(councilsQuery.data?.councils ?? []).map((council) => (
          <LetterCard
            key={council.id}
            council={council}
            colors={colors}
            onSend={(recipientEmail) => sendLetterMutation.mutate({ councilId: council.id, recipientEmail })}
            loading={sendLetterMutation.isPending}
          />
        ))}

        <View style={styles.paginationRow}>
          <Button size="sm" variant="secondary" onPress={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1}>
            Prev
          </Button>
          <Text style={[styles.pageText, { color: colors.textSecondary }]}>Page {page}</Text>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => setPage((prev) => prev + 1)}
            disabled={!councilsQuery.data?.hasNextPage}
          >
            Next
          </Button>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 8 }]}>Pending claims</Text>
        {claimsQuery.isLoading ? <Text style={[styles.hint, { color: colors.textSecondary }]}>Loading pending claims…</Text> : null}

        {(claimsQuery.data ?? []).map((claim) => (
          <ClaimCard
            key={claim.id}
            claim={claim}
            colors={colors}
            onApprove={() => approveMutation.mutate(claim.id)}
            onReject={() => rejectMutation.mutate(claim.id)}
            loading={approveMutation.isPending || rejectMutation.isPending}
          />
        ))}

        {!claimsQuery.isLoading && (claimsQuery.data ?? []).length === 0 ? (
          <Text style={[styles.hint, { color: colors.textSecondary }]}>No pending claims.</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

function LetterCard({
  council,
  colors,
  onSend,
  loading,
}: {
  council: CouncilData;
  colors: ReturnType<typeof useColors>;
  onSend: (recipientEmail?: string) => void;
  loading: boolean;
}) {
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}> 
      <Text style={[styles.cardTitle, { color: colors.text }]}>{council.name}</Text>
      <Text style={[styles.cardSub, { color: colors.textSecondary }]}>{council.suburb}, {council.state} · LGA {council.lgaCode}</Text>
      <Text style={[styles.cardSub, { color: colors.textSecondary }]}>Recipient: {council.email || 'No council email on file'}</Text>
      <View style={styles.actions}>
        <Button
          size="sm"
          onPress={() => onSend(council.email)}
          loading={loading}
          disabled={!council.email || loading}
        >
          Send claim letter
        </Button>
      </View>
    </View>
  );
}

function ClaimCard({
  claim,
  colors,
  onApprove,
  onReject,
  loading,
}: {
  claim: CouncilClaim;
  colors: ReturnType<typeof useColors>;
  onApprove: () => void;
  onReject: () => void;
  loading: boolean;
}) {
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}> 
      <Text style={[styles.cardTitle, { color: colors.text }]}>{claim.workEmail}</Text>
      <Text style={[styles.cardSub, { color: colors.textSecondary }]}>Council: {claim.councilId}</Text>
      <Text style={[styles.cardSub, { color: colors.textSecondary }]}>Role: {claim.roleTitle}</Text>
      <Text style={[styles.cardSub, { color: colors.textSecondary }]}>Domain match: {claim.domainMatch ? 'Yes' : 'No'}</Text>
      {claim.note ? <Text style={[styles.cardSub, { color: colors.textSecondary }]}>Note: {claim.note}</Text> : null}
      <View style={styles.actions}>
        <Button size="sm" onPress={onApprove} loading={loading}>Approve</Button>
        <Button size="sm" variant="secondary" onPress={onReject} disabled={loading}>Reject</Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  title: { fontSize: 18, fontFamily: 'Poppins_700Bold' },
  sectionTitle: { fontSize: 14, fontFamily: 'Poppins_700Bold' },
  content: { paddingHorizontal: 16, paddingBottom: 110, gap: 10 },
  searchInput: { borderWidth: 1, borderRadius: 10, height: 42, paddingHorizontal: 12, fontSize: 13, fontFamily: 'Poppins_500Medium' },
  controlRow: { flexDirection: 'row', gap: 8 },
  hint: { fontSize: 13, fontFamily: 'Poppins_500Medium' },
  paginationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  pageText: { fontSize: 12, fontFamily: 'Poppins_500Medium' },
  card: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 4 },
  cardTitle: { fontSize: 14, fontFamily: 'Poppins_700Bold' },
  cardSub: { fontSize: 12, fontFamily: 'Poppins_400Regular' },
  actions: { marginTop: 8, flexDirection: 'row', gap: 8 },
});
