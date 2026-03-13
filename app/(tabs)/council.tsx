import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Pressable, TextInput, ActivityIndicator, Linking, View, Text, StyleSheet, ScrollView, Switch, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useCouncil } from '@/hooks/useCouncil';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAuth } from '@/lib/auth';
import { CultureTokens, shadows } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLayout } from '@/hooks/useLayout';

const isWeb = Platform.OS === 'web';

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

// ---------------------------------------------------------------------------
// Main Screen Shell
// ---------------------------------------------------------------------------
export default function CouncilTabScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const styles = getStyles(colors);
  const { width, isDesktop, isTablet } = useLayout();
  const { data, isLoading } = useCouncil();

  const isDesktopWeb = isWeb && isDesktop;
  const topInset = isWeb ? (isDesktopWeb ? 32 : 16) : insets.top;
  const shellMaxWidth = isDesktopWeb ? 1120 : isTablet ? 840 : width;

  const shellStyle = isWeb || isTablet
    ? { maxWidth: shellMaxWidth, width: '100%' as const, alignSelf: 'center' as const }
    : undefined;

  const [activeTab, setActiveTab] = useState<'my_council' | 'directory'>(data ? 'my_council' : 'directory');

  // If a user has no council data but my_council is active (maybe they logged out)
  if (!isLoading && !data && activeTab === 'my_council') {
    setActiveTab('directory');
  }

  return (
    <ErrorBoundary>
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={[styles.shell, shellStyle]}>

          <View style={styles.header}>
            {!isDesktopWeb && <Text style={styles.headerTitle}>Civic & Council</Text>}

            <View style={styles.segmentedControl}>
              {data && (
                <Pressable
                  style={[styles.segment, activeTab === 'my_council' && styles.segmentActive]}
                  onPress={() => { if (!isWeb) Haptics.selectionAsync(); setActiveTab('my_council'); }}
                >
                  <Ionicons name="location" size={14} color={activeTab === 'my_council' ? CultureTokens.teal : colors.textTertiary} />
                  <Text style={[styles.segmentText, activeTab === 'my_council' && styles.segmentTextActive]}>My Council</Text>
                </Pressable>
              )}
              <Pressable
                style={[styles.segment, activeTab === 'directory' && styles.segmentActive]}
                onPress={() => { if (!isWeb) Haptics.selectionAsync(); setActiveTab('directory'); }}
              >
                <Ionicons name="search" size={14} color={activeTab === 'directory' ? CultureTokens.teal : colors.textTertiary} />
                <Text style={[styles.segmentText, activeTab === 'directory' && styles.segmentTextActive]}>Directory</Text>
              </Pressable>
            </View>
          </View>

          {activeTab === 'my_council' && data ? (
            <CouncilContent data={data} colors={colors} styles={styles} />
          ) : (
            <CouncilDirectoryScreen colors={colors} styles={styles} />
          )}

        </View>
      </View>
    </ErrorBoundary>
  );
}

