import { View, Text, Pressable, StyleSheet, ScrollView, Platform, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { CultureTokens, gradients } from '@/constants/theme';
import { BlurView } from 'expo-blur';
import { Button } from '@/components/ui/Button';

const FALLBACK_ETHNICITIES = [
  'Malay', 'Malaysian Chinese', 'Malayali', 'Indian', 'Chinese', 'Filipino',
  'Vietnamese', 'Arab', 'Pakistani', 'Sri Lankan', 'Bangladeshi', 'Nepali',
  'Korean', 'Japanese', 'African', 'Caribbean', 'Pacific Islander',
  'Latin American', 'European', 'Aboriginal and Torres Strait Islander',
];

const FALLBACK_LANGUAGES = [
  'English', 'Mandarin', 'Cantonese', 'Hindi', 'Urdu', 'Punjabi', 'Tamil',
  'Telugu', 'Malayalam', 'Malay', 'Indonesian', 'Vietnamese', 'Arabic',
  'Korean', 'Japanese', 'Spanish', 'French', 'Portuguese', 'Tagalog', 'Greek',
];

function localSuggest(list: string[], query: string, limit = 8): string[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 3) return [];
  return list
    .filter((item) => item.toLowerCase().includes(needle))
    .slice(0, limit);
}

function dedupeList(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function CultureMatchScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1024;
  const topInset = Platform.OS === 'web' ? 0 : insets.top;

  const { state, setEthnicityText, setLanguages } = useOnboarding();

  const [ethnicityInput, setEthnicityInput] = useState(state.ethnicityText || '');
  const [languageInput, setLanguageInput] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(state.languages || []);
  const [ethnicitySuggestions, setEthnicitySuggestions] = useState<string[]>([]);
  const [languageSuggestions, setLanguageSuggestions] = useState<string[]>([]);
  const [isLoadingEthnicity, setIsLoadingEthnicity] = useState(false);
  const [isLoadingLanguage, setIsLoadingLanguage] = useState(false);

  const selectedLanguageKeys = useMemo(
    () => new Set(selectedLanguages.map((item) => item.trim().toLowerCase())),
    [selectedLanguages],
  );

  useEffect(() => {
    const query = ethnicityInput.trim();
    if (query.length < 3) {
      setEthnicitySuggestions([]);
      setIsLoadingEthnicity(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsLoadingEthnicity(true);
      api.culture.suggest({ q: query, type: 'ethnicity', limit: 8 })
        .then((result) => setEthnicitySuggestions(result.suggestions))
        .catch(() => setEthnicitySuggestions(localSuggest(FALLBACK_ETHNICITIES, query)))
        .finally(() => setIsLoadingEthnicity(false));
    }, 220);

    return () => clearTimeout(timer);
  }, [ethnicityInput]);

  useEffect(() => {
    const query = languageInput.trim();
    if (query.length < 3) {
      setLanguageSuggestions([]);
      setIsLoadingLanguage(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsLoadingLanguage(true);
      api.culture.suggest({ q: query, type: 'language', limit: 8 })
        .then((result) => {
          setLanguageSuggestions(
            result.suggestions.filter((item) => !selectedLanguageKeys.has(item.toLowerCase())),
          );
        })
        .catch(() => {
          setLanguageSuggestions(
            localSuggest(FALLBACK_LANGUAGES, query).filter((item) => !selectedLanguageKeys.has(item.toLowerCase())),
          );
        })
        .finally(() => setIsLoadingLanguage(false));
    }, 220);

    return () => clearTimeout(timer);
  }, [languageInput, selectedLanguageKeys]);

  const addLanguage = useCallback((language: string) => {
    const normalized = language.trim();
    if (!normalized) return;
    if (normalized.length < 2) {
      Alert.alert('Language too short', 'Please enter at least 2 characters for a language.');
      return;
    }
    if (selectedLanguageKeys.has(normalized.toLowerCase())) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedLanguages((prev) => [...prev, normalized]);
    setLanguageInput('');
    setLanguageSuggestions([]);
  }, [selectedLanguageKeys]);

  const removeLanguage = useCallback((language: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedLanguages((prev) => prev.filter((item) => item !== language));
  }, []);

  const handleContinue = useCallback(() => {
    const pendingLanguage = languageInput.trim();
    const nextLanguages = dedupeList([
      ...selectedLanguages,
      ...(pendingLanguage.length >= 2 ? [pendingLanguage] : []),
    ]);

    if (pendingLanguage.length > 0 && pendingLanguage.length < 2) {
      Alert.alert('Language too short', 'Please enter at least 2 characters for a language.');
      return;
    }

    setEthnicityText(ethnicityInput.trim());
    setLanguages(nextLanguages);
    router.push('/(onboarding)/interests');
  }, [ethnicityInput, languageInput, selectedLanguages, setEthnicityText, setLanguages]);

  return (
    <View style={s.container}>
      <LinearGradient
        colors={gradients.culturepassBrandReversed}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.gradientBg}
      />

      {/* Decorative Orbs */}
      {Platform.OS === 'web' ? (
        <>
          <View style={[s.orb, { top: -100, right: -50, backgroundColor: CultureTokens.indigo, opacity: 0.5, filter: 'blur(50px)' } as any]} />
          <View style={[s.orb, { bottom: -50, left: -50, backgroundColor: CultureTokens.saffron, opacity: 0.3, filter: 'blur(50px)' } as any]} />
        </>
      ) : null}

      {isDesktop && (
        <View style={s.desktopBackRow}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(onboarding)/communities')} hitSlop={8} style={[s.desktopBackBtn, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
            <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
            <Text style={s.desktopBackText}>Back</Text>
          </Pressable>
        </View>
      )}

      {!isDesktop && (
        <View style={[s.mobileHeader, { paddingTop: topInset + 12 }]}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(onboarding)/communities'))} hitSlop={12}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </Pressable>
          <Text style={s.stepText}>3 of 4</Text>
        </View>
      )}

      <KeyboardAvoidingView 
        style={s.keyboardAvoid} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      >
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          keyboardShouldPersistTaps="handled" 
          contentContainerStyle={[
            s.scrollContent,
            isDesktop && s.scrollContentDesktop,
            !isDesktop && { paddingTop: 20 }
          ]}
        >
          <View style={[s.formContainer, isDesktop && s.formContainerDesktop]}>
            {Platform.OS === 'ios' || Platform.OS === 'web' ? (
              <BlurView intensity={isDesktop ? 60 : 40} tint="dark" style={[StyleSheet.absoluteFill, s.formBlur]} />
            ) : (
              <View style={[StyleSheet.absoluteFill, s.formBlur, { backgroundColor: 'rgba(11, 11, 20, 0.85)' }]} />
            )}

            <View style={s.formContent}>
              <View style={s.headerBlock}>
                <View style={[s.iconWrapper, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                  <Ionicons name="body-outline" size={28} color="#FFFFFF" />
                </View>
                <Text style={s.title}>Culture Match</Text>
                <Text style={s.subtitle}>
                  Add your ethnicity and languages so we can personalize communities and events better.
                </Text>
              </View>

              <View style={s.block}>
                <Text style={s.label}>Ethnicity</Text>
                <TextInput
                  value={ethnicityInput}
                  onChangeText={setEthnicityInput}
                  placeholder="Type your ethnicity"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  style={s.input}
                  autoCapitalize="words"
                />
                <Text style={s.helper}>Suggestions appear after 3 letters.</Text>
                {isLoadingEthnicity ? (
                  <ActivityIndicator size="small" color={CultureTokens.saffron} style={s.loader} />
                ) : (
                  ethnicitySuggestions.length > 0 && (
                    <View style={s.suggestionWrap}>
                      {ethnicitySuggestions.map((item) => (
                        <Pressable
                          key={`eth-${item}`}
                          style={({pressed}) => [s.suggestionChip, pressed && { opacity: 0.7 }]}
                          onPress={() => setEthnicityInput(item)}
                        >
                          <Text style={s.suggestionText}>{item}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )
                )}
              </View>

              <View style={s.block}>
                <Text style={s.label}>Languages</Text>

                {selectedLanguages.length > 0 && (
                  <View style={s.selectedWrap}>
                    {selectedLanguages.map((language) => (
                      <Pressable
                        key={`sel-${language}`}
                        style={({pressed}) => [s.selectedChip, pressed && { opacity: 0.8 }]}
                        onPress={() => removeLanguage(language)}
                      >
                        <Text style={s.selectedText}>{language}</Text>
                        <Ionicons name="close" size={16} color="#FFFFFF" />
                      </Pressable>
                    ))}
                  </View>
                )}

                <View style={s.inputRow}>
                  <TextInput
                    value={languageInput}
                    onChangeText={(value) => {
                      setLanguageInput(value);
                      if (value.trim().length < 3) setLanguageSuggestions([]);
                    }}
                    placeholder="Type a language"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    style={[s.input, s.inputFlex]}
                    autoCapitalize="words"
                  />
                  <Pressable
                    style={({pressed}) => [s.addBtn, (!languageInput.trim() || pressed) && { opacity: 0.7 }]}
                    onPress={() => addLanguage(languageInput)}
                    disabled={!languageInput.trim()}
                  >
                    <Ionicons name="add" size={24} color="#1B0F2E" />
                  </Pressable>
                </View>
                <Text style={s.helper}>Multi-select supported.</Text>

                {isLoadingLanguage ? (
                  <ActivityIndicator size="small" color={CultureTokens.saffron} style={s.loader} />
                ) : (
                  languageSuggestions.length > 0 && (
                    <View style={s.suggestionWrap}>
                      {languageSuggestions.map((item) => (
                        <Pressable
                          key={`lang-${item}`}
                          style={({pressed}) => [s.suggestionChip, pressed && { opacity: 0.7 }]}
                          onPress={() => addLanguage(item)}
                        >
                          <Text style={s.suggestionText}>{item}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )
                )}
              </View>

              <View style={s.spacer} />

              <Button
                variant="primary"
                size="lg"
                fullWidth
                rightIcon="arrow-forward"
                onPress={handleContinue}
                style={[s.submitBtn, { backgroundColor: CultureTokens.saffron }]}
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

const s = StyleSheet.create({
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
  
  block: { marginBottom: 24, padding: 20, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.02)' },
  label: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', marginBottom: 12, color: '#FFFFFF' },
  input: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontFamily: 'Poppins_400Regular', color: '#FFFFFF', backgroundColor: 'rgba(0,0,0,0.2)' },
  inputFlex: { flex: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addBtn: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: CultureTokens.saffron },
  helper: { fontSize: 13, fontFamily: 'Poppins_400Regular', marginTop: 10, color: 'rgba(255,255,255,0.5)' },
  loader: { marginTop: 10 },
  
  selectedWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  selectedChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: CultureTokens.saffron, backgroundColor: 'rgba(255, 140, 66, 0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  selectedText: { fontSize: 14, fontFamily: 'Poppins_500Medium', color: '#FFFFFF' },
  
  suggestionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  suggestionChip: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  suggestionText: { fontSize: 14, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.9)' },
  
  spacer: { height: 24 },
  submitBtn: { height: 56, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 6 },
});
