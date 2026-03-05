import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Pressable, TextInput, ActivityIndicator, Linking, View, Text, StyleSheet, ScrollView, Switch, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useCouncil } from '@/hooks/useCouncil';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/lib/auth';

const ALERT_LABELS: Record<string, string> = {
  emergency: 'Emergency',
  bushfire: 'Bushfire',
  flood: 'Flood',
  road_closure: 'Road Closures',
  public_meeting: 'Public Meetings',
  grant_opening: 'Grant Openings',
  facility_closure: 'Facility Closures',
  community_notice: 'Community Notices',
  development_application: 'Development Applications',
};

export default function CouncilTabScreen() {
  return <CouncilDirectoryScreen />;
}

function CouncilDirectoryScreen() {
  const { user, isAuthenticated } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/council/list', search, page],
    queryFn: () => api.council.list({ q: search, sortBy: 'name', sortDir: 'asc', verificationStatus: 'verified', page, pageSize: 30 }),
  });
  const councils = data?.councils ?? [];
  const hasNextPage = data?.hasNextPage ?? false;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F4F4F8' }} contentContainerStyle={{ padding: 32, gap: 24 }}>
      <Text style={{ fontSize: 28, fontWeight: '700', color: '#2C2A72', marginBottom: 12 }}>Council Directory</Text>
      <TextInput
        value={search}
        onChangeText={text => { setSearch(text); setPage(1); }}
        placeholder="Search councils by name or suburb..."
        style={{ backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 18, borderWidth: 1, borderColor: '#E0E0E0' }}
      />
      {isLoading ? <ActivityIndicator size="large" color="#2C2A72" /> : null}
      {councils.map((council: any) => (
        <CouncilCard key={council.id} council={council} isAuthenticated={isAuthenticated} />
      ))}
      {hasNextPage && (
        <Button onPress={() => setPage(page + 1)} style={{ marginTop: 18 }}>Load More</Button>
      )}
      {page > 1 && (
        <Button onPress={() => setPage(page - 1)} style={{ marginTop: 8 }}>Previous Page</Button>
      )}
    </ScrollView>
  );
}

