import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOnboarding } from '@/contexts/OnboardingContext';
import {
  interestCategories,
  interestIcons,
  popularInterestsSydney,
  type InterestCategory,
} from '@/constants/onboardingInterests';
import { useColors } from '@/hooks/useColors';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { User } from '@/shared/schema';
import { Button } from '@/components/ui/Button';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '@/constants/theme';
import * as Haptics from 'expo-haptics';

const MIN_REQUIRED_INTERESTS = 5;

const DEFAULT_EXPANDED: Record<string, boolean> = interestCategories.reduce((acc, category) => {
  acc[category.id] = true;
  return acc;
}, {} as Record<string, boolean>);

export default function InterestsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1024;
  const topInset = Platform.OS === 'web' ? 0 : insets.top;

  const { user } = useAuth();
  const { state, setInterests: setSelectedInterests, completeOnboarding } = useOnboarding();
  
  const [selected, setSelected] = useState<string[]>(state.interests || []);
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
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected((prev) => 
      prev.includes(interest) ? prev.filter((item) => item !== interest) : [...prev, interest]
    );
  };

  const toggleSection = (categoryId: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (error) {
      console.warn('[onboarding] failed to complete onboarding:', error);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Could not finish onboarding', 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradients.culturepassBrand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.95 }}
        style={StyleSheet.absoluteFillObject}
      />

      {isDesktop && (
        <View style={styles.desktopBackRow}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(onboarding)/communities')} hitSlop={8} style={[styles.desktopBackBtn, { backgroundColor: colors.surface + '26' }]}>
            <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
            <Text style={styles.desktopBackText}>Back</Text>
          </Pressable>
        </View>
      )}

      {!isDesktop && (
        <View style={[styles.mobileHeader, { paddingTop: topInset }]}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(onboarding)/communities'))} hitSlop={12}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </Pressable>
          <Text style={[styles.stepText, { color: '#FFFFFF' }]}>3 of 3</Text>
        </View>
      )}

      <KeyboardAvoidingView 
        style={styles.keyboardAvoid} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        keyboardVerticalOffset={0}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          keyboardShouldPersistTaps="handled" 
          contentContainerStyle={[
            styles.scrollContent,
            isDesktop && styles.scrollContentDesktop,
            !isDesktop && { paddingTop: 20 }
          ]}
        >
          <View style={[
            styles.formCard, 
            { backgroundColor: colors.surface },
            isDesktop && styles.formCardDesktop
          ]}>
            <Text style={[styles.title, { color: colors.text }]}>What interests you?</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Choose at least {MIN_REQUIRED_INTERESTS} interests to personalize your content.
            </Text>

            <View style={styles.block}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Popular in Sydney</Text>
              <View style={styles.popularRow}>
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
                        styles.popularChip,
                        { borderColor: colors.borderLight, backgroundColor: colors.surface },
                        isSelected && { borderColor: accentColor, backgroundColor: accentColor },
                      ]}
                    >
                      <Ionicons 
                        name={iconName as never} 
                        size={14} 
                        color={isSelected ? '#FFF' : accentColor} 
                      />
                      <Text 
                        numberOfLines={1} 
                        style={[styles.popularChipText, { color: isSelected ? '#FFF' : colors.text }]}
                      >
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
                <View 
                  key={category.id} 
                  style={[
                    styles.categorySection, 
                    { backgroundColor: colors.surface, borderColor: colors.borderLight }
                  ]}
                >
                  <Pressable style={styles.categoryHeader} onPress={() => toggleSection(category.id)}>
                    <View style={styles.categoryTitleWrap}>
                      <View style={[styles.categoryDot, { backgroundColor: category.accentColor }]} />
                      <View>
                        <Text style={[styles.categoryTitle, { color: colors.text }]}>
                          {category.title}
                        </Text>
                        <Text style={[styles.categoryMeta, { color: colors.textSecondary }]}>
                          {selectedInCategory} selected
                        </Text>
                      </View>
                    </View>
                    <Ionicons 
                      name={isOpen ? 'chevron-up' : 'chevron-down'} 
                      size={20} 
                      color={colors.textSecondary} 
                    />
                  </Pressable>

                  {isOpen ? (
                    <View style={styles.grid}>
                      {category.interests.map((interest) => {
                        const isSelected = selectedSet.has(interest);
                        const iconName = (interestIcons[interest] as string | undefined) ?? 'star';

                        return (
                          <Pressable
                            key={interest}
                            style={[
                              styles.card,
                              { backgroundColor: colors.surface, borderColor: colors.borderLight },
                              isSelected && { 
                                backgroundColor: category.accentColor, 
                                borderColor: category.accentColor 
                              },
                            ]}
                            onPress={() => toggle(interest)}
                          >
                            <View style={[
                              styles.iconCircle, 
                              { backgroundColor: isSelected ? colors.surface + '33' : colors.backgroundSecondary }
                            ]}>
                              <Ionicons 
                                name={iconName as never} 
                                size={20} 
                                color={isSelected ? '#FFF' : category.accentColor} 
                              />
                            </View>
                            <Text style={[styles.cardText, { color: isSelected ? '#FFF' : colors.text }]}>
                              {interest}
                            </Text>
                            {isSelected && (
                              <View style={[styles.checkBadge, { backgroundColor: colors.surface }]}> 
                                <Ionicons name="checkmark" size={14} color={category.accentColor} />
                              </View>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              );
            })}

            <View style={styles.spacer} />

            <View style={styles.footerInfo}>
               <Text style={[styles.selectedCount, { color: colors.textSecondary }]}>
                {selected.length} selected · minimum {MIN_REQUIRED_INTERESTS}
              </Text>
            </View>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              rightIcon="sparkles"
              disabled={selected.length < MIN_REQUIRED_INTERESTS || isSubmitting}
              onPress={handleFinish}
              style={styles.submitBtn}
            >
              {isSubmitting ? 'Starting...' : 'Start Exploring'}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: 'transparent' 
  },
  keyboardAvoid: { 
    flex: 1 
  },
  mobileHeader: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, 
    paddingBottom: 12 
  },
  stepText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
  },
  desktopBackRow: {
    position: 'absolute',
    top: 24,
    left: 40,
    zIndex: 10,
  },
  desktopBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  desktopBackText: { 
    fontSize: 14, 
    fontFamily: 'Poppins_500Medium', 
    color: '#FFFFFF' 
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  scrollContentDesktop: {
    justifyContent: 'center',
    paddingVertical: 40,
  },
  formCard: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.1,
    shadowRadius: 32,
    elevation: 8,
  },
  formCardDesktop: {
    paddingHorizontal: 48,
    paddingVertical: 48,
  },
  title: { 
    fontSize: 28, 
    fontFamily: 'Poppins_700Bold', 
    marginBottom: 8, 
    letterSpacing: -0.5 
  },
  subtitle: { 
    fontSize: 15, 
    fontFamily: 'Poppins_400Regular', 
    lineHeight: 24, 
    marginBottom: 32 
  },
  block: { 
    marginBottom: 24 
  },
  sectionLabel: { 
    fontSize: 12, 
    fontFamily: 'Poppins_600SemiBold', 
    textTransform: 'uppercase', 
    letterSpacing: 1, 
    marginBottom: 10 
  },
  popularRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 8 
  },
  popularChip: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    borderWidth: 1.5, 
    borderRadius: 18, 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
  },
  popularChipText: { 
    fontSize: 13, 
    fontFamily: 'Poppins_500Medium', 
  },
  categorySection: { 
    borderWidth: 1.5, 
    borderRadius: 20, 
    marginBottom: 16, 
    padding: 16 
  },
  categoryHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 12 
  },
  categoryTitleWrap: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12 
  },
  categoryDot: { 
    width: 12, 
    height: 12, 
    borderRadius: 6 
  },
  categoryTitle: { 
    fontSize: 16, 
    fontFamily: 'Poppins_600SemiBold' 
  },
  categoryMeta: { 
    fontSize: 13, 
    fontFamily: 'Poppins_500Medium' 
  },
  grid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 8 
  },
  card: { 
    width: '48%' as never, 
    flexGrow: 1, 
    paddingVertical: 14, 
    paddingHorizontal: 12, 
    borderRadius: 14, 
    borderWidth: 1.5, 
    alignItems: 'center', 
    gap: 8, 
    position: 'relative' 
  },
  iconCircle: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  cardText: { 
    fontSize: 13, 
    fontFamily: 'Poppins_600SemiBold', 
    textAlign: 'center' 
  },
  checkBadge: { 
    position: 'absolute', 
    top: 8, 
    right: 8, 
    width: 22, 
    height: 22, 
    borderRadius: 11, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  spacer: {
    height: 32,
  },
  footerInfo: {
    marginBottom: 16,
  },
  selectedCount: { 
    fontSize: 14, 
    fontFamily: 'Poppins_500Medium', 
    textAlign: 'center' 
  },
  submitBtn: { 
    borderRadius: 16,
    height: 56,
  },
});
