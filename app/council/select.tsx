import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { api, type CouncilData } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { useNearestCity } from '@/hooks/useNearestCity';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '@/constants/theme';

const STATE_FILTERS = ['ALL', 'NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'] as const;

export default function CouncilSelectScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { updateLocation } = useOnboarding();
  const { isAuthenticated } = useAuth();
  const params = useLocalSearchParams<{ next?: string }>();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<(typeof STATE_FILTERS)[number]>('ALL');
  const [localSelectedCouncilId, setLocalSelectedCouncilId] = useState<string | null>(null);
  const { detect, status: detectStatus } = useNearestCity();

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), 220);
    return () => clearTimeout(handle);
  }, [query]);

  const councilQuery = useQuery({
    queryKey: ['/api/council/list', 'select-browse', debouncedQuery, stateFilter],
    queryFn: () => api.council.list({
      q: debouncedQuery || undefined,
      state: stateFilter === 'ALL' ? undefined : stateFilter,
      pageSize: 2000,
      sortBy: 'name',
      sortDir: 'asc',
    }),
  });

  const selectedQuery = useQuery({
    queryKey: ['/api/council/selected'],
    queryFn: () => api.council.getSelected(),
    enabled: isAuthenticated,
  });

  const selectedId = selectedQuery.data?.council?.id ?? localSelectedCouncilId;

  const selectMutation = useMutation({
    mutationFn: async (council: CouncilData) => {
      await updateLocation('Australia', council.suburb || council.name);
      if (!isAuthenticated) return { success: true, councilId: council.id };
      return api.council.select(council.id);
    },
    onSuccess: (result) => {
      setLocalSelectedCouncilId(result.councilId);
      const nextRoute = typeof params.next === 'string' && params.next.length > 0 ? params.next : '/(tabs)/council';
      router.replace(nextRoute as never);
    },
  });

  const items = useMemo(() => {
    const base = councilQuery.data?.councils ?? [];
    const q = debouncedQuery.toLowerCase();
    if (!q) return base;

    const score = (item: CouncilData) => {
      const name = item.name.toLowerCase();
      const suburb = item.suburb.toLowerCase();
      const lga = item.lgaCode.toLowerCase();
      const stateCode = item.state.toLowerCase();
      const website = (item.websiteUrl ?? '').toLowerCase();
      if (name.startsWith(q)) return 100;
      if (name.includes(q)) return 80;
      if (suburb.startsWith(q)) return 60;
      if (suburb.includes(q)) return 40;
      if (stateCode === q) return 35;
      if (stateCode.includes(q)) return 32;
      if (lga.includes(q)) return 30;
      if (website.includes(q)) return 20;
      return 0;
    };

    const scored = [...base]
      .map((item) => ({ item, score: score(item) }))
      .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
      .map((entry) => entry.item);

    const hasStrongMatch = scored.some((item) => score(item) > 0);
    return hasStrongMatch ? scored : base;
  }, [councilQuery.data?.councils, debouncedQuery]);

  const hasExactSearch = useMemo(() => {
    const q = debouncedQuery.toLowerCase();
    if (!q) return true;
    return (councilQuery.data?.councils ?? []).some((item) => {
      const haystack = `${item.name} ${item.suburb} ${item.lgaCode} ${item.websiteUrl ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [debouncedQuery, councilQuery.data?.councils]);

  const detectLocation = async () => {
    const nearest = await detect();
    if (!nearest) return;
    setQuery(nearest.city);
    await updateLocation('Australia', nearest.city);
  };

  const renderItem = ({ item }: { item: CouncilData }) => {
    const active = item.id === selectedId;
    return (
      <Pressable
        onPress={() => selectMutation.mutate(item)}
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: active ? colors.primary : colors.borderLight },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            {item.suburb}, {item.state} {item.postcode} · LGA {item.lgaCode}
          </Text>
          {item.websiteUrl ? <Text style={[styles.link, { color: colors.primary }]}>{item.websiteUrl}</Text> : null}
        </View>
        <View style={[styles.badge, { backgroundColor: active ? colors.primary : colors.surfaceElevated }]}> 
          <Text style={[styles.badgeText, { color: active ? colors.textInverse : colors.textSecondary }]}>
            {active ? 'Selected' : 'Select'}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === 'web' ? 12 : insets.top + 8 }]}>
      <View style={styles.header}>
        <Button variant="ghost" size="sm" onPress={() => router.back()}>Back</Button>
        <Text style={[styles.title, { color: colors.text }]}>Choose your council</Text>
        <View style={{ width: 56 }} />
      </View>

      <LinearGradient
        colors={gradients.culturepassBrand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={[styles.heroTitle, { color: colors.textInverse }]}>Find your local council</Text>
        <Text style={[styles.heroSub, { color: colors.textInverse }]}>Search by suburb, council name, or state. You can change this anytime.</Text>
      </LinearGradient>

      <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <Ionicons name="search" size={16} color={colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by council, suburb, LGA"
          placeholderTextColor={colors.textTertiary}
          style={[styles.input, { color: colors.text }]}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stateFilterRow}>
        {STATE_FILTERS.map((stateCode) => {
          const active = stateFilter === stateCode;
          return (
            <Pressable
              key={stateCode}
              onPress={() => setStateFilter(stateCode)}
              style={[
                styles.stateChip,
                {
                  borderColor: active ? colors.primary : colors.borderLight,
                  backgroundColor: active ? colors.primaryGlow : colors.surface,
                },
              ]}
            >
              <Text style={[styles.stateChipText, { color: active ? colors.primary : colors.textSecondary }]}>{stateCode}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.searchActions}>
        <Button
          size="sm"
          variant="secondary"
          onPress={detectLocation}
          loading={detectStatus === 'requesting'}
          disabled={detectStatus === 'requesting'}
        >
          Auto-detect location
        </Button>
        {detectStatus === 'denied' ? <Text style={[styles.detectHint, { color: colors.warning }]}>Location permission denied.</Text> : null}
        {detectStatus === 'unavailable' ? <Text style={[styles.detectHint, { color: colors.warning }]}>Location services are off.</Text> : null}
        {detectStatus === 'error' ? <Text style={[styles.detectHint, { color: colors.error }]}>Could not detect your city. Try search.</Text> : null}
        {detectStatus === 'success' ? <Text style={[styles.detectHint, { color: colors.success }]}>Location detected. Results updated.</Text> : null}
        <Text style={[styles.detectHint, { color: colors.textSecondary }]}>Showing {items.length} councils</Text>
        {selectedId ? <Text style={[styles.detectHint, { color: colors.success }]}>Council selected. Tap Continue to open My Council.</Text> : null}
        {debouncedQuery.length > 0 && !hasExactSearch ? (
          <Text style={[styles.detectHint, { color: colors.warning }]}>No exact match found, showing all councils.</Text>
        ) : null}
      </View>

      {councilQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.hint, { color: colors.textSecondary }]}>Loading councils…</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 120 }}
          ListEmptyComponent={<Text style={[styles.hint, { color: colors.textSecondary }]}>No councils available right now.</Text>}
        />
      )}

      <View style={[styles.footer, { borderTopColor: colors.borderLight, backgroundColor: colors.background }]}> 
        <Button
          variant="secondary"
          onPress={() => {
            const nextRoute = typeof params.next === 'string' && params.next.length > 0 ? params.next : '/(tabs)/council';
            router.replace(nextRoute as never);
          }}
          disabled={selectMutation.isPending}
        >
          Continue
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 },
  title: { fontSize: 18, fontFamily: 'Poppins_700Bold' },
  hero: { marginHorizontal: 16, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8, gap: 4 },
  heroTitle: { fontSize: 15, fontFamily: 'Poppins_700Bold' },
  heroSub: { fontSize: 12, fontFamily: 'Poppins_400Regular' },
  searchWrap: { marginHorizontal: 16, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 46, flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, fontSize: 14, fontFamily: 'Poppins_500Medium' },
  stateFilterRow: { paddingHorizontal: 16, paddingTop: 8, paddingRight: 22, flexDirection: 'row', gap: 6 },
  stateChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  stateChipText: { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
  searchActions: { paddingHorizontal: 16, paddingTop: 10, gap: 6 },
  detectHint: { fontSize: 12, fontFamily: 'Poppins_500Medium' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  hint: { fontSize: 13, fontFamily: 'Poppins_500Medium' },
  card: { borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', gap: 10, alignItems: 'center' },
  name: { fontSize: 14, fontFamily: 'Poppins_700Bold' },
  meta: { marginTop: 4, fontSize: 12, fontFamily: 'Poppins_400Regular' },
  link: { marginTop: 4, fontSize: 12, fontFamily: 'Poppins_500Medium' },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
  footer: { borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 20 },
});
