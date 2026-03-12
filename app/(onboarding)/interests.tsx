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
import { CultureTokens, gradients } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

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
        colors={gradients.culturepassBrandReversed}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBg}
      />

      {/* Decorative Orbs */}
      {Platform.OS === 'web' ? (
        <>
          <View style={[styles.orb, { top: -100, right: -50, backgroundColor: CultureTokens.indigo, opacity: 0.5, filter: 'blur(50px)' } as any]} />
          <View style={[styles.orb, { bottom: -50, left: -50, backgroundColor: CultureTokens.saffron, opacity: 0.3, filter: 'blur(50px)' } as any]} />
        </>
      ) : null}

      {isDesktop && (
        <View style={styles.desktopBackRow}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(onboarding)/communities')} hitSlop={8} style={[styles.desktopBackBtn, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
            <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
            <Text style={styles.desktopBackText}>Back</Text>
          </Pressable>
        </View>
      )}

      {!isDesktop && (
        <View style={[styles.mobileHeader, { paddingTop: topInset + 12 }]}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(onboarding)/communities'))} hitSlop={12}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.stepText}>4 of 4</Text>
        </View>
      )}

      <KeyboardAvoidingView 
        style={styles.keyboardAvoid} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
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
          <View style={[styles.formContainer, isDesktop && styles.formContainerDesktop]}>
            {Platform.OS === 'ios' || Platform.OS === 'web' ? (
              <BlurView intensity={isDesktop ? 60 : 40} tint="dark" style={[StyleSheet.absoluteFill, styles.formBlur]} />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.formBlur, { backgroundColor: 'rgba(11, 11, 20, 0.85)' }]} />
            )}

            <View style={styles.formContent}>
              <View style={styles.headerBlock}>
                <View style={[styles.iconWrapper, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                  <Ionicons name="sparkles-outline" size={28} color="#FFFFFF" />
                </View>
                <Text style={styles.title}>What interests you?</Text>
                <Text style={styles.subtitle}>
                  Choose at least {MIN_REQUIRED_INTERESTS} interests to personalize your content.
                </Text>
              </View>

              <View style={styles.block}>
                <Text style={styles.sectionLabel}>Popular in Sydney</Text>
                <View style={styles.popularRow}>
                  {popularInterestsSydney.map((interest) => {
                    const category = categoryByInterest.get(interest);
                    const isSelected = selectedSet.has(interest);
                    const accentColor = category?.accentColor ?? CultureTokens.saffron;
                    const iconName = (interestIcons[interest] as string | undefined) ?? 'star';

                    return (
                      <Pressable
                        key={interest}
                        onPress={() => toggle(interest)}
                        style={({pressed}) => [
                          styles.popularChip,
                          { 
                            backgroundColor: isSelected 
                              ? accentColor 
                              : pressed ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                            borderColor: isSelected ? 'transparent' : 'rgba(255,255,255,0.2)',
                          },
                        ]}
                      >
                        <Ionicons 
                          name={iconName as never} 
                          size={14} 
                          color={isSelected ? '#FFFFFF' : accentColor} 
                        />
                        <Text 
                          numberOfLines={1} 
                          style={[styles.popularChipText, { color: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.9)' }]}
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
                const accentColor = category.accentColor || CultureTokens.saffron;

                return (
                  <View 
                    key={category.id} 
                    style={styles.categorySection}
                  >
                    <Pressable style={styles.categoryHeader} onPress={() => toggleSection(category.id)}>
                      <View style={styles.categoryTitleWrap}>
                        <View style={[styles.categoryDot, { backgroundColor: accentColor }]} />
                        <View>
                          <Text style={styles.categoryTitle}>
                            {category.title}
                          </Text>
                          <Text style={styles.categoryMeta}>
                            {selectedInCategory} selected
                          </Text>
                        </View>
                      </View>
                      <Ionicons 
                        name={isOpen ? 'chevron-up' : 'chevron-down'} 
                        size={20} 
                        color="rgba(255,255,255,0.5)" 
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
                              style={({pressed}) => [
                                styles.card,
                                { 
                                  backgroundColor: isSelected 
                                    ? accentColor 
                                    : pressed ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                                  borderColor: isSelected ? 'transparent' : 'rgba(255,255,255,0.1)',
                                },
                              ]}
                              onPress={() => toggle(interest)}
                            >
                              <View style={[
                                styles.iconCircle, 
                                { backgroundColor: isSelected ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.08)' }
                              ]}>
                                <Ionicons 
                                  name={iconName as never} 
                                  size={20} 
                                  color={isSelected ? '#FFFFFF' : accentColor} 
                                />
                              </View>
                              <Text style={[styles.cardText, { color: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.9)' }]}>
                                {interest}
                              </Text>
                              {isSelected && (
                                <View style={styles.checkBadge}> 
                                  <Ionicons name="checkmark" size={14} color={accentColor} />
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
                <Text style={styles.selectedCount}>
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
                style={[styles.submitBtn, { backgroundColor: CultureTokens.saffron }]}
              >
                {isSubmitting ? 'Starting...' : 'Start Exploring'}
              </Button>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B14' },
  gradientBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.8 },
  orb: { position: 'absolute', width: 300, height: 300, borderRadius: 150 },
  keyboardAvoid: { flex: 1 },
  mobileHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  stepText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: 'rgba(255,255,255,0.5)', letterSpacing: 1, textTransform: 'uppercase' },
  desktopBackRow: { position: 'absolute', top: 32, left: 40, zIndex: 10 },
  desktopBackBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  desktopBackText: { fontSize: 14, fontFamily: 'Poppins_500Medium', color: '#FFFFFF' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 60, justifyContent: 'center' },
  scrollContentDesktop: { paddingVertical: 60 },
  formContainer: { width: '100%', maxWidth: 640, alignSelf: 'center', borderRadius: 32, overflow: 'hidden' },
  formContainerDesktop: { maxWidth: 720 },
  formBlur: { borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  formContent: { padding: 32, paddingTop: 40 },
  headerBlock: { alignItems: 'center', marginBottom: 32 },
  iconWrapper: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  title: { fontSize: 32, fontFamily: 'Poppins_700Bold', textAlign: 'center', marginBottom: 8, letterSpacing: -0.5, color: '#FFFFFF' },
  subtitle: { fontSize: 15, fontFamily: 'Poppins_400Regular', textAlign: 'center', color: 'rgba(255,255,255,0.7)', lineHeight: 22 },
  block: { marginBottom: 24 },
  sectionLabel: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, color: 'rgba(255,255,255,0.6)' },
  popularRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  popularChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  popularChipText: { fontSize: 14, fontFamily: 'Poppins_500Medium' },
  categorySection: { borderWidth: 1, borderRadius: 24, marginBottom: 16, padding: 20, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.02)' },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  categoryTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryDot: { width: 12, height: 12, borderRadius: 6 },
  categoryTitle: { fontSize: 18, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
  categoryMeta: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.5)' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '48%' as never, flexGrow: 1, paddingVertical: 16, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, alignItems: 'center', gap: 10, position: 'relative' },
  iconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  cardText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', textAlign: 'center' },
  checkBadge: { position: 'absolute', top: 10, right: 10, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  spacer: { height: 48 },
  footerInfo: { marginBottom: 16 },
  selectedCount: { fontSize: 14, fontFamily: 'Poppins_500Medium', textAlign: 'center', color: 'rgba(255,255,255,0.6)' },
  submitBtn: { height: 56, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 6 },
});
