import { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
  Platform,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useColors } from '@/hooks/useColors';
import { useLocations } from '@/hooks/useLocations';
import { useNearestCity } from '@/hooks/useNearestCity';

export function LocationPicker() {
  const { state, updateLocation } = useOnboarding();
  const colors = useColors();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { states, citiesByState, getStateForCity, isLoading: locationsLoading, error: locationsError } = useLocations();
  const { detect, status: detectStatus } = useNearestCity();
  const isDetecting = detectStatus === 'requesting';
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<'state' | 'city'>('state');
  const [pendingState, setPendingState] = useState('');
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const open = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep('state');
    setPendingState('');
    setVisible(true);
  }, []);

  const selectState = useCallback((stateCode: string) => {
    Haptics.selectionAsync();
    setPendingState(stateCode);
    setStep('city');
  }, []);

  const selectCity = useCallback(async (city: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateLocation('Australia', city);
    setVisible(false);
  }, [updateLocation]);

  const handleDetectLocation = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const r = await detect();
    if (r) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await updateLocation('Australia', r.city);
      setVisible(false);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [detect, updateLocation]);

  const close = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVisible(false);
  }, []);

  // Derive which state the current city belongs to
  const currentStateCode = state.city ? getStateForCity(state.city) : undefined;
  const currentStateMeta = states.find(s => s.code === currentStateCode);
  const pendingStateMeta = states.find(s => s.code === pendingState);
  const citiesToShow = pendingState ? (citiesByState[pendingState] ?? []) : [];

  const locationLabel = state.city
    ? `${state.city}${currentStateMeta ? `, ${currentStateMeta.code}` : ''}`
    : 'Select Location';

  return (
    <>
      <Pressable
        style={[styles.trigger, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={open}
      >
        <View style={[styles.triggerDot, { backgroundColor: colors.primary }]}>
          <Ionicons name="location" size={14} color="#FFF" />
        </View>
        <Text style={[styles.triggerText, { color: colors.text }]} numberOfLines={1}>
          {locationLabel}
        </Text>
        <Ionicons name="chevron-down" size={14} color={colors.textTertiary} />
      </Pressable>

      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={close}
      >
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          {/* Blurred modal background — iOS only */}
          {Platform.OS === 'ios' && (
            <BlurView
              intensity={60}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          )}

          <View style={[styles.modalInner, { paddingTop: topInset + 10 }]}>
            {/* Handle bar */}
            <View style={[styles.handle, { backgroundColor: colors.borderLight }]} />

            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Pressable
                onPress={() => {
                  if (step === 'city') {
                    setStep('state');
                    setPendingState('');
                  } else {
                    close();
                  }
                }}
                hitSlop={12}
                style={styles.headerBtn}
              >
                <Ionicons
                  name={step === 'city' ? 'chevron-back' : 'close'}
                  size={24}
                  color={colors.text}
                />
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {step === 'state' ? 'Select State' : 'Select City'}
              </Text>
              {/* 🇦🇺 flag on the right */}
              <Text style={styles.auFlag}>🇦🇺</Text>
            </View>

            {/* Content */}
            {step === 'state' ? (
              <ScrollView
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Detect location button */}
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

                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Or choose your area manually
                </Text>
                {locationsLoading && (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading locations…</Text>
                  </View>
                )}
                {!!locationsError && (
                  <Text style={[styles.feedbackText, { color: colors.error }]}>Couldn&apos;t load updated locations. Showing fallback list.</Text>
                )}
                {detectStatus === 'denied' && (
                  <Text style={[styles.feedbackText, { color: colors.error }]}>Location permission denied. Please choose a state and city manually.</Text>
                )}
                {detectStatus === 'unavailable' && (
                  <Text style={[styles.feedbackText, { color: colors.warning }]}>Location services are off. Turn them on or choose manually.</Text>
                )}
                {detectStatus === 'error' && (
                  <Text style={[styles.feedbackText, { color: colors.error }]}>Couldn&apos;t detect your city. Please select it manually.</Text>
                )}
                {states.map((s) => {
                  const isActive = s.code === currentStateCode;
                  return (
                    <Pressable
                      key={s.code}
                      style={[
                        styles.stateCard,
                        {
                          backgroundColor: isActive ? colors.primarySoft : colors.surface,
                          borderColor: isActive ? colors.primary : colors.borderLight,
                          shadowColor: colors.primary,
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.08,
                          shadowRadius: 6,
                          elevation: 2,
                        },
                      ]}
                      onPress={() => selectState(s.code)}
                    >
                      <Text style={styles.stateEmoji}>{s.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.stateName, { color: isActive ? colors.primary : colors.text }]}>
                          {s.name}
                        </Text>
                        <Text style={[styles.cityCount, { color: colors.textSecondary }]}>
                          {s.cities.length} cities
                        </Text>
                      </View>
                      {isActive && (
                        <View style={[styles.currentBadge, { backgroundColor: colors.primary }]}>
                          <Text style={styles.currentBadgeText}>Current</Text>
                        </View>
                      )}
                      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : (
              <ScrollView
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Selected state pill */}
                <View style={styles.selectedStateRow}>
                  <Text style={styles.stateEmoji}>{pendingStateMeta?.emoji}</Text>
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
                            shadowColor: colors.primary,
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.08,
                            shadowRadius: 6,
                            elevation: 2,
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
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 50,
    borderWidth: 1,
  },
  triggerDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    maxWidth: 170,
  },
  modal: {
    flex: 1,
  },
  modalInner: {
    flex: 1,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
    marginTop: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
  },
  auFlag: {
    fontSize: 22,
    width: 36,
    textAlign: 'center',
  },
  detectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 14,
    marginBottom: 16,
  },
  detectBtnText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    marginBottom: 16,
    lineHeight: 20,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  loadingText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
  },
  feedbackText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    marginBottom: 10,
    lineHeight: 17,
  },
  listContent: {
    padding: 20,
    paddingBottom: 60,
  },
  stateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
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
  currentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  currentBadgeText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFF',
  },
  selectedStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    paddingBottom: 16,
  },
  selectedStateText: {
    fontSize: 18,
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
});