// ---------------------------------------------------------------------------
// Directory Screen
// ---------------------------------------------------------------------------
function CouncilDirectoryScreen({ colors, styles }: { colors: ReturnType<typeof useColors>; styles: any }) {
  const { isAuthenticated } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [searchFocused, setSearchFocused] = useState(false);

  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/council/list', search, page],
    queryFn: () => api.council.list({ q: search, sortBy: 'name', sortDir: 'asc', verificationStatus: 'verified', page, pageSize: 30 }),
    placeholderData: (prev: any) => prev,
  });

  const councils = data?.councils ?? [];
  const hasNextPage = data?.hasNextPage ?? false;

  return (
    <View style={styles.directoryContainer}>
      <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
        <Ionicons name="search" size={20} color={searchFocused ? CultureTokens.teal : colors.textTertiary} />
        <TextInput
          value={search}
          onChangeText={text => { setSearch(text); setPage(1); }}
          placeholder="Search councils by name or postcode..."
          placeholderTextColor={colors.textTertiary}
          style={styles.searchInput}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
        {search.length > 0 && (
          <Pressable onPress={() => { setSearch(''); setPage(1); }} hitSlop={10}>
            <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.directoryList}>
        {isLoading && page === 1 ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color={CultureTokens.teal} />
          </View>
        ) : (
          councils.map((council: any) => (
            <CouncilCard key={council.id} council={council} isAuthenticated={isAuthenticated} colors={colors} styles={styles} />
          ))
        )}

        {councils.length === 0 && !isLoading && (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="business" size={48} color={colors.borderLight} />
            <Text style={styles.emptyStateTitle}>No councils found</Text>
            <Text style={styles.emptyStateSub}>Try searching for a different area.</Text>
          </View>
        )}

        <View style={styles.pagination}>
          {page > 1 && (
            <Pressable
              style={[styles.pageBtn, styles.pageBtnPrev]}
              onPress={() => setPage(p => p - 1)}
            >
              <Ionicons name="chevron-back" size={16} color={colors.text} />
              <Text style={styles.pageBtnTextPrev}>Previous</Text>
            </Pressable>
          )}
          {hasNextPage && (
            <Pressable
              style={[styles.pageBtn, styles.pageBtnNext]}
              onPress={() => setPage(p => p + 1)}
            >
              <Text style={styles.pageBtnTextNext}>Next Page</Text>
              <Ionicons name="chevron-forward" size={16} color={CultureTokens.teal} />
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Council Card (Directory)
// ---------------------------------------------------------------------------
function CouncilCard({ council, isAuthenticated, colors, styles }: { council: any; isAuthenticated: boolean; colors: ReturnType<typeof useColors>; styles: any }) {
  const [showDetails, setShowDetails] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimEmail, setClaimEmail] = useState('');
  const [claimRole, setClaimRole] = useState('');
  const [claimNote, setClaimNote] = useState('');
  const [claimStatus, setClaimStatus] = useState('');

  const handleFollow = async () => {
    if (!isAuthenticated) return alert('Sign in to follow councils.');
    if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await api.council.follow(council.id);
      alert('Followed!');
    } catch {
      alert('Error following council.');
    }
  };

  const handleClaim = async () => {
    setClaiming(true);
    try {
      await api.council.claim(council.id, { workEmail: claimEmail, roleTitle: claimRole, note: claimNote });
      setClaimStatus('Claim submitted securely!');
    } catch {
      setClaimStatus('Error submitting claim.');
    }
    setClaiming(false);
  };

  return (
    <View style={styles.councilCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.councilIconBox}>
            <Ionicons name="business" size={24} color={CultureTokens.teal} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.councilName} numberOfLines={1}>{council.name}</Text>
            <Text style={styles.councilLocation}>{council.state} · {council.suburb}</Text>
          </View>
        </View>
        <Pressable
          style={isAuthenticated ? styles.followBtnActive : styles.followBtnDefault}
          onPress={handleFollow}
        >
          <Text style={isAuthenticated ? styles.followBtnTextActive : styles.followBtnTextDefault}>Follow</Text>
        </Pressable>
      </View>

      <Text style={styles.councilDesc} numberOfLines={3}>{council.description}</Text>

      <View style={styles.metaChipsRow}>
        {council.lgaCode && (
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>LGA: {council.lgaCode}</Text>
          </View>
        )}
        {council.postcode && (
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>{council.postcode}</Text>
          </View>
        )}
      </View>

      <Pressable
        style={styles.detailsToggleBtn}
        onPress={() => { if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowDetails(v => !v); }}
      >
        <Text style={styles.detailsToggleText}>{showDetails ? 'Hide Information' : 'View Information'}</Text>
        <Ionicons name={showDetails ? 'chevron-up' : 'chevron-down'} size={14} color={CultureTokens.teal} />
      </Pressable>

      {showDetails && (
        <View style={styles.detailsSection}>
          <View style={styles.contactRow}>
            {council.websiteUrl && (
              <Pressable style={styles.contactItem} onPress={() => Linking.openURL(council.websiteUrl)}>
                <Ionicons name="globe-outline" size={16} color={CultureTokens.indigo} />
                <Text style={styles.contactText}>Website</Text>
              </Pressable>
            )}
            {council.email && (
              <Pressable style={styles.contactItem} onPress={() => Linking.openURL(`mailto:${council.email}`)}>
                <Ionicons name="mail-outline" size={16} color={CultureTokens.indigo} />
                <Text style={styles.contactText}>Email</Text>
              </Pressable>
            )}
            {council.phone && (
              <Pressable style={styles.contactItem} onPress={() => Linking.openURL(`tel:${council.phone}`)}>
                <Ionicons name="call-outline" size={16} color={CultureTokens.indigo} />
                <Text style={styles.contactText}>Call</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.claimBlock}>
            <Text style={styles.claimTitle}>Are you a representative?</Text>
            <Text style={styles.claimSub}>Claim this council profile to manage alerts and events.</Text>

            {claiming ? (
              <ActivityIndicator size="small" color={CultureTokens.teal} style={{ marginTop: 10 }} />
            ) : claimStatus ? (
              <Text style={styles.claimStatus}>{claimStatus}</Text>
            ) : (
              <View style={styles.claimForm}>
                <TextInput value={claimEmail} onChangeText={setClaimEmail} placeholder="Work Email" placeholderTextColor={colors.textTertiary} style={styles.claimInput} />
                <TextInput value={claimRole} onChangeText={setClaimRole} placeholder="Role/Title" placeholderTextColor={colors.textTertiary} style={styles.claimInput} />
                <TextInput value={claimNote} onChangeText={setClaimNote} placeholder="Verification Note (optional)" placeholderTextColor={colors.textTertiary} style={styles.claimInput} />
                <Pressable onPress={handleClaim} style={styles.claimSubmitBtn}>
                  <Text style={styles.claimSubmitText}>Request Access</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Personal Council Content
// ---------------------------------------------------------------------------
function CouncilContent({ data, colors, styles }: { data: any; colors: ReturnType<typeof useColors>; styles: any }) {
  const { isAuthenticated, followMutation, reminderMutation } = useCouncil();
  const councilPhone = data.council.phone?.trim();
  const councilWebsiteUrl = data.council.websiteUrl?.trim();

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentList}>
      <View style={styles.heroCard}>
        <LinearGradient
          colors={[`${CultureTokens.teal}15`, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.heroTopRow}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="business" size={32} color={CultureTokens.teal} />
          </View>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroName}>{data.council.name}</Text>
            <View style={styles.heroMetaRow}>
              <View style={data.council.verificationStatus === 'verified' ? styles.heroPillVerified : styles.heroPillUnverified}>
                <Ionicons name={data.council.verificationStatus === 'verified' ? 'checkmark-circle' : 'time'} size={14} color={data.council.verificationStatus === 'verified' ? CultureTokens.success : colors.textSecondary} />
                <Text style={data.council.verificationStatus === 'verified' ? styles.heroPillTextVerified : styles.heroPillTextUnverified}>
                  {data.council.verificationStatus === 'verified' ? 'Verified Platform' : 'Unverified'}
                </Text>
              </View>
              <Text style={styles.heroState}>{data.council.state}</Text>
            </View>
          </View>
        </View>

        <Pressable
          style={data.following ? styles.heroFollowBtnFollowing : styles.heroFollowBtnDefault}
          onPress={() => followMutation.mutate()}
          disabled={!isAuthenticated || followMutation.isPending}
        >
          <Ionicons name={data.following ? 'checkmark' : 'add'} size={20} color={data.following ? colors.text : colors.background} />
          <Text style={data.following ? styles.heroFollowTextFollowing : styles.heroFollowTextDefault}>
            {data.following ? 'Following Council' : 'Follow to get alerts'}
          </Text>
        </Pressable>
      </View>

      <SectionBlock title="Civic Information" styles={styles}>
        <InfoItem icon="location" label={data.council.suburb ? `${data.council.suburb} ${data.council.postcode}` : 'Address not provided'} colors={colors} styles={styles} />
        {councilPhone && <InfoItem icon="call" label={councilPhone} action={() => Linking.openURL(`tel:${councilPhone.replace(/\s/g, '')}`)} colors={colors} styles={styles} />}
        {data.council.email && <InfoItem icon="mail" label={data.council.email} action={() => Linking.openURL(`mailto:${data.council.email}`)} colors={colors} styles={styles} />}
        {councilWebsiteUrl && <InfoItem icon="globe" label="Visit Official Website" action={() => Linking.openURL(councilWebsiteUrl)} colors={colors} styles={styles} />}
      </SectionBlock>

      <SectionBlock title="Waste & Utilities" icon="trash" styles={styles}>
        {data.waste ? (
          <View style={styles.wasteGrid}>
            <View style={styles.wasteBox}>
              <Text style={styles.wasteLabel}>General</Text>
              <Text style={styles.wasteDay}>{data.waste.generalWasteDay}</Text>
              <Text style={styles.wasteFreq}>{data.waste.frequencyGeneral}</Text>
            </View>
            <View style={styles.wasteBox}>
              <Text style={styles.wasteLabel}>Recycling</Text>
              <Text style={styles.wasteDay}>{data.waste.recyclingDay}</Text>
              <Text style={styles.wasteFreq}>{data.waste.frequencyRecycling}</Text>
            </View>
            {data.waste.greenWasteDay && (
              <View style={styles.wasteBox}>
                <Text style={styles.wasteLabel}>Green Waste</Text>
                <Text style={styles.wasteDay}>{data.waste.greenWasteDay}</Text>
                <Text style={styles.wasteFreq}>{data.waste.frequencyGreen || 'Varies'}</Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.emptyStateText}>No waste schedule available.</Text>
        )}
        <View style={styles.switchContainer}>
          <View>
            <Text style={styles.switchTitle}>Bin Reminders</Text>
            <Text style={styles.switchSub}>Get push notifications the night before collection</Text>
          </View>
          <Switch
            value={Boolean(data.reminder?.enabled)}
            onValueChange={(val) => reminderMutation.mutate(val)}
            trackColor={{ true: CultureTokens.teal, false: colors.borderLight }}
            disabled={!isAuthenticated || reminderMutation.isPending}
          />
        </View>
      </SectionBlock>

      <SectionBlock title="Live Alerts" icon="warning" styles={styles}>
        {data.alerts && data.alerts.length > 0 ? (
          data.alerts.map((alert: any) => (
            <View key={alert.id} style={styles.liveAlertCard}>
              <View style={styles.alertHeaderRow}>
                <Ionicons name="warning" size={18} color={CultureTokens.saffron} />
                <Text style={styles.alertSeverityText}>{(ALERT_LABELS[alert.category] || alert.category).toUpperCase()} • {alert.severity}</Text>
              </View>
              <Text style={styles.liveAlertTitle}>{alert.title}</Text>
              <Text style={styles.liveAlertBody}>{alert.description}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyStateText}>No active alerts.</Text>
        )}
      </SectionBlock>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function SectionBlock({ title, icon, styles, children }: { title: string; icon?: any; styles: any; children: React.ReactNode }) {
  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeader}>
        {icon && <Ionicons name={icon} size={22} color={styles.sectionTitle.color} />}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionInner}>{children}</View>
    </View>
  );
}

function InfoItem({ icon, label, action, colors, styles }: { icon: any; label: string; action?: () => void; colors: ReturnType<typeof useColors>; styles: any }) {
  const inner = (
    <View style={styles.infoRow}>
      <View style={styles.infoIconBox}>
        <Ionicons name={icon} size={18} color={action ? CultureTokens.indigo : colors.textSecondary} />
      </View>
      <Text style={action ? styles.infoTextActive : styles.infoTextDefault} numberOfLines={1}>{label}</Text>
      {action && <Ionicons name="open-outline" size={16} color={CultureTokens.indigo} style={{ marginLeft: 'auto' }} />}
    </View>
  );
  if (action) return <Pressable style={({ pressed }) => [pressed && { opacity: 0.7 }]} onPress={action}>{inner}</Pressable>;
  return inner;
}

// ---------------------------------------------------------------------------
// Styles Implementation
// ---------------------------------------------------------------------------
const getStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  shell: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  headerTitle: { fontSize: 32, fontFamily: 'Poppins_700Bold', letterSpacing: -0.6, marginBottom: 16, color: colors.text },
  segmentedControl: { flexDirection: 'row', borderRadius: 14, padding: 4, borderWidth: 1, backgroundColor: colors.surface, borderColor: colors.borderLight },
  segment: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10 },
  segmentActive: { backgroundColor: CultureTokens.teal + '26' },
  segmentText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: colors.textSecondary },
  segmentTextActive: { color: CultureTokens.teal },

  directoryContainer: { flex: 1 },
  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, paddingHorizontal: 16, height: 52, borderRadius: 16, borderWidth: 1, gap: 12, backgroundColor: colors.surface, borderColor: colors.borderLight },
  searchBarFocused: { borderColor: CultureTokens.teal },
  searchInput: { flex: 1, fontSize: 16, fontFamily: 'Poppins_400Regular', color: colors.text },
  directoryList: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 16 },
  loadingCenter: { paddingVertical: 60, alignItems: 'center' },

  emptyStateContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyStateTitle: { fontSize: 18, fontFamily: 'Poppins_600SemiBold', color: colors.textSecondary, marginTop: 12 },
  emptyStateSub: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: colors.textTertiary, marginTop: 4 },

  councilCard: { borderRadius: 24, padding: 22, marginBottom: 16, borderWidth: 1, backgroundColor: colors.surface, borderColor: colors.borderLight, ...shadows.medium },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  cardHeaderLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  councilIconBox: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: CultureTokens.teal + '26' },
  councilName: { fontSize: 18, fontFamily: 'Poppins_600SemiBold', marginBottom: 2, color: colors.text },
  councilLocation: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: colors.textSecondary },

  followBtnDefault: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.backgroundSecondary },
  followBtnActive: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, backgroundColor: CultureTokens.teal },
  followBtnTextDefault: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: colors.textTertiary },
  followBtnTextActive: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: colors.background },
  councilDesc: { fontSize: 15, fontFamily: 'Poppins_400Regular', lineHeight: 24, marginBottom: 16, color: colors.textSecondary },

  metaChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  metaChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.backgroundSecondary },
  metaChipText: { fontSize: 13, fontFamily: 'Poppins_500Medium', color: colors.textSecondary },

  detailsToggleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  detailsToggleText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: CultureTokens.teal },

  detailsSection: { marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.borderLight },
  contactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  contactItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 50, backgroundColor: CultureTokens.indigo + '0D' },
  contactText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: CultureTokens.indigo },

  claimBlock: { padding: 20, borderRadius: 16, borderWidth: 1, backgroundColor: colors.background, borderColor: colors.borderLight },
  claimTitle: { fontSize: 16, fontFamily: 'Poppins_600SemiBold', marginBottom: 4, color: colors.text },
  claimSub: { fontSize: 14, fontFamily: 'Poppins_400Regular', marginBottom: 16, color: colors.textSecondary },
  claimForm: { gap: 12 },
  claimInput: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 15, fontFamily: 'Poppins_400Regular', backgroundColor: colors.surface, borderColor: colors.borderLight, color: colors.text },
  claimSubmitBtn: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: CultureTokens.indigo },
  claimSubmitText: { color: colors.background, fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
  claimStatus: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', marginTop: 12, color: CultureTokens.success },

  pagination: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 24 },
  pageBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, borderWidth: 1 },
  pageBtnPrev: { backgroundColor: colors.surface, borderColor: colors.borderLight },
  pageBtnNext: { backgroundColor: CultureTokens.teal + '26', borderColor: CultureTokens.teal + '4D' },
  pageBtnTextPrev: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: colors.text },
  pageBtnTextNext: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: CultureTokens.teal },

  contentList: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 100, gap: 20 },
  heroCard: { padding: 24, borderRadius: 24, borderWidth: 1, overflow: 'hidden', backgroundColor: colors.surface, borderColor: colors.borderLight, ...shadows.medium },
  heroTopRow: { flexDirection: 'row', gap: 16, alignItems: 'center', marginBottom: 24 },
  heroIconWrap: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: CultureTokens.teal + '26' },
  heroTextWrap: { flex: 1 },
  heroName: { fontSize: 22, fontFamily: 'Poppins_700Bold', marginBottom: 8, color: colors.text },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroPillVerified: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: CultureTokens.teal + '26' },
  heroPillUnverified: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.backgroundSecondary },
  heroPillTextVerified: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: CultureTokens.success },
  heroPillTextUnverified: { fontSize: 12, fontFamily: 'Poppins_500Medium', color: colors.textSecondary },
  heroState: { fontSize: 13, fontFamily: 'Poppins_500Medium', color: colors.textSecondary },
  heroFollowBtnDefault: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 50, borderRadius: 16, backgroundColor: CultureTokens.teal },
  heroFollowBtnFollowing: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 50, borderRadius: 16, backgroundColor: colors.backgroundSecondary },
  heroFollowTextDefault: { fontSize: 16, fontFamily: 'Poppins_600SemiBold', color: colors.background },
  heroFollowTextFollowing: { fontSize: 16, fontFamily: 'Poppins_600SemiBold', color: colors.text },

  sectionBlock: { padding: 22, borderRadius: 24, borderWidth: 1, backgroundColor: colors.surface, borderColor: colors.borderLight, ...shadows.small },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: colors.text },
  sectionInner: { gap: 16 },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  infoIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundSecondary },
  infoTextDefault: { flex: 1, fontSize: 15, fontFamily: 'Poppins_400Regular', color: colors.text },
  infoTextActive: { flex: 1, fontSize: 15, fontFamily: 'Poppins_500Medium', color: CultureTokens.indigo },

  wasteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  wasteBox: { flex: 1, minWidth: '30%', padding: 16, borderRadius: 16, borderWidth: 1, gap: 6, backgroundColor: colors.background, borderColor: colors.borderLight },
  wasteLabel: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: colors.textSecondary },
  wasteDay: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: colors.text },
  wasteFreq: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: colors.textTertiary },

  switchContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.borderLight },
  switchTitle: { fontSize: 16, fontFamily: 'Poppins_600SemiBold', color: colors.text },
  switchSub: { fontSize: 13, fontFamily: 'Poppins_400Regular', marginTop: 4, color: colors.textTertiary },

  liveAlertCard: { padding: 18, borderRadius: 18, borderWidth: 1, gap: 8, backgroundColor: CultureTokens.saffron + '1A', borderColor: CultureTokens.saffron + '40' },
  alertHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  alertSeverityText: { fontSize: 12, fontFamily: 'Poppins_700Bold', letterSpacing: 0.5, color: CultureTokens.saffron },
  liveAlertTitle: { fontSize: 16, fontFamily: 'Poppins_600SemiBold', color: colors.text },
  liveAlertBody: { fontSize: 14, fontFamily: 'Poppins_400Regular', lineHeight: 22, color: colors.textSecondary },

  emptyStateText: { fontSize: 15, fontFamily: 'Poppins_400Regular', fontStyle: 'italic', color: colors.textSecondary },
});
