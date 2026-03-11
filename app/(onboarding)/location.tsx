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
import { CultureTokens, gradients } from '@/constants/theme';
import * as Haptics from 'expo-haptics';

export default function LocationScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
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
      
      // We skip the alert on requesting as we just failed
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
    <View style={styles.container}>
      <LinearGradient
        colors={gradients.culturepassBrand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.95 }}
        style={StyleSheet.absoluteFillObject}
      />

      {isDesktop && (
        <View style={styles.desktopBackRow}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(onboarding)/signup')} hitSlop={8} style={[styles.desktopBackBtn, { backgroundColor: colors.surface + '26' }]}>
            <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
            <Text style={styles.desktopBackText}>Back</Text>
          </Pressable>
        </View>
      )}

      {!isDesktop && (
        <View style={[styles.mobileHeader, { paddingTop: topInset }]}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(onboarding)/signup'))} hitSlop={12}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </Pressable>
          <Text style={[styles.stepText, { color: '#FFFFFF' }]}>1 of 3</Text>
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
            <Text style={[styles.title, { color: colors.text }]}>
              {step === 'state' ? 'Where are you?' : 'Select your city'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {step === 'state' 
                ? 'Select your state to discover culture near you.' 
                : 'Choose your home city for local recommendations.'}
            </Text>

            {step === 'state' ? (
              <View>
                <Pressable
                  style={[
                    styles.detectBtn,
                    {
                      backgroundColor: colors.primarySoft,
                      borderColor: colors.primary,
                      opacity: isDetecting ? 0.7 : 1,
                    },
                  ]}
                  onPress={handleDetectLocation}
                  disabled={isDetecting}
                >
                  {isDetecting ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons name="navigate" size={18} color={colors.primary} />
                  )}
                  <Text style={[styles.detectBtnText, { color: colors.primary }]}>
                    {isDetecting ? 'Detecting location…' : 'Use My Location'}
                  </Text>
                </Pressable>

                {locationsLoading && (
                  <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
                )}
                
                {!!locationsError && (
                  <View style={[styles.errorBanner, { backgroundColor: CultureTokens.error + '1A' }]}>
                    <Ionicons name="alert-circle-outline" size={18} color={CultureTokens.error} />
                    <Text style={[styles.errorText, { color: CultureTokens.error }]}>Failed to load locations.</Text>
                  </View>
                )}

                <View style={styles.grid}>
                  {states.map((s) => (
                    <Pressable
                      key={s.code}
                      style={[
                        styles.stateCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.borderLight,
                        },
                      ]}
                      onPress={() => selectState(s.code)}
                    >
                      <Text style={styles.stateEmoji}>{s.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.stateName, { color: colors.text }]}>
                          {s.name}
                        </Text>
                        <Text style={[styles.cityCount, { color: colors.textSecondary }]}>
                          {s.cities.length} cities
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : (
              <View>
                <Pressable
                  onPress={() => setStep('state')}
                  style={styles.backToStateRow}
                >
                  <Ionicons name="arrow-back" size={16} color={colors.primary} />
                  <Text style={[styles.backToStateText, { color: colors.primary }]}>
                    Back to states
                  </Text>
                </Pressable>

                <View style={styles.selectedStateRow}>
                  <Text style={styles.stateEmojiLarge}>{pendingStateMeta?.emoji}</Text>
                  <Text style={[styles.selectedStateText, { color: colors.text }]}>
                    {pendingStateMeta?.name}
                  </Text>
                </View>

                <View style={styles.cityGrid}>
                  {citiesToShow.map((city) => {
                    const isActive = state.city === city;
                    return (
                      <Pressable
                        key={city}
                        style={[
                          styles.cityCard,
                          {
                            backgroundColor: isActive ? colors.primary : colors.surface,
                            borderColor: isActive ? colors.primary : colors.borderLight,
                          },
                        ]}
                        onPress={() => selectCity(city)}
                      >
                        <Ionicons
                          name="location"
                          size={18}
                          color={isActive ? '#FFF' : colors.primary}
                        />
                        <Text style={[styles.cityName, { color: isActive ? '#FFF' : colors.text }]}>
                          {city}
                        </Text>
                        {isActive && (
                          <Ionicons name="checkmark-circle" size={18} color="#FFF" />
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
    maxWidth: 480,
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
    marginBottom: 24 
  },
  detectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 14,
    marginBottom: 24,
  },
  detectBtnText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
  errorBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10, 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    borderRadius: 14, 
    marginBottom: 24 
  },
  errorText: { 
    flex: 1, 
    fontSize: 14, 
    fontFamily: 'Poppins_500Medium', 
  },
  grid: {
    gap: 12,
  },
  stateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
  },
  stateEmoji: {
    fontSize: 26,
  },
  stateName: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
  cityCount: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    marginTop: 1,
  },
  backToStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  backToStateText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  selectedStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.2)',
  },
  stateEmojiLarge: {
    fontSize: 32,
  },
  selectedStateText: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
  },
  cityGrid: {
    gap: 10,
  },
  cityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
  },
  cityName: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
  spacer: {
    height: 32,
  },
  submitBtn: { 
    borderRadius: 16,
    height: 56,
  },
});
