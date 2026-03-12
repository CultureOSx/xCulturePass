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
import { BlurView } from 'expo-blur';

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
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(onboarding)/signup')} hitSlop={8} style={[styles.desktopBackBtn, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
            <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
            <Text style={styles.desktopBackText}>Back</Text>
          </Pressable>
        </View>
      )}

      {!isDesktop && (
        <View style={[styles.mobileHeader, { paddingTop: topInset + 12 }]}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(onboarding)/signup'))} hitSlop={12}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.stepText}>1 of 4</Text>
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
                  <Ionicons name={step === 'state' ? "map-outline" : "business-outline"} size={28} color="#FFFFFF" />
                </View>
                <Text style={styles.title}>
                  {step === 'state' ? 'Where are you?' : 'Select your city'}
                </Text>
                <Text style={styles.subtitle}>
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
                      { backgroundColor: pressed ? 'rgba(255, 140, 66, 0.2)' : 'rgba(255, 140, 66, 0.1)' },
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
                            backgroundColor: pressed ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                            borderColor: 'rgba(255,255,255,0.1)',
                          },
                        ]}
                        onPress={() => selectState(s.code)}
                      >
                        <Text style={styles.stateEmoji}>{s.emoji}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.stateName}>{s.name}</Text>
                          <Text style={styles.cityCount}>{s.cities.length} cities</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.4)" />
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
                  >
                    <Ionicons name="arrow-back" size={16} color={CultureTokens.saffron} />
                    <Text style={[styles.backToStateText, { color: CultureTokens.saffron }]}>
                      Back to states
                    </Text>
                  </Pressable>

                  <View style={styles.selectedStateRow}>
                    <Text style={styles.stateEmojiLarge}>{pendingStateMeta?.emoji}</Text>
                    <Text style={styles.selectedStateText}>
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
                                : pressed ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                              borderColor: isActive ? 'transparent' : 'rgba(255,255,255,0.1)',
                            },
                          ]}
                          onPress={() => selectCity(city)}
                        >
                          <Ionicons
                            name="location"
                            size={18}
                            color={isActive ? '#FFFFFF' : 'rgba(255,255,255,0.6)'}
                          />
                          <Text style={[styles.cityName, { color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.9)' }]}>
                            {city}
                          </Text>
                          {isActive && (
                            <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
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
  formContainer: { width: '100%', maxWidth: 460, alignSelf: 'center', borderRadius: 32, overflow: 'hidden' },
  formContainerDesktop: { maxWidth: 520 },
  formBlur: { borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  formContent: { padding: 32, paddingTop: 40 },
  headerBlock: { alignItems: 'center', marginBottom: 32 },
  iconWrapper: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  title: { fontSize: 32, fontFamily: 'Poppins_700Bold', textAlign: 'center', marginBottom: 8, letterSpacing: -0.5, color: '#FFFFFF' },
  subtitle: { fontSize: 15, fontFamily: 'Poppins_400Regular', textAlign: 'center', color: 'rgba(255,255,255,0.7)', lineHeight: 22 },
  detectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255, 140, 66, 0.3)' },
  detectBtnText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, marginBottom: 24, borderWidth: 1 },
  errorText: { flex: 1, fontSize: 14, fontFamily: 'Poppins_500Medium' },
  grid: { gap: 12 },
  stateCard: { flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: 16, padding: 18, borderWidth: 1 },
  stateEmoji: { fontSize: 28 },
  stateName: { fontSize: 16, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF', marginBottom: 2 },
  cityCount: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.5)' },
  backToStateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20, alignSelf: 'flex-start' },
  backToStateText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  selectedStateRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24, paddingBottom: 20, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  stateEmojiLarge: { fontSize: 36 },
  selectedStateText: { fontSize: 22, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  cityGrid: { gap: 10 },
  cityCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, padding: 16, borderWidth: 1 },
  cityName: { flex: 1, fontSize: 15, fontFamily: 'Poppins_500Medium' },
  spacer: { height: 32 },
  submitBtn: { height: 56, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 6 },
});
