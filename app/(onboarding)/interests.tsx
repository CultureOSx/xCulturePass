import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { interestCategories, interestIcons, popularInterestsSydney, type InterestCategory } from '@/constants/onboardingInterests';
import { useColors } from '@/hooks/useColors';
import { useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { User } from '@/shared/schema';

const MIN_REQUIRED_INTERESTS = 5;

const DEFAULT_EXPANDED: Record<string, boolean> = interestCategories.reduce((acc, category) => {
  acc[category.id] = true;
  return acc;
}, {} as Record<string, boolean>);

export default function InterestsScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 0 : insets.top;
  const colors = useColors();
  const { user } = useAuth();
  const { state, setInterests: setSelectedInterests, completeOnboarding } = useOnboarding();
  const [selected, setSelected] = useState<string[]>(state.interests);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(DEFAULT_EXPANDED);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categoryByInterest = useMemo(() => {
    const map = new Map<string, InterestCategory>();
    for (const category of interestCategories) {
      for (const interest of category.interests) {
        map.set(interest, category);
      }
    }
    return map;
  }, []);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggle = (interest: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected((prev) => (prev.includes(interest) ? prev.filter((item) => item !== interest) : [...prev, interest]));
  };

  const toggleSection = (categoryId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded((prev) => ({ ...prev, [categoryId]: !prev[categoryId] }));
  };

  const handleFinish = async () => {
    if (selected.length < MIN_REQUIRED_INTERESTS) {
      Alert.alert('Select more interests', `Please select at least ${MIN_REQUIRED_INTERESTS} interests to continue.`);
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    setSelectedInterests(selected);

    if (user?.id) {
      const selectedCategoryIds = [...new Set(
        selected
          .map((interest) => categoryByInterest.get(interest)?.id)
          .filter((id): id is string => Boolean(id)),
      )];

      const profilePayload: Partial<User> & {
        languages?: string[];
        ethnicityText?: string;
        communities?: string[];
        interestCategoryIds?: string[];
      } = {
        city: state.city || undefined,
        country: state.country || undefined,
        communities: state.communities,
        interests: selected,
        interestCategoryIds: selectedCategoryIds,
        languages: state.languages,
        ethnicityText: state.ethnicityText || undefined,
      };

      try {
        await api.users.update(user.id, profilePayload);
      } catch (error) {
        console.warn('[onboarding] failed to persist culture profile:', error);
      }
    }

    try {
      await completeOnboarding();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (error) {
      console.warn('[onboarding] failed to complete onboarding:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Could not finish onboarding', 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[s.container, { paddingTop: topInset, backgroundColor: colors.background }]}>
      <View style={s.header}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(onboarding)/culture-match'))} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[s.step, { color: colors.textSecondary }]}>4 of 4</Text>
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        <Text style={[s.title, { color: colors.text }]}>What interests you?</Text>
        <Text style={[s.subtitle, { color: colors.textSecondary }]}>
          Choose at least {MIN_REQUIRED_INTERESTS} interests so we can personalize your feed, perks, council updates, and community suggestions.
        </Text>

        <View style={s.block}>
          <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>Popular in Sydney</Text>
          <View style={s.popularRow}>
            {popularInterestsSydney.map((interest) => {
              const category = categoryByInterest.get(interest);
              const isSelected = selectedSet.has(interest);
              const accentColor = category?.accentColor ?? colors.primary;
              const iconName = (interestIcons[interest] as string | undefined) ?? 'star';

              return (
                <Pressable
                  key={interest}
                  onPress={() => toggle(interest)}
                  style={[
                    s.popularChip,
                    { borderColor: colors.borderLight, backgroundColor: colors.surface },
                    isSelected && { borderColor: accentColor, backgroundColor: accentColor },
                  ]}
                >
                  <Ionicons name={iconName as never} size={14} color={isSelected ? colors.textInverse : accentColor} />
                  <Text numberOfLines={1} style={[s.popularChipText, { color: isSelected ? colors.textInverse : colors.text }]}>
                    {interest}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {interestCategories.map((category) => {
          const isOpen = expanded[category.id] ?? true;
          const selectedInCategory = category.interests.filter((interest) => selectedSet.has(interest)).length;

          return (
            <View key={category.id} style={[s.categorySection, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <Pressable style={s.categoryHeader} onPress={() => toggleSection(category.id)}>
                <View style={s.categoryTitleWrap}>
                  <View style={[s.categoryDot, { backgroundColor: category.accentColor }]} />
                  <View>
                    <Text style={[s.categoryTitle, { color: colors.text }]}>{category.title}</Text>
                    <Text style={[s.categoryMeta, { color: colors.textSecondary }]}>{selectedInCategory} selected</Text>
                  </View>
                </View>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
              </Pressable>

              {isOpen ? (
                <View style={s.grid}>
                  {category.interests.map((interest) => {
                    const isSelected = selectedSet.has(interest);
                    const iconName = (interestIcons[interest] as string | undefined) ?? 'star';

                    return (
                      <Pressable
                        key={interest}
                        style={[
                          s.card,
                          { backgroundColor: colors.surface, borderColor: colors.borderLight },
                          isSelected && { backgroundColor: category.accentColor, borderColor: category.accentColor },
                        ]}
                        onPress={() => toggle(interest)}
                      >
                        <View style={[s.iconCircle, { backgroundColor: isSelected ? colors.surface : colors.backgroundSecondary }]}>
                          <Ionicons name={iconName as never} size={20} color={isSelected ? colors.textInverse : category.accentColor} />
                        </View>
                        <Text style={[s.cardText, { color: isSelected ? colors.textInverse : colors.text }]}>{interest}</Text>
                        {isSelected ? (
                          <View style={[s.checkBadge, { backgroundColor: colors.surface }]}> 
                            <Ionicons name="checkmark" size={14} color={category.accentColor} />
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
          );
        })}

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={[s.footer, { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 16, backgroundColor: colors.background }]}> 
        <Text style={[s.selectedCount, { color: colors.textSecondary }]}>
          {selected.length} selected · minimum {MIN_REQUIRED_INTERESTS}
        </Text>
        <Pressable
          style={[s.nextBtn, { backgroundColor: colors.primary }, (selected.length < MIN_REQUIRED_INTERESTS || isSubmitting) && { opacity: 0.4 }]}
          onPress={handleFinish}
          disabled={selected.length < MIN_REQUIRED_INTERESTS || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <>
              <Text style={[s.nextBtnText, { color: colors.textInverse }]}>Start Exploring</Text>
              <Ionicons name="sparkles" size={20} color={colors.textInverse} />
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  step: { fontSize: 14, fontFamily: 'Poppins_500Medium' },
  content: { flex: 1, paddingHorizontal: 20 },
  title: { fontSize: 28, fontFamily: 'Poppins_700Bold', marginTop: 8 },
  subtitle: { fontSize: 15, fontFamily: 'Poppins_400Regular', marginTop: 8, lineHeight: 22, marginBottom: 16 },

  block: { marginBottom: 12 },
  sectionLabel: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  popularRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  popularChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: 18, paddingHorizontal: 10, paddingVertical: 8, maxWidth: '100%' as never },
  popularChipText: { fontSize: 12, fontFamily: 'Poppins_500Medium', maxWidth: 170 },

  categorySection: { borderWidth: 1.5, borderRadius: 16, marginBottom: 12, padding: 12 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  categoryTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryDot: { width: 10, height: 10, borderRadius: 5 },
  categoryTitle: { fontSize: 16, fontFamily: 'Poppins_600SemiBold' },
  categoryMeta: { fontSize: 12, fontFamily: 'Poppins_500Medium' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '47%' as never, flexGrow: 1, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', gap: 8, position: 'relative' },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  cardText: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', textAlign: 'center' },
  checkBadge: { position: 'absolute', top: 7, right: 7, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },

  footer: { paddingHorizontal: 20, paddingTop: 12, gap: 8 },
  selectedCount: { fontSize: 13, fontFamily: 'Poppins_500Medium', textAlign: 'center' },
  nextBtn: { borderRadius: 16, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  nextBtnText: { fontSize: 17, fontFamily: 'Poppins_600SemiBold' },
});
