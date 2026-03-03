import { View, Text, Pressable, StyleSheet, ScrollView, Platform, TextInput, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useColors } from '@/hooks/useColors';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import * as Haptics from 'expo-haptics';

const FALLBACK_ETHNICITIES = [
  'Malay',
  'Malaysian Chinese',
  'Malayali',
  'Indian',
  'Chinese',
  'Filipino',
  'Vietnamese',
  'Arab',
  'Pakistani',
  'Sri Lankan',
  'Bangladeshi',
  'Nepali',
  'Korean',
  'Japanese',
  'African',
  'Caribbean',
  'Pacific Islander',
  'Latin American',
  'European',
  'Aboriginal and Torres Strait Islander',
];

const FALLBACK_LANGUAGES = [
  'English',
  'Mandarin',
  'Cantonese',
  'Hindi',
  'Urdu',
  'Punjabi',
  'Tamil',
  'Telugu',
  'Malayalam',
  'Malay',
  'Indonesian',
  'Vietnamese',
  'Arabic',
  'Korean',
  'Japanese',
  'Spanish',
  'French',
  'Portuguese',
  'Tagalog',
  'Greek',
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
  const topInset = Platform.OS === 'web' ? 0 : insets.top;
  const colors = useColors();
  const { state, setEthnicityText, setLanguages } = useOnboarding();

  const [ethnicityInput, setEthnicityInputInput] = useState(state.ethnicityText);
  const [languageInput, setLanguageInput] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(state.languages);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedLanguages((prev) => [...prev, normalized]);
    setLanguageInput('');
    setLanguageSuggestions([]);
  }, [selectedLanguageKeys]);

  const removeLanguage = useCallback((language: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    <View style={[s.container, { paddingTop: topInset, backgroundColor: colors.background }]}> 
      <View style={s.header}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(onboarding)/communities'))} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[s.step, { color: colors.textSecondary }]}>3 of 4</Text>
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={[s.title, { color: colors.text }]}>Culture Match</Text>
        <Text style={[s.subtitle, { color: colors.textSecondary }]}>Add your ethnicity and languages so we can personalize communities and events better.</Text>

        <View style={[s.block, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}> 
          <Text style={[s.label, { color: colors.text }]}>Ethnicity</Text>
          <TextInput
            value={ethnicityInput}
            onChangeText={setEthnicityInputInput}
            placeholder="Type your ethnicity"
            placeholderTextColor={colors.textSecondary}
            style={[s.input, { color: colors.text, borderColor: colors.borderLight, backgroundColor: colors.backgroundSecondary }]}
            autoCapitalize="words"
          />
          <Text style={[s.helper, { color: colors.textSecondary }]}>Suggestions appear after 3 letters.</Text>
          {isLoadingEthnicity ? (
            <ActivityIndicator size="small" color={colors.primary} style={s.loader} />
          ) : (
            ethnicitySuggestions.length > 0 && (
              <View style={s.suggestionWrap}>
                {ethnicitySuggestions.map((item) => (
                  <Pressable
                    key={`eth-${item}`}
                    style={[s.suggestionChip, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}
                    onPress={() => setEthnicityInputInput(item)}
                  >
                    <Text style={[s.suggestionText, { color: colors.primary }]}>{item}</Text>
                  </Pressable>
                ))}
              </View>
            )
          )}
        </View>

        <View style={[s.block, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}> 
          <Text style={[s.label, { color: colors.text }]}>Languages</Text>

          {selectedLanguages.length > 0 && (
            <View style={s.selectedWrap}>
              {selectedLanguages.map((language) => (
                <Pressable
                  key={`sel-${language}`}
                  style={[s.selectedChip, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => removeLanguage(language)}
                >
                  <Text style={[s.selectedText, { color: colors.textInverse }]}>{language}</Text>
                  <Ionicons name="close" size={16} color={colors.textInverse} />
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
              placeholderTextColor={colors.textSecondary}
              style={[s.input, s.inputFlex, { color: colors.text, borderColor: colors.borderLight, backgroundColor: colors.backgroundSecondary }]}
              autoCapitalize="words"
            />
            <Pressable
              style={[s.addBtn, { backgroundColor: colors.primary }, !languageInput.trim() && { opacity: 0.4 }]}
              onPress={() => addLanguage(languageInput)}
              disabled={!languageInput.trim()}
            >
              <Ionicons name="add" size={18} color={colors.textInverse} />
            </Pressable>
          </View>
          <Text style={[s.helper, { color: colors.textSecondary }]}>Multi-select supported. Tap a selected chip to remove it.</Text>

          {isLoadingLanguage ? (
            <ActivityIndicator size="small" color={colors.primary} style={s.loader} />
          ) : (
            languageSuggestions.length > 0 && (
              <View style={s.suggestionWrap}>
                {languageSuggestions.map((item) => (
                  <Pressable
                    key={`lang-${item}`}
                    style={[s.suggestionChip, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}
                    onPress={() => addLanguage(item)}
                  >
                    <Text style={[s.suggestionText, { color: colors.primary }]}>{item}</Text>
                  </Pressable>
                ))}
              </View>
            )
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={[s.footer, { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 16, backgroundColor: colors.background }]}> 
        <Pressable
          style={[s.nextBtn, { backgroundColor: colors.primary }]}
          onPress={handleContinue}
          accessibilityRole="button"
          accessibilityLabel="Continue to interests"
        >
          <Text style={[s.nextBtnText, { color: colors.textInverse }]}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.textInverse} />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  step: { fontSize: 14, fontFamily: 'Poppins_500Medium' },
  content: { flex: 1, paddingHorizontal: 20 },
  title: { fontSize: 28, fontFamily: 'Poppins_700Bold', marginTop: 8 },
  subtitle: { fontSize: 15, fontFamily: 'Poppins_400Regular', marginTop: 8, lineHeight: 22, marginBottom: 18 },

  block: { borderWidth: 1.5, borderRadius: 16, padding: 14, marginBottom: 12 },
  label: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', marginBottom: 10 },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Poppins_500Medium' },
  inputFlex: { flex: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addBtn: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  helper: { fontSize: 12, fontFamily: 'Poppins_400Regular', marginTop: 8 },
  loader: { marginTop: 10 },

  selectedWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  selectedChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  selectedText: { fontSize: 13, fontFamily: 'Poppins_500Medium' },

  suggestionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  suggestionChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  suggestionText: { fontSize: 13, fontFamily: 'Poppins_500Medium' },

  footer: { paddingHorizontal: 20, paddingTop: 12 },
  nextBtn: { borderRadius: 16, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  nextBtnText: { fontSize: 17, fontFamily: 'Poppins_600SemiBold' },
});
