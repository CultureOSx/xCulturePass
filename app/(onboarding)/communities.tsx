import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { communities, communityIcons } from '@/data/mockData';
import { useColors } from '@/hooks/useColors';
import { useState, useCallback } from 'react';
import * as Haptics from 'expo-haptics';

const CHIP_COLORS = [
  '#E85D3A', '#1A7A6D', '#F2A93B', '#3498DB', '#9B59B6',
  '#E74C3C', '#2ECC71', '#1ABC9C', '#8E44AD', '#F39C12',
  '#16A085', '#C0392B', '#2980B9', '#D35400', '#27AE60',
];

export default function CommunitiesScreen() {
  const insets      = useSafeAreaInsets();
  const topInset    = Platform.OS === 'web' ? 0 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;
  const colors      = useColors();
  const { state, setCommunities: setSelectedCommunities } = useOnboarding();
  const [selected, setSelected] = useState<string[]>(state.communities);

  const toggle = useCallback((community: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(prev =>
      prev.includes(community) ? prev.filter(c => c !== community) : [...prev, community]
    );
  }, []);

  const handleNext = useCallback(() => {
    if (selected.length === 0) {
      Alert.alert('Select at least one community', 'Choose one or more communities to continue.');
      return;
    }

    setSelectedCommunities(selected);
    router.push('/(onboarding)/culture-match');
  }, [selected, setSelectedCommunities]);

  return (
    <View style={[s.container, { paddingTop: topInset, backgroundColor: colors.background }]}>
      <View style={s.header}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(onboarding)/location'))} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[s.step, { color: colors.textSecondary }]}>2 of 4</Text>
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={[s.title, { color: colors.text }]}>Your Communities</Text>
        <Text style={[s.subtitle, { color: colors.textSecondary }]}>
          Select the communities you&apos;d like to connect with. You can always change these later.
        </Text>

        <View style={s.chipContainer}>
          {communities.map((community, idx) => {
            const isSelected = selected.includes(community);
            const color      = CHIP_COLORS[idx % CHIP_COLORS.length];
            const iconName   = (communityIcons[community] as string | undefined) ?? 'people';
            return (
              <Pressable
                key={community}
                style={[
                  s.chip,
                  { backgroundColor: colors.surface, borderColor: colors.borderLight },
                  isSelected && { backgroundColor: color, borderColor: color },
                ]}
                onPress={() => toggle(community)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Community: ${community}`}
              >
                <Ionicons name={iconName as never} size={18} color={isSelected ? colors.textInverse : color} />
                <Text style={[s.chipText, { color: isSelected ? colors.textInverse : colors.text }]}>{community}</Text>
                {isSelected && <Ionicons name="checkmark-circle" size={18} color={colors.textInverse} />}
              </Pressable>
            );
          })}
        </View>
        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={[s.footer, { paddingBottom: bottomInset + 16, backgroundColor: colors.background }]}>
        <Text style={[s.selectedCount, { color: colors.textSecondary }]}>
          {selected.length} {selected.length === 1 ? 'community' : 'communities'} selected
        </Text>
        <Pressable
          style={[s.nextBtn, { backgroundColor: colors.primary }, selected.length === 0 && { opacity: 0.4 }]}
          onPress={handleNext}
          disabled={selected.length === 0}
          accessibilityRole="button"
          accessibilityState={{ disabled: selected.length === 0 }}
          accessibilityLabel="Continue to culture match"
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
  chipContainer:{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip:         { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24, borderWidth: 1.5 },
  chipText:     { fontSize: 14, fontFamily: 'Poppins_500Medium' },
  footer:       { paddingHorizontal: 20, paddingTop: 12, gap: 8 },
  selectedCount:{ fontSize: 13, fontFamily: 'Poppins_500Medium', textAlign: 'center' },
  nextBtn:      { borderRadius: 16, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  nextBtnText:  { fontSize: 17, fontFamily: 'Poppins_600SemiBold' },
});
