import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { communities, communityIcons } from '@/data/mockData';
import { Button } from '@/components/ui/Button';
import { LinearGradient } from 'expo-linear-gradient';
import { CultureTokens, gradients } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

const CHIP_COLORS = [
  CultureTokens.coral,
  CultureTokens.teal,
  CultureTokens.saffron,
  CultureTokens.indigo,
  '#9B59B6',
  CultureTokens.gold,
  '#2ECC71',
  '#1ABC9C',
  '#8E44AD',
  '#F39C12',
  '#16A085',
  '#C0392B',
  '#2980B9',
  '#D35400',
  '#27AE60',
];

export default function CommunitiesScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1024;
  const topInset = Platform.OS === 'web' ? 0 : insets.top;

  const { state, setCommunities } = useOnboarding();
  const [selected, setSelected] = useState<string[]>(state.communities || []);

  const toggle = useCallback((community: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(prev =>
      prev.includes(community) ? prev.filter(c => c !== community) : [...prev, community]
    );
  }, []);

  const handleNext = useCallback(() => {
    if (selected.length === 0) {
      Alert.alert('Select at least one community', 'Choose one or more communities to continue.');
      return;
    }

    setCommunities(selected);
    router.replace('/(onboarding)/interests');
  }, [selected, setCommunities]);

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
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(onboarding)/location')} hitSlop={8} style={[styles.desktopBackBtn, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
            <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
            <Text style={styles.desktopBackText}>Back</Text>
          </Pressable>
        </View>
      )}

      {!isDesktop && (
        <View style={[styles.mobileHeader, { paddingTop: topInset + 12 }]}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(onboarding)/location'))} hitSlop={12}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.stepText}>2 of 3</Text>
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
                  <Ionicons name="people-outline" size={28} color="#FFFFFF" />
                </View>
                <Text style={styles.title}>Your Communities</Text>
                <Text style={styles.subtitle}>
                  Select the diaspora and cultural groups you'd like to connect with.
                </Text>
              </View>

              <View style={styles.chipContainer}>
                {communities.map((community, idx) => {
                  const isSelected = selected.includes(community);
                  const color = CHIP_COLORS[idx % CHIP_COLORS.length];
                  const iconName = (communityIcons[community] as string | undefined) ?? 'people';
                  
                  return (
                    <Pressable
                      key={community}
                      style={({pressed}) => [
                        styles.chip,
                        { 
                          backgroundColor: isSelected 
                            ? color 
                            : pressed ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                          borderColor: isSelected ? 'transparent' : 'rgba(255,255,255,0.15)',
                        },
                      ]}
                      onPress={() => toggle(community)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`Community: ${community}`}
                    >
                      <Ionicons 
                        name={iconName as never} 
                        size={18} 
                        color={isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.7)'} 
                      />
                      <Text style={[styles.chipText, { color: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.9)' }]}>
                        {community}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                      )}
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.spacer} />

              <View style={styles.footerInfo}>
                <Text style={styles.selectedCount}>
                  {selected.length} {selected.length === 1 ? 'community' : 'communities'} selected
                </Text>
              </View>

              <Button
                variant="primary"
                size="lg"
                fullWidth
                rightIcon="arrow-forward"
                disabled={selected.length === 0}
                onPress={handleNext}
                style={[styles.submitBtn, { backgroundColor: CultureTokens.saffron }]}
              >
                Continue
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
  formContainer: { width: '100%', maxWidth: 580, alignSelf: 'center', borderRadius: 32, overflow: 'hidden' },
  formContainerDesktop: { maxWidth: 640 },
  formBlur: { borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  formContent: { padding: 32, paddingTop: 40 },
  headerBlock: { alignItems: 'center', marginBottom: 32 },
  iconWrapper: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  title: { fontSize: 32, fontFamily: 'Poppins_700Bold', textAlign: 'center', marginBottom: 8, letterSpacing: -0.5, color: '#FFFFFF' },
  subtitle: { fontSize: 15, fontFamily: 'Poppins_400Regular', textAlign: 'center', color: 'rgba(255,255,255,0.7)', lineHeight: 22 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24, borderWidth: 1 },
  chipText: { fontSize: 15, fontFamily: 'Poppins_500Medium' },
  spacer: { height: 48 },
  footerInfo: { marginBottom: 16 },
  selectedCount: { fontSize: 14, fontFamily: 'Poppins_500Medium', textAlign: 'center', color: 'rgba(255,255,255,0.6)' },
  submitBtn: { height: 56, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 6 },
});
