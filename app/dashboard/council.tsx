import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { useCouncil } from '@/hooks/useCouncil';
import { useRole } from '@/hooks/useRole';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '@/constants/theme';

function Stat({ label, value, color, mutedColor }: { label: string; value: string; color: string; mutedColor: string }) {
  return (
    <View style={[styles.statCard, { borderColor: color + '50' }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: mutedColor }]}>{label}</Text>
    </View>
  );
}

export default function CouncilDashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { isAdmin, isOrganizer, isLoading: roleLoading } = useRole();
  const councilHook = useCouncil();
  const council = councilHook.data?.council;
  const activeAlerts = councilHook.data?.alerts ?? [];
  const openGrants = councilHook.data?.grants ?? [];
  const facilities = councilHook.data?.facilities ?? [];
  const links = councilHook.data?.links ?? [];
  const waste = councilHook.data?.waste ?? null;
  const following = councilHook.data?.following ?? false;
  const isLoading = councilHook.isLoading;
  const refetch = councilHook.refetch;

  const myClaimsQuery = useQuery({
    queryKey: ['/api/council/claims/me', council?.id],
    queryFn: () => api.council.myClaims(council!.id),
    enabled: Boolean(council?.id),
  });
  const hasApprovedClaim = (myClaimsQuery.data ?? []).some((claim) => claim.status === 'approved');
  const canAccess = isAdmin || isOrganizer || hasApprovedClaim;
  const canCrud = isAdmin || hasApprovedClaim;

  const refreshCouncil = async () => {
    await queryClient.invalidateQueries({ queryKey: ['/api/council/my'] });
    await refetch();
  };

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!council) throw new Error('No council resolved');
      if (following) return api.council.unfollow(council.id);
      return api.council.follow(council.id);
    },
    onSuccess: refreshCouncil,
    onError: () => Alert.alert('Action failed', 'Unable to update follow status right now.'),
  });

  const createAlertMutation = useMutation({
    mutationFn: async () => {
      if (!council) throw new Error('No council resolved');
      return api.council.admin.createAlert(council.id, {
        title: 'Community safety update',
        description: 'Please check local council website for live updates.',
        category: 'community_notice',
        severity: 'medium',
        startAt: new Date().toISOString(),
        status: 'active',
      });
    },
    onSuccess: refreshCouncil,
    onError: () => Alert.alert('Create failed', 'Could not create council alert.'),
  });

  const createGrantMutation = useMutation({
    mutationFn: async () => {
      if (!council) throw new Error('No council resolved');
      return api.council.admin.createGrant(council.id, {
        title: 'Cultural activation micro-grant',
        description: 'Funding support for local cultural programming.',
        category: 'multicultural',
        fundingMin: 500,
        fundingMax: 5000,
        status: 'open',
      });
    },
    onSuccess: refreshCouncil,
    onError: () => Alert.alert('Create failed', 'Could not create council grant.'),
  });

  const archiveAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      if (!council) throw new Error('No council resolved');
      return api.council.admin.updateAlert(council.id, alertId, { status: 'archived' });
    },
    onSuccess: refreshCouncil,
  });

  const closeGrantMutation = useMutation({
    mutationFn: async (grantId: string) => {
      if (!council) throw new Error('No council resolved');
      return api.council.admin.updateGrant(council.id, grantId, { status: 'closed' });
    },
    onSuccess: refreshCouncil,
  });

  if (!roleLoading && !myClaimsQuery.isLoading && !canAccess) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}> 
        <Text style={[styles.title, { color: colors.text }]}>Council Dashboard</Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>Approved council claimant, admin, or organizer access required.</Text>
        <Button onPress={() => router.replace('/(tabs)')}>Back to Discover</Button>
      </View>
    );
  }

  if (isLoading || !council) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}> 
        <Text style={[styles.sub, { color: colors.textSecondary }]}>Loading council dashboard…</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === 'web' ? 12 : insets.top + 8 }]}> 
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={gradients.culturepassBrand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.textInverse }]}>{council.name}</Text>
              <Text style={[styles.sub, { color: colors.textInverse }]}>{council.state} • LGA {council.lgaCode}</Text>
            </View>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => followMutation.mutate()}
              loading={followMutation.isPending}
            >
              {following ? 'Following' : 'Follow'}
            </Button>
          </LinearGradient>

          <View style={styles.statsRow}>
            <Stat label="Active Alerts" value={String(activeAlerts.length)} color={colors.error} mutedColor={colors.textTertiary} />
            <Stat label="Open Grants" value={String(openGrants.length)} color={colors.success} mutedColor={colors.textTertiary} />
            <Stat label="Facilities" value={String(facilities.length)} color={colors.primary} mutedColor={colors.textTertiary} />
            <Stat label="Links" value={String(links.length)} color={colors.warning} mutedColor={colors.textTertiary} />
          </View>

          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Operations</Text>
            <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>Create and monitor council civic content.</Text>
            <View style={styles.rowActions}>
              <Button size="sm" onPress={() => createAlertMutation.mutate()} loading={createAlertMutation.isPending} disabled={!canCrud}>Create Alert</Button>
              <Button size="sm" variant="secondary" onPress={() => createGrantMutation.mutate()} loading={createGrantMutation.isPending} disabled={!canCrud}>Create Grant</Button>
              {isAdmin ? <Button size="sm" variant="outline" onPress={() => router.push('/admin/council-claims')}>Review Claims</Button> : null}
            </View>
            {waste ? (
              <Text style={[styles.muted, { color: colors.textSecondary }]}>Waste schedule: General {waste.generalWasteDay}, Recycling {waste.recyclingDay}</Text>
            ) : (
              <Text style={[styles.muted, { color: colors.textSecondary }]}>No waste schedule available for this council.</Text>
            )}
          </View>

          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Alerts (Manage)</Text>
            {activeAlerts.length === 0 ? (
              <Text style={[styles.muted, { color: colors.textSecondary }]}>No active alerts.</Text>
            ) : activeAlerts.map((alert: any) => (
              <View key={alert.id} style={[styles.item, { borderColor: colors.borderLight }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>{alert.title}</Text>
                  <Text style={[styles.itemSub, { color: colors.textSecondary }]}>{alert.category} • {alert.severity}</Text>
                </View>
                <Pressable
                  style={styles.iconBtn}
                  onPress={() => archiveAlertMutation.mutate(alert.id)}
                  disabled={!canCrud}
                  accessibilityRole="button"
                  accessibilityLabel="Archive alert"
                >
                  <Ionicons name="archive-outline" size={16} color={colors.warning} />
                </Pressable>
              </View>
            ))}
          </View>

          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Grants (Manage)</Text>
            {openGrants.length === 0 ? (
              <Text style={[styles.muted, { color: colors.textSecondary }]}>No open grants.</Text>
            ) : openGrants.map((grant: any) => (
              <View key={grant.id} style={[styles.item, { borderColor: colors.borderLight }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>{grant.title}</Text>
                  <Text style={[styles.itemSub, { color: colors.textSecondary }]}>{grant.category} • {grant.status}</Text>
                </View>
                <Pressable
                  style={styles.iconBtn}
                  onPress={() => closeGrantMutation.mutate(grant.id)}
                  disabled={!canCrud}
                  accessibilityRole="button"
                  accessibilityLabel="Close grant"
                >
                  <Ionicons name="checkmark-done-outline" size={16} color={colors.success} />
                </Pressable>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 110, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  heroCard: { borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerCard: { borderWidth: 1, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 18, fontFamily: 'Poppins_700Bold' },
  sub: { fontSize: 13, fontFamily: 'Poppins_400Regular' },
  statsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statCard: { flexGrow: 1, minWidth: 120, borderWidth: 1, borderRadius: 12, padding: 10 },
  statValue: { fontSize: 18, fontFamily: 'Poppins_700Bold' },
  statLabel: { fontSize: 11, fontFamily: 'Poppins_500Medium' },
  section: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 },
  sectionTitle: { fontSize: 14, fontFamily: 'Poppins_700Bold' },
  sectionSub: { fontSize: 12, fontFamily: 'Poppins_400Regular' },
  rowActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  muted: { fontSize: 12, fontFamily: 'Poppins_400Regular' },
  item: { borderWidth: 1, borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemTitle: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  itemSub: { fontSize: 12, fontFamily: 'Poppins_400Regular' },
  iconBtn: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
});
