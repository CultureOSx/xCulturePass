import { View, Text, Pressable, StyleSheet, ScrollView, Platform, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useColors } from '@/hooks/useColors';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/query-client';
import type { LocationEntry } from '@/lib/api';
import { useNearestCity } from '@/hooks/useNearestCity';

export default function LocationScreen() {
  const insets   = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 0 : insets.top;
  const colors   = useColors();
  const { state, setCountry, setCity } = useOnboarding();
  const [selectedCountry, setSelectedCountry] = useState(state.country);
  const [selectedCity,    setSelectedCity]    = useState(state.city);

  const { data, isLoading } = useQuery<{ locations: LocationEntry[]; acknowledgementOfCountry: string }>({
    queryKey: ['/api/locations'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    staleTime: Infinity,
  });

  const locationList             = data?.locations ?? [];
  const acknowledgementOfCountry = data?.acknowledgementOfCountry ?? '';
  const effectiveCountry         = selectedCountry || (locationList.length === 1 ? locationList[0].country : selectedCountry);
  const selectedLocation         = locationList.find(l => l.country === effectiveCountry);

  const { detect, status: detectStatus } = useNearestCity();
  const isDetecting = detectStatus === 'requesting';

  const handleCountrySelect = (country: string) => { setSelectedCountry(country); setSelectedCity(''); };

  const handleDetectLocation = async () => {
    const r = await detect();
    if (r) {
      setSelectedCountry('Australia');
      setSelectedCity(r.city);
      return;
    }

    if (detectStatus === 'denied') {
      Alert.alert('Location Permission Required', 'Please allow location access to detect your city automatically, or select it manually below.');
    } else if (detectStatus === 'unavailable') {
      Alert.alert('Location Services Off', 'Turn on location services to auto-detect your city, or select it manually below.');
    } else if (detectStatus === 'error') {
      Alert.alert('Could Not Detect Location', 'We could not detect your city. Please choose your city manually.');
    }
  };

  const handleNext = () => {
    if (effectiveCountry && selectedCity) {
      setCountry(effectiveCountry);
      setCity(selectedCity);
      router.push('/(onboarding)/communities');
      return;
    }

    Alert.alert('Select Location', 'Please choose both your country and city to continue.');
  };

  return (
    <View style={[s.container, { paddingTop: topInset, backgroundColor: colors.background }]}>
      <View style={s.header}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(onboarding)/signup'))} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[s.step, { color: colors.textSecondary }]}>1 of 4</Text>
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        <Text style={[s.title, { color: colors.text }]}>Where are you?</Text>
        <Text style={[s.subtitle, { color: colors.textSecondary }]}>
          Select your country and city to discover events and communities near you.
        </Text>

        {/* GPS detect button */}
        <Pressable
          style={[s.detectBtn, { backgroundColor: colors.primarySoft, borderColor: colors.primary, opacity: isDetecting ? 0.7 : 1 }]}
          onPress={handleDetectLocation}
          disabled={isDetecting}
        >
          {isDetecting
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Ionicons name="navigate" size={18} color={colors.primary} />}
          <Text style={[s.detectBtnText, { color: colors.primary }]}>
            {isDetecting ? 'Detecting…' : 'Detect My Location'}
          </Text>
        </Pressable>

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Country selection */}
            <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>Country</Text>
            <View style={s.grid}>
              {locationList.map((loc) => {
                const isSelected = effectiveCountry === loc.country;
                return (
                  <Pressable
                    key={loc.countryCode}
                    style={[
                      s.countryCard,
                      { backgroundColor: colors.surface, borderColor: colors.borderLight },
                      isSelected && { borderColor: colors.primary, backgroundColor: colors.primaryGlow },
                    ]}
                    onPress={() => handleCountrySelect(loc.country)}
                  >
                    <Ionicons name="earth" size={24} color={isSelected ? colors.primary : colors.textSecondary} />
                    <Text style={[s.countryText, { color: isSelected ? colors.primary : colors.text }]}>
                      {loc.country}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* City selection */}
            {selectedLocation && (
              <>
                <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>City</Text>
                <View style={s.cityGrid}>
                  {selectedLocation.cities.map((city) => {
                    const isSelected = selectedCity === city;
                    return (
                      <Pressable
                        key={city}
                        style={[
                          s.cityChip,
                          { backgroundColor: colors.surface, borderColor: colors.borderLight },
                          isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                        ]}
                        onPress={() => setSelectedCity(city)}
                      >
                        <Ionicons name="location" size={15} color={isSelected ? colors.textInverse : colors.textSecondary} />
                        <Text style={[s.cityText, { color: isSelected ? colors.textInverse : colors.text }]}>{city}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {/* Acknowledgement of Country */}
            {effectiveCountry === 'Australia' && acknowledgementOfCountry ? (
              <View style={s.acknowledgementWrap}>
                <View style={[s.acknowledgementBanner, { backgroundColor: colors.warning + '14', borderLeftColor: colors.warning }]}> 
                  <View style={s.acknowledgementHeader}>
                    <Ionicons name="earth" size={22} color={colors.warning} />
                    <Text style={[s.acknowledgementTitle, { color: colors.text }]}>Acknowledgement of Country</Text>
                  </View>
                  <Text style={[s.acknowledgementText, { color: colors.textSecondary }]}>{acknowledgementOfCountry}</Text>
                </View>
              </View>
            ) : null}
          </>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={[s.footer, { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 16, backgroundColor: colors.background }]}>
        <Pressable
          style={[s.nextBtn, { backgroundColor: colors.primary }, (!effectiveCountry || !selectedCity) && { opacity: 0.4 }]}
          onPress={handleNext}
          disabled={!effectiveCountry || !selectedCity}
        >
          <Text style={[s.nextBtnText, { color: colors.textInverse }]}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.textInverse} />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  step:         { fontSize: 14, fontFamily: 'Poppins_500Medium' },
  content:      { flex: 1, paddingHorizontal: 20 },
  title:        { fontSize: 28, fontFamily: 'Poppins_700Bold', marginTop: 8 },
  subtitle:     { fontSize: 15, fontFamily: 'Poppins_400Regular', marginTop: 8, lineHeight: 22, marginBottom: 24 },
  sectionLabel: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 8 },

  grid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  countryCard:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, minWidth: '47%' as never, flexGrow: 1 },
  countryText:  { fontSize: 15, fontFamily: 'Poppins_500Medium', flexShrink: 1 },

  cityGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  cityChip:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24, borderWidth: 1.5 },
  cityText:     { fontSize: 14, fontFamily: 'Poppins_500Medium' },

  acknowledgementWrap:  { marginTop: 12, marginBottom: 8 },
  acknowledgementBanner:{ borderRadius: 16, padding: 16, borderLeftWidth: 4 },
  acknowledgementHeader:{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  acknowledgementTitle: { fontSize: 15, fontFamily: 'Poppins_700Bold', flex: 1 },
  acknowledgementText:  { fontSize: 13, fontFamily: 'Poppins_400Regular', lineHeight: 20 },

  footer:       { paddingHorizontal: 20, paddingTop: 12 },
  nextBtn:      { borderRadius: 16, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  nextBtnText:  { fontSize: 17, fontFamily: 'Poppins_600SemiBold' },

  detectBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 14, borderWidth: 1.5, paddingVertical: 14, marginBottom: 24 },
  detectBtnText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
});
