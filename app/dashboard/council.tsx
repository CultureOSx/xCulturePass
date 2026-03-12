import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCouncil } from '@/hooks/useCouncil';
import { useRole } from '@/hooks/useRole';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients, CultureTokens } from '@/constants/theme';

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderColor: color + '30', backgroundColor: color + '05' }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function CouncilDashboardScreen() {
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
      <View style={styles.center}> 
        <Text style={styles.title}>Council Dashboard</Text>
        <Text style={styles.sub}>Approved council claimant, admin, or organizer access required.</Text>
        <Button onPress={() => router.replace('/(tabs)')}>Back to Discover</Button>
      </View>
    );
  }

  if (isLoading || !council) {
    return (
      <View style={styles.center}> 
        <Text style={styles.sub}>Loading council dashboard…</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? 12 : insets.top + 8 }]}> 
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Council Dashboard</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={gradients.culturepassBrand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
            <View style={styles.heroContentWrap}>
              <Text style={styles.heroTitle}>{council.name}</Text>
              <Text style={styles.heroSub}>{council.state} • LGA {council.lgaCode}</Text>
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
            <Stat label="Active Alerts" value={String(activeAlerts.length)} color={CultureTokens.coral} />
            <Stat label="Open Grants" value={String(openGrants.length)} color={CultureTokens.success} />
            <Stat label="Facilities" value={String(facilities.length)} color={CultureTokens.indigo} />
            <Stat label="Links" value={String(links.length)} color={CultureTokens.saffron} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Operations</Text>
            <Text style={styles.sectionSub}>Create and monitor council civic content.</Text>
            <View style={styles.rowActions}>
              <Button size="sm" onPress={() => createAlertMutation.mutate()} loading={createAlertMutation.isPending} disabled={!canCrud}>Create Alert</Button>
              <Button size="sm" variant="secondary" onPress={() => createGrantMutation.mutate()} loading={createGrantMutation.isPending} disabled={!canCrud}>Create Grant</Button>
              {isAdmin ? <Button size="sm" variant="outline" onPress={() => router.push('/admin/council-claims')}>Review Claims</Button> : null}
            </View>
            {waste ? (
              <Text style={styles.muted}>Waste schedule: General {waste.generalWasteDay}, Recycling {waste.recyclingDay}</Text>
            ) : (
              <Text style={styles.muted}>No waste schedule available for this council.</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Alerts (Manage)</Text>
            {activeAlerts.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="notifications-off-outline" size={32} color="rgba(255,255,255,0.4)" />
                <Text style={styles.muted}>No active alerts.</Text>
              </View>
            ) : activeAlerts.map((alert: any) => (
              <View key={alert.id} style={styles.item}>
                <View style={[styles.itemIcon, { backgroundColor: CultureTokens.coral + '15' }]}>
                  <Ionicons name="warning-outline" size={18} color={CultureTokens.coral} />
                </View>
                <View style={styles.itemBody}>
                  <Text style={styles.itemTitle}>{alert.title}</Text>
                  <Text style={styles.itemSubText}>{alert.category} • {alert.severity}</Text>
                </View>
                <Pressable
                  style={[styles.iconBtn, { backgroundColor: CultureTokens.coral + '15' }]}
                  onPress={() => archiveAlertMutation.mutate(alert.id)}
                  disabled={!canCrud}
                  accessibilityRole="button"
                  accessibilityLabel="Archive alert"
                >
                  <Ionicons name="archive-outline" size={16} color={CultureTokens.coral} />
                </Pressable>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Grants (Manage)</Text>
            {openGrants.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="folder-open-outline" size={32} color="rgba(255,255,255,0.4)" />
                <Text style={styles.muted}>No open grants.</Text>
              </View>
            ) : openGrants.map((grant: any) => (
              <View key={grant.id} style={styles.item}>
                <View style={[styles.itemIcon, { backgroundColor: CultureTokens.success + '15' }]}>
                  <Ionicons name="star-outline" size={18} color={CultureTokens.success} />
                </View>
                <View style={styles.itemBody}>
                  <Text style={styles.itemTitle}>{grant.title}</Text>
                  <Text style={styles.itemSubText}>{grant.category} • {grant.status}</Text>
                </View>
                <Pressable
                  style={[styles.iconBtn, { backgroundColor: CultureTokens.success + '15' }]}
                  onPress={() => closeGrantMutation.mutate(grant.id)}
                  disabled={!canCrud}
                  accessibilityRole="button"
                  accessibilityLabel="Close grant"
                >
                  <Ionicons name="checkmark-done-outline" size={16} color={CultureTokens.success} />
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
  container:    { flex: 1, backgroundColor: '#0B0B14' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, marginBottom: 8 },
  backBtn:      { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  headerTitle:  { fontSize: 18, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  content:      { paddingHorizontal: 20, paddingBottom: 110, gap: 16 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10, backgroundColor: '#0B0B14' },
  heroCard:     { borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 14, shadowColor: '#2C2A72', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  heroContentWrap:{ flex: 1 },
  title:        { fontSize: 20, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  heroTitle:    { fontSize: 22, fontFamily: 'Poppins_700Bold', color: '#FFFFFF', letterSpacing: -0.5 },
  sub:          { fontSize: 14, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  heroSub:      { fontSize: 14, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.85)' },
  statsRow:     { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  statCard:     { flexGrow: 1, minWidth: 140, borderWidth: 1, borderRadius: 16, padding: 16 },
  statValue:    { fontSize: 24, fontFamily: 'Poppins_700Bold', marginBottom: 2 },
  statLabel:    { fontSize: 12, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.6)' },
  section:      { borderWidth: 1, borderRadius: 20, padding: 20, gap: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' },
  sectionTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  sectionSub:   { fontSize: 14, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.6)' },
  rowActions:   { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 4 },
  muted:        { fontSize: 13, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  item:         { borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.02)' },
  itemIcon:     { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemBody:     { flex: 1 },
  itemTitle:    { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF', marginBottom: 2 },
  itemSubText:  { fontSize: 13, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.5)' },
  iconBtn:      { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  emptyWrap:    { alignItems: 'center', paddingVertical: 24, gap: 8 },
});