function CouncilCard({ council, isAuthenticated }: { council: any; isAuthenticated: boolean }) {
  const [showDetails, setShowDetails] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimEmail, setClaimEmail] = useState('');
  const [claimRole, setClaimRole] = useState('');
  const [claimNote, setClaimNote] = useState('');
  const [claimStatus, setClaimStatus] = useState('');
  const handleFollow = async () => {
    if (!isAuthenticated) return alert('Sign in to follow councils.');
    await api.council.follow(council.id);
    alert('Followed!');
  };
  const handleClaim = async () => {
    setClaiming(true);
    try {
      const res = await api.council.claim(council.id, { workEmail: claimEmail, roleTitle: claimRole, note: claimNote });
      setClaimStatus('Claim submitted!');
    } catch (e) {
      setClaimStatus('Error submitting claim.');
    }
    setClaiming(false);
  };
  return (
    <Pressable
      onPress={() => {
        // Expo Router navigation to dynamic detail page
        if (Platform.OS === 'web') {
          window.location.href = `/council/${council.id}`;
        } else {
          // @ts-ignore
          require('expo-router').router.push({ pathname: '/council/[id]', params: { id: council.id } });
        }
      }}
      style={{ backgroundColor: '#fff', borderRadius: 18, padding: 28, shadowColor: '#2C2A72', shadowOpacity: 0.12, shadowRadius: 12, marginBottom: 16, elevation: 2 }}
      accessibilityRole="button"
      accessibilityLabel={`View details for ${council.name} council`}
    >
      {/* ...existing code... */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name="business" size={28} color="#2C2A72" style={{ marginRight: 8 }} />
          <Text style={{ fontSize: 24, fontWeight: '700', color: '#2C2A72' }}>{council.name}</Text>
          <View style={{ marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: council.verificationStatus === 'verified' ? '#FF8C42' : '#E0E0E0' }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: council.verificationStatus === 'verified' ? '#fff' : '#636366' }}>{council.verificationStatus === 'verified' ? 'Verified' : 'Unverified'}</Text>
          </View>
        </View>
        <Button onPress={handleFollow} disabled={!isAuthenticated} style={{ minWidth: 100 }}>{isAuthenticated ? 'Follow' : 'Sign in to follow'}</Button>
      </View>
      <Text style={{ color: '#636366', marginBottom: 4, fontSize: 15 }}>{council.state} · {council.suburb} · {council.country}</Text>
      <Text style={{ color: '#636366', marginBottom: 8, fontSize: 15 }}>{council.description}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
        {council.websiteUrl ? (
          <Pressable onPress={() => Linking.openURL(council.websiteUrl || '')}>
            <Text style={{ color: '#FF8C42', textDecorationLine: 'underline', fontSize: 14 }}>🌐 Website</Text>
          </Pressable>
        ) : null}
        {council.email ? (
          <Pressable onPress={() => Linking.openURL(`mailto:${council.email}`)}>
            <Text style={{ color: '#2C2A72', textDecorationLine: 'underline', fontSize: 14 }}>✉️ Email</Text>
          </Pressable>
        ) : null}
        {council.phone ? (
          <Pressable onPress={() => Linking.openURL(`tel:${council.phone}`)}>
            <Text style={{ color: '#2C2A72', textDecorationLine: 'underline', fontSize: 14 }}>📞 {council.phone}</Text>
          </Pressable>
        ) : null}
        <Text style={{ color: '#636366', fontSize: 14 }}>LGA: {council.lgaCode}</Text>
        <Text style={{ color: '#636366', fontSize: 14 }}>Postcode: {council.postcode}</Text>
      </View>
      <Button onPress={() => setShowDetails((v: boolean) => !v)} style={{ marginBottom: 8, marginTop: 4 }}>{showDetails ? 'Hide Details' : 'Show Details'}</Button>
      {showDetails && (
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: '600', color: '#2C2A72', marginBottom: 4, fontSize: 16 }}>Events & Info</Text>
          <CouncilEvents councilId={council.id} />
          <CouncilAlerts councilId={council.id} />
          <CouncilFacilities councilId={council.id} />
          <CouncilGrants councilId={council.id} />
          <CouncilLinks councilId={council.id} />
          <Button onPress={() => setClaiming(true)} style={{ marginTop: 12 }}>{claiming ? 'Submitting...' : 'Claim Council'}</Button>
          {claiming && (
            <View style={{ marginTop: 8 }}>
              <TextInput value={claimEmail} onChangeText={setClaimEmail} placeholder="Work Email" style={{ backgroundColor: '#F4F4F8', borderRadius: 8, padding: 8, marginBottom: 6 }} />
              <TextInput value={claimRole} onChangeText={setClaimRole} placeholder="Role Title" style={{ backgroundColor: '#F4F4F8', borderRadius: 8, padding: 8, marginBottom: 6 }} />
              <TextInput value={claimNote} onChangeText={setClaimNote} placeholder="Note (optional)" style={{ backgroundColor: '#F4F4F8', borderRadius: 8, padding: 8, marginBottom: 6 }} />
              <Button onPress={handleClaim}>Submit Claim</Button>
              {claimStatus ? <Text style={{ color: '#2C2A72', marginTop: 6 }}>{claimStatus}</Text> : null}
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

function CouncilEvents({ councilId }: { councilId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/council/events', councilId],
    queryFn: () => api.council.events(councilId),
  });
  if (isLoading) return <ActivityIndicator size="small" color="#2C2A72" />;
  if (!data || data.length === 0) return <Text style={{ color: '#636366' }}>No events found.</Text>;
  return (
    <View style={{ marginTop: 8 }}>
      {data.map((event: any) => (
        <View key={event.id} style={{ backgroundColor: '#F4F4F8', borderRadius: 8, padding: 10, marginBottom: 6 }}>
          <Text style={{ fontWeight: '600', color: '#2C2A72' }}>{event.title}</Text>
          <Text style={{ color: '#636366' }}>{event.date} · {event.city}</Text>
          <Text style={{ color: '#636366' }}>{event.description}</Text>
        </View>
      ))}
    </View>
  );
}

function CouncilAlerts({ councilId }: { councilId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/council/alerts', councilId],
    queryFn: () => api.council.alerts(councilId),
  });
  if (isLoading) return <ActivityIndicator size="small" color="#2C2A72" />;
  if (!data || data.length === 0) return <Text style={{ color: '#636366' }}>No alerts found.</Text>;
  return (
    <View style={{ marginTop: 8 }}>
      <Text style={{ fontWeight: '600', color: '#2C2A72', marginBottom: 4 }}>Alerts</Text>
      {data.map((alert: any) => (
        <View key={alert.id} style={{ backgroundColor: '#FFF8E1', borderRadius: 8, padding: 10, marginBottom: 6 }}>
          <Text style={{ fontWeight: '600', color: '#FF8C42' }}>{alert.title}</Text>
          <Text style={{ color: '#636366' }}>{alert.category} · {alert.severity}</Text>
          <Text style={{ color: '#636366' }}>{alert.description}</Text>
        </View>
      ))}
    </View>
  );
}

function CouncilFacilities({ councilId }: { councilId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/council/facilities', councilId],
    queryFn: () => api.council.facilities(councilId),
  });
  if (isLoading) return <ActivityIndicator size="small" color="#2C2A72" />;
  if (!data || data.length === 0) return <Text style={{ color: '#636366' }}>No facilities found.</Text>;
  return (
    <View style={{ marginTop: 8 }}>
      <Text style={{ fontWeight: '600', color: '#2C2A72', marginBottom: 4 }}>Facilities</Text>
      {data.map((facility: any) => (
        <View key={facility.id} style={{ backgroundColor: '#E0F7FA', borderRadius: 8, padding: 10, marginBottom: 6 }}>
          <Text style={{ fontWeight: '600', color: '#2C2A72' }}>{facility.name}</Text>
          <Text style={{ color: '#636366' }}>{facility.category}</Text>
        </View>
      ))}
    </View>
  );
}

