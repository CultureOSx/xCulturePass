import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  Switch,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useCouncil } from '@/hooks/useCouncil';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthGuard } from '@/components/AuthGuard';
import { Button } from '@/components/ui/Button';

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
  return (
    <AuthGuard
      icon="business-outline"
      title="Your Local Council"
      message="Sign in to see council info, waste schedules, alerts, and community events for your area."
    >
      <CouncilContent />
    </AuthGuard>
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
                  {effectivePrefs.map((pref) => (
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
              {data.alerts.map((alert) => (
                <View key={alert.id} style={[styles.alertCard, { borderColor: colors.borderLight, backgroundColor: colors.card }]}> 
                  <Text style={[styles.alertTitle, { color: colors.text }]}>{alert.title}</Text>
                  <Text style={[styles.alertBody, { color: colors.text }]}>{alert.description}</Text>
                  <Text style={[styles.alertMeta, { color: colors.primary }]}>{(ALERT_LABELS[alert.category] || alert.category)} • {alert.severity.toUpperCase()}</Text>
                </View>
              ))}
              {data.alerts.length === 0 ? <Text style={[styles.sectionHint, { color: colors.text }]}>No active council alerts.</Text> : null}
            </Section>

            <Section title="Council Events & Activities" colors={colors}>
              {data.events.map((event) => (
                <View key={event.id} style={[styles.listItem, { borderColor: colors.borderLight }]}> 
                  <Text style={[styles.listTitle, { color: colors.text }]}>{event.title}</Text>
                  <Text style={[styles.listSub, { color: colors.text }]}>{event.city} • {event.date} • {event.time}</Text>
                </View>
              ))}
              {data.events.length === 0 ? <Text style={[styles.sectionHint, { color: colors.text }]}>No council events listed yet.</Text> : null}
            </Section>

            <Section title="Council Facilities" colors={colors}>
              {data.facilities.map((facility) => (
                <View key={String(facility.id)} style={[styles.listItem, { borderColor: colors.borderLight }]}> 
                  <Text style={[styles.listTitle, { color: colors.text }]}>{String(facility.name ?? 'Facility')}</Text>
                  <Text style={[styles.listSub, { color: colors.text }]}>{String(facility.category ?? 'Community Facility')} • {String(facility.city ?? '')}</Text>
                </View>
              ))}
              {data.facilities.length === 0 ? <Text style={[styles.sectionHint, { color: colors.text }]}>No council facilities listed.</Text> : null}
            </Section>

            <Section title="Grants" colors={colors}>
              {data.grants.map((grant) => (
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
              {data.links.map((link) => (
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
