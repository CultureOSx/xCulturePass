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

const CHIP_COLORS = [
  '#E85D3A', '#1A7A6D', '#F2A93B', '#3498DB', '#9B59B6',
  '#E74C3C', '#2ECC71', '#1ABC9C', '#8E44AD', '#F39C12',
  '#16A085', '#C0392B', '#2980B9', '#D35400', '#27AE60',
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
        colors={gradients.culturepassBrand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.95 }}
        style={StyleSheet.absoluteFillObject}
      />

      {isDesktop && (
        <View style={styles.desktopBackRow}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(onboarding)/location')} hitSlop={8} style={[styles.desktopBackBtn, { backgroundColor: colors.surface + '26' }]}>
            <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
            <Text style={styles.desktopBackText}>Back</Text>
          </Pressable>
        </View>
      )}

      {!isDesktop && (
        <View style={[styles.mobileHeader, { paddingTop: topInset }]}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(onboarding)/location'))} hitSlop={12}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </Pressable>
          <Text style={[styles.stepText, { color: '#FFFFFF' }]}>2 of 3</Text>
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
            <Text style={[styles.title, { color: colors.text }]}>Your Communities</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Select the communities you&apos;d like to connect with.
            </Text>

            <View style={styles.chipContainer}>
              {communities.map((community, idx) => {
                const isSelected = selected.includes(community);
                const color = CHIP_COLORS[idx % CHIP_COLORS.length];
                const iconName = (communityIcons[community] as string | undefined) ?? 'people';
                
                return (
                  <Pressable
                    key={community}
                    style={[
                      styles.chip,
                      { backgroundColor: colors.surface, borderColor: colors.borderLight },
                      isSelected && { backgroundColor: color, borderColor: color },
                    ]}
                    onPress={() => toggle(community)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Community: ${community}`}
                  >
                    <Ionicons 
                      name={iconName as never} 
                      size={18} 
                      color={isSelected ? '#FFF' : color} 
                    />
                    <Text style={[styles.chipText, { color: isSelected ? '#FFF' : colors.text }]}>
                      {community}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                    )}
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.spacer} />

            <View style={styles.footerInfo}>
               <Text style={[styles.selectedCount, { color: colors.textSecondary }]}>
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
              style={styles.submitBtn}
            >
              Continue
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
  chipContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 10 
  },
  chip: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderRadius: 24, 
    borderWidth: 1.5 
  },
  chipText: { 
    fontSize: 15, 
    fontFamily: 'Poppins_500Medium' 
  },
  spacer: {
    height: 48,
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