function CouncilGrants({ councilId }: { councilId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/council/grants', councilId],
    queryFn: () => api.council.grants(councilId),
  });
  if (isLoading) return <ActivityIndicator size="small" color="#2C2A72" />;
  if (!data || data.length === 0) return <Text style={{ color: '#636366' }}>No grants found.</Text>;
  return (
    <View style={{ marginTop: 8 }}>
      <Text style={{ fontWeight: '600', color: '#2C2A72', marginBottom: 4 }}>Grants</Text>
      {data.map((grant: any) => (
        <View key={grant.id} style={{ backgroundColor: '#FFFDE7', borderRadius: 8, padding: 10, marginBottom: 6 }}>
          <Text style={{ fontWeight: '600', color: '#FFC857' }}>{grant.title}</Text>
          <Text style={{ color: '#636366' }}>{grant.category}</Text>
          <Text style={{ color: '#636366' }}>{grant.description}</Text>
        </View>
      ))}
    </View>
  );
}

function CouncilLinks({ councilId }: { councilId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/council/links', councilId],
    queryFn: () => api.council.links(councilId),
  });
  if (isLoading) return <ActivityIndicator size="small" color="#2C2A72" />;
  if (!data || data.length === 0) return <Text style={{ color: '#636366' }}>No links found.</Text>;
  return (
    <View style={{ marginTop: 8 }}>
      <Text style={{ fontWeight: '600', color: '#2C2A72', marginBottom: 4 }}>Links</Text>
      {data.map((link: any) => (
        <Text key={link.id} style={{ color: '#3498DB', marginBottom: 4 }} onPress={() => Linking.openURL(link.url)}>{link.title}</Text>
      ))}
    </View>
  );
}

