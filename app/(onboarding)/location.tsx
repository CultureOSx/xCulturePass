import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useColors } from '@/hooks/useColors';
import { useLocations } from '@/hooks/useLocations';
import { useNearestCity } from '@/hooks/useNearestCity';
import { Button } from '@/components/ui/Button';
import { LinearGradient } from 'expo-linear-gradient';
import { CultureTokens, gradients, CardTokens, glass, shadows } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

export default function LocationScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1024;
  const topInset = Platform.OS === 'web' ? 0 : insets.top;

  const { state, setCountry, setCity } = useOnboarding();
  const { states, citiesByState, getStateForCity, isLoading: locationsLoading, error: locationsError } = useLocations();
  const { detect, status: detectStatus } = useNearestCity();
  const isDetecting = detectStatus === 'requesting';

  const [step, setStep] = useState<'state' | 'city'>('state');
  const [pendingState, setPendingState] = useState('');

  useEffect(() => {
    if (state.city) {
      const stateCode = getStateForCity(state.city);
      if (stateCode) {
        setPendingState(stateCode);
        setStep('city');
      }
    }
  }, [state.city, getStateForCity]);

  const selectState = (stateCode: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setPendingState(stateCode);
    setStep('city');
  };

  const selectCity = (city: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setCountry('Australia');
    setCity(city);
  };

  const handleDetectLocation = async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const r = await detect();
    if (r) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCountry('Australia');
      setCity(r.city);
      const stateCode = getStateForCity(r.city);
      if (stateCode) {
        setPendingState(stateCode);
        setStep('city');
      }
    } else {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      if (detectStatus === 'denied') {
        Alert.alert('Location Permission Required', 'Please allow location access to detect your city automatically, or select it manually below.');
      } else if (detectStatus === 'unavailable') {
        Alert.alert('Location Services Off', 'Turn on location services to auto-detect your city, or select it manually below.');
      } else {
        Alert.alert('Could Not Detect Location', 'We could not detect your city. Please choose your city manually.');
      }
    }
  };

  const handleNext = () => {
    if (state.country && state.city) {
      router.replace('/(onboarding)/communities');
      return;
    }
    Alert.alert('Select Location', 'Please choose your state and city to continue.');
  };

  const pendingStateMeta = states.find(s => s.code === pendingState);
  const citiesToShow = pendingState ? (citiesByState[pendingState] ?? []) : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={gradients.culturepassBrand}
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
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(onboarding)/signup')} hitSlop={8} style={[styles.desktopBackBtn, { backgroundColor: glass.overlay.backgroundColor, borderColor: colors.border }]}>
            <Ionicons name="chevron-back" size={18} color={colors.textInverse} />
            <Text style={[styles.desktopBackText, { color: colors.textInverse }]}>Back</Text>
          </Pressable>
        </View>
      )}

      {!isDesktop && (
        <View style={[styles.mobileHeader, { paddingTop: topInset + 12 }]}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(onboarding)/signup'))} hitSlop={12}>
            <Ionicons name="chevron-back" size={28} color={colors.textInverse} />
          </Pressable>
          <Text style={[styles.stepText, { color: colors.textSecondary }]}>1 of 4</Text>
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
          <View style={[styles.formContainer, isDesktop && styles.formContainerDesktop, { borderRadius: CardTokens.radiusLarge }]}>
            {Platform.OS === 'ios' || Platform.OS === 'web' ? (
              <BlurView intensity={isDesktop ? 60 : 40} tint="dark" style={[StyleSheet.absoluteFill, styles.formBlur, { borderRadius: CardTokens.radiusLarge, borderColor: colors.borderLight }]} />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.formBlur, { backgroundColor: colors.surface, borderRadius: CardTokens.radiusLarge, borderColor: colors.borderLight }]} />
            )}

            <View style={[styles.formContent, { padding: CardTokens.paddingLarge * 2 }]}>
              <View style={styles.headerBlock}>
                <View style={[styles.iconWrapper, { backgroundColor: colors.overlay, borderColor: colors.borderLight }]}>
                  <Ionicons name={step === 'state' ? "map-outline" : "business-outline"} size={28} color={colors.textInverse} />
                </View>
                <Text style={[styles.title, { color: colors.textInverse }]}>
                  {step === 'state' ? 'Where are you?' : 'Select your city'}
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  {step === 'state' 
                    ? 'Select your state to discover culture near you.' 
                    : 'Choose your home city for local recommendations.'}
                </Text>
              </View>

              {step === 'state' ? (
                <View>
                  <Pressable
                    style={({pressed}) => [
                      styles.detectBtn,
                      { backgroundColor: pressed ? 'rgba(255, 140, 66, 0.2)' : 'rgba(255, 140, 66, 0.1)', borderColor: CultureTokens.saffron + '50' },
                      isDetecting && { opacity: 0.7 }
                    ]}
                    onPress={handleDetectLocation}
                    disabled={isDetecting}
                  >
                    {isDetecting ? (
                      <ActivityIndicator size="small" color={CultureTokens.saffron} />
                    ) : (
                      <Ionicons name="navigate" size={18} color={CultureTokens.saffron} />
                    )}
                    <Text style={[styles.detectBtnText, { color: CultureTokens.saffron }]}>
                      {isDetecting ? 'Detecting location…' : 'Use My Location'}
                    </Text>
                  </Pressable>

                  {locationsLoading && (
                    <ActivityIndicator size="large" color={CultureTokens.indigo} style={{ paddingVertical: 20 }} />
                  )}
                  
                  {!!locationsError && (
                    <View style={[styles.errorBanner, { backgroundColor: CultureTokens.coral + '20', borderColor: CultureTokens.coral + '50' }]}>
                      <Ionicons name="alert-circle" size={20} color={CultureTokens.coral} />
                      <Text style={[styles.errorText, { color: CultureTokens.coral }]}>Failed to load locations.</Text>
                    </View>
                  )}

                  <View style={styles.grid}>
                    {states.map((s) => (
                      <Pressable
                        key={s.code}
                        style={({pressed}) => [
                          styles.stateCard,
                          {
                            backgroundColor: pressed ? colors.primaryGlow : 'transparent',
                            borderColor: colors.borderLight,
                          },
                        ]}
                        onPress={() => selectState(s.code)}
                      >
                        <Text style={styles.stateEmoji}>{s.emoji}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.stateName, { color: colors.textInverse }]}>{s.name}</Text>
                          <Text style={[styles.cityCount, { color: colors.textSecondary }]}>{s.cities.length} cities</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : (
                <View>
                  <Pressable
                    onPress={() => setStep('state')}
                    style={({pressed}) => [
                      styles.backToStateRow,
                      { opacity: pressed ? 0.7 : 1 }
                    ]}
                    hitSlop={12}
                  >
                    <Ionicons name="arrow-back" size={16} color={CultureTokens.saffron} />
                    <Text style={[styles.backToStateText, { color: CultureTokens.saffron }]}>
                      Back to states
                    </Text>
                  </Pressable>

                  <View style={[styles.selectedStateRow, { borderColor: colors.borderLight }]}>
                    <Text style={styles.stateEmojiLarge}>{pendingStateMeta?.emoji}</Text>
                    <Text style={[styles.selectedStateText, { color: colors.textInverse }]}>
                      {pendingStateMeta?.name}
                    </Text>
                  </View>

                  <View style={styles.cityGrid}>
                    {citiesToShow.map((city) => {
                      const isActive = state.city === city;
                      return (
                        <Pressable
                          key={city}
                          style={({pressed}) => [
                            styles.cityCard,
                            {
                              backgroundColor: isActive 
                                ? CultureTokens.indigo 
                                : pressed ? colors.primaryGlow : 'transparent',
                              borderColor: isActive ? 'transparent' : colors.borderLight,
                            },
                          ]}
                          onPress={() => selectCity(city)}
                        >
                          <Ionicons
                            name="location"
                            size={18}
                            color={isActive ? colors.textInverse : colors.textSecondary}
                          />
                          <Text style={[styles.cityName, { color: isActive ? colors.textInverse : colors.textInverse }]}>
                            {city}
                          </Text>
                          {isActive && (
                            <Ionicons name="checkmark-circle" size={18} color={colors.textInverse} />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              <View style={styles.spacer} />

              <Button
                variant="primary"
                size="lg"
                fullWidth
                rightIcon="arrow-forward"
                disabled={!state.country || !state.city}
                onPress={handleNext}
                style={[styles.submitBtn, shadows.medium, { backgroundColor: CultureTokens.saffron }]}
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

const getStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { flex: 1 },
  gradientBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.85 },
  orb: { position: 'absolute', width: 300, height: 300, borderRadius: 150 },
  keyboardAvoid: { flex: 1 },
  mobileHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  stepText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', letterSpacing: 1, textTransform: 'uppercase' },
  desktopBackRow: { position: 'absolute', top: 32, left: 40, zIndex: 10 },
  desktopBackBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1 },
  desktopBackText: { fontSize: 14, fontFamily: 'Poppins_500Medium' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 60, justifyContent: 'center' },
  scrollContentDesktop: { paddingVertical: 60 },
  formContainer: { width: '100%', maxWidth: 460, alignSelf: 'center', overflow: 'hidden' },
  formContainerDesktop: { maxWidth: 520 },
  formBlur: { borderWidth: 1 },
  formContent: { paddingTop: 40 },
  headerBlock: { alignItems: 'center', marginBottom: 32 },
  iconWrapper: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1 },
  title: { fontSize: 32, fontFamily: 'Poppins_700Bold', textAlign: 'center', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, fontFamily: 'Poppins_400Regular', textAlign: 'center', lineHeight: 22 },
  detectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 16, marginBottom: 24, borderWidth: 1 },
  detectBtnText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, marginBottom: 24, borderWidth: 1 },
  errorText: { flex: 1, fontSize: 14, fontFamily: 'Poppins_500Medium' },
  grid: { gap: 12 },
  stateCard: { flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: 16, padding: 18, borderWidth: 1 },
  stateEmoji: { fontSize: 28 },
  stateName: { fontSize: 16, fontFamily: 'Poppins_600SemiBold', marginBottom: 2 },
  cityCount: { fontSize: 13, fontFamily: 'Poppins_400Regular' },
  backToStateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20, alignSelf: 'flex-start' },
  backToStateText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  selectedStateRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24, paddingBottom: 20, borderBottomWidth: 1 },
  stateEmojiLarge: { fontSize: 36 },
  selectedStateText: { fontSize: 22, fontFamily: 'Poppins_700Bold' },
  cityGrid: { gap: 10 },
  cityCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, padding: 16, borderWidth: 1 },
  cityName: { flex: 1, fontSize: 15, fontFamily: 'Poppins_500Medium' },
  spacer: { height: 32 },
  submitBtn: { height: 56, borderRadius: 16 },
});