function CouncilContent() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    data,
    isLoading,
    isError,
    isAuthenticated,
    refetch,
    followMutation,
    prefMutation,
    reminderMutation,
    effectivePrefs,
    togglePref,
  } = useCouncil();

  const councilPhone = data?.council.phone?.trim();
  const councilWebsiteUrl = data?.council.websiteUrl?.trim();

  return (
    <ErrorBoundary>
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === 'web' ? 64 : insets.top + 12 }]}> 
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>Loading your council...</Text>
          </View>
        ) : isError || !data ? (
          <View style={styles.loadingWrap}>
            <Ionicons name="business-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No council found</Text>
            <Text style={[styles.emptySub, { color: colors.text }]}>Update your location to auto-match your local council.</Text>
            <Button onPress={() => refetch()}>Retry</Button>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={[styles.hero, { backgroundColor: colors.card }]}> 
              <View style={styles.heroLeft}>
                <Ionicons name="business" size={26} color={colors.primary} />
                <View>
                  <Text style={[styles.heroTitle, { color: colors.text }]}>{data.council.name}</Text>
                  <View style={styles.badgeRow}>
                    <View style={[styles.badge, { backgroundColor: data.council.verificationStatus === 'verified' ? colors.primaryLight : colors.surface }]}> 
                      <Text style={[styles.badgeText, { color: data.council.verificationStatus === 'verified' ? colors.primary : colors.text }]}> 
                        {data.council.verificationStatus === 'verified' ? 'Council Verified' : 'Pending Verification'}
                      </Text>
                    </View>
                    <Text style={[styles.heroMeta, { color: colors.text }]}>{data.council.state} • LGA {data.council.lgaCode}</Text>
                  </View>
                </View>
              </View>
              <Button
                size="sm"
                variant={data.following ? 'secondary' : 'primary'}
                onPress={() => followMutation.mutate()}
                loading={followMutation.isPending}
                disabled={!isAuthenticated}
              >
                {data.following ? 'Following' : 'Follow'}
              </Button>
            </View>

            <Section title="Council Information" colors={colors}>
              <InfoRow icon="location-outline" label={`${data.council.addressLine1 || 'Address unavailable'}, ${data.council.suburb} ${data.council.postcode}`} colors={colors} />
              <InfoRow icon="call-outline" label={councilPhone || 'No phone listed'} colors={colors} onPress={councilPhone ? () => Linking.openURL(`tel:${councilPhone.replace(/\s/g, '')}`) : undefined} />
              <InfoRow icon="mail-outline" label={data.council.email || 'No email listed'} colors={colors} onPress={data.council.email ? () => Linking.openURL(`mailto:${data.council.email}`) : undefined} />
              <InfoRow icon="time-outline" label={data.council.openingHours || 'Opening hours unavailable'} colors={colors} />
              <InfoRow icon="globe-outline" label={councilWebsiteUrl || 'Website unavailable'} colors={colors} onPress={councilWebsiteUrl ? () => Linking.openURL(councilWebsiteUrl) : undefined} />
            </Section>

            <Section title="Waste & Utilities" colors={colors}>
              {data.waste ? (
                <>
                  <Text style={[styles.sectionText, { color: colors.text }]}>General: {data.waste.generalWasteDay} ({data.waste.frequencyGeneral})</Text>
                  <Text style={[styles.sectionText, { color: colors.text }]}>Recycling: {data.waste.recyclingDay} ({data.waste.frequencyRecycling})</Text>
                  {data.waste.greenWasteDay ? (
                    <Text style={[styles.sectionText, { color: colors.text }]}>Green: {data.waste.greenWasteDay} ({data.waste.frequencyGreen || 'schedule varies'})</Text>
                  ) : null}
                  <Text style={[styles.sectionHint, { color: colors.text }]}>{data.waste.notes || 'Check your council website for hard waste collection windows.'}</Text>
                </>
              ) : (
                <Text style={[styles.sectionHint, { color: colors.text }]}>No waste schedule available for your area.</Text>
              )}
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>Waste reminder</Text>
                <Switch
                  value={Boolean(data.reminder?.enabled)}
                  onValueChange={(value) => reminderMutation.mutate(value)}
                  disabled={!isAuthenticated || reminderMutation.isPending}
                />
              </View>
            </Section>

            <Section title="Council Alerts" colors={colors}>
              {effectivePrefs.length > 0 ? (
                <View style={styles.prefGrid}>
                  {effectivePrefs.map((pref: any) => (
                    <Button
                      key={pref.category}
                      size="sm"
                      variant={pref.enabled ? 'primary' : 'outline'}
                      onPress={() => togglePref(pref.category)}
                      disabled={!isAuthenticated || prefMutation.isPending}
                    >
                      {ALERT_LABELS[pref.category] || pref.category}
                    </Button>
                  ))}
                </View>
              ) : (
                <Text style={[styles.sectionHint, { color: colors.text }]}>No alert preferences available.</Text>
              )}
              {data.alerts.map((alert: any) => (
                <View key={alert.id} style={[styles.alertCard, { borderColor: colors.borderLight, backgroundColor: colors.card }]}> 
                  <Text style={[styles.alertTitle, { color: colors.text }]}>{alert.title}</Text>
                  <Text style={[styles.alertBody, { color: colors.text }]}>{alert.description}</Text>
                  <Text style={[styles.alertMeta, { color: colors.primary }]}>{(ALERT_LABELS[alert.category] || alert.category)} • {alert.severity.toUpperCase()}</Text>
                </View>
              ))}
              {data.alerts.length === 0 ? <Text style={[styles.sectionHint, { color: colors.text }]}>No active council alerts.</Text> : null}
            </Section>

            <Section title="Council Events & Activities" colors={colors}>
              {data.events.map((event: any) => (
                <View key={event.id} style={[styles.listItem, { borderColor: colors.borderLight }]}> 
                  <Text style={[styles.listTitle, { color: colors.text }]}>{event.title}</Text>
                  <Text style={[styles.listSub, { color: colors.text }]}>{event.city} • {event.date} • {event.time}</Text>
                </View>
              ))}
              {data.events.length === 0 ? <Text style={[styles.sectionHint, { color: colors.text }]}>No council events listed yet.</Text> : null}
            </Section>

            <Section title="Council Facilities" colors={colors}>
              {data.facilities.map((facility: any) => (
                <View key={String(facility.id)} style={[styles.listItem, { borderColor: colors.borderLight }]}> 
                  <Text style={[styles.listTitle, { color: colors.text }]}>{String(facility.name ?? 'Facility')}</Text>
                  <Text style={[styles.listSub, { color: colors.text }]}>{String(facility.category ?? 'Community Facility')} • {String(facility.city ?? '')}</Text>
                </View>
              ))}
              {data.facilities.length === 0 ? <Text style={[styles.sectionHint, { color: colors.text }]}>No council facilities listed.</Text> : null}
            </Section>

            <Section title="Grants" colors={colors}>
              {data.grants.map((grant: any) => (
                <View key={grant.id} style={[styles.listItem, { borderColor: colors.borderLight }]}> 
                  <Text style={[styles.listTitle, { color: colors.text }]}>{grant.title}</Text>
                  <Text style={[styles.listSub, { color: colors.text }]}>{grant.category} • {grant.status.toUpperCase()}</Text>
                  {grant.applicationUrl ? (
                    <Button size="sm" variant="ghost" onPress={() => Linking.openURL(grant.applicationUrl!)}>Apply</Button>
                  ) : null}
                </View>
              ))}
              {data.grants.length === 0 ? <Text style={[styles.sectionHint, { color: colors.text }]}>No open grants right now.</Text> : null}
            </Section>

            <Section title="What's On & Links" colors={colors}>
              {data.links.map((link: any) => (
                <Button key={link.id} variant="outline" onPress={() => Linking.openURL(link.url)}>
                  {link.title}
                </Button>
              ))}
              {data.links.length === 0 ? <Text style={[styles.sectionHint, { color: colors.text }]}>No council links available.</Text> : null}
            </Section>
          </ScrollView>
        )}
      </View>
    </ErrorBoundary>
  );
}

function Section({ title, colors, children }: { title: string; colors: ReturnType<typeof useColors>; children: React.ReactNode }) {
  return (
    <View style={[styles.section, { backgroundColor: colors.card }]}> 
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function InfoRow({ icon, label, colors, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; colors: ReturnType<typeof useColors>; onPress?: () => void }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text onPress={onPress} style={[styles.infoText, { color: onPress ? colors.primary : colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 24 },
  loadingText: { fontSize: 14, fontFamily: 'Poppins_500Medium' },
  emptyTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold' },
  emptySub: { fontSize: 13, fontFamily: 'Poppins_400Regular', textAlign: 'center' },
  content: { paddingHorizontal: 16, paddingBottom: 100, gap: 12 },
  hero: {
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  heroLeft: { flexDirection: 'row', gap: 10, alignItems: 'center', flex: 1 },
  heroTitle: { fontSize: 16, fontFamily: 'Poppins_700Bold' },
  heroMeta: { fontSize: 12, fontFamily: 'Poppins_500Medium' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
  section: { borderRadius: 14, padding: 14, gap: 10 },
  sectionTitle: { fontSize: 15, fontFamily: 'Poppins_700Bold' },
  sectionBody: { gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { flex: 1, fontSize: 13, fontFamily: 'Poppins_500Medium' },
  sectionText: { fontSize: 13, fontFamily: 'Poppins_500Medium' },
  sectionHint: { fontSize: 12, fontFamily: 'Poppins_400Regular' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  switchLabel: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  prefGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  alertCard: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 5 },
  alertTitle: { fontSize: 13, fontFamily: 'Poppins_700Bold' },
  alertBody: { fontSize: 12, fontFamily: 'Poppins_400Regular' },
  alertMeta: { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
  listItem: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 4 },
  listTitle: { fontSize: 13, fontFamily: 'Poppins_700Bold' },
  listSub: { fontSize: 12, fontFamily: 'Poppins_400Regular' },
});
