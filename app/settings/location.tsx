import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { LayoutRules, Spacing } from '@/constants/theme';
import { LocationPicker } from '@/components/LocationPicker';

export default function SettingsLocationScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  
  const { state } = useOnboarding();
  const webTop = 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTop, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight }]} onPress={() => (router.canGoBack() ? router.back() : router.replace('/settings'))}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Location & City</Text>
        <View style={{ width: LayoutRules.buttonHeight }} />
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}> 
        <Text style={[styles.label, { color: colors.text }]}>Current location</Text>
        <Text style={[styles.current, { color: colors.textSecondary }]}>
          {state.city ? `${state.city}, ${state.country || 'Australia'}` : 'No location selected'}
        </Text>

        <View style={styles.pickerWrap}>
          <LocationPicker />
        </View>

        <Text style={[styles.help, { color: colors.textSecondary }]}>Use location picker to update your city for local events and recommendations.</Text>
      </View>
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LayoutRules.screenHorizontalPadding,
    paddingVertical: LayoutRules.iconTextGap,
  },
  backBtn: {
    width: LayoutRules.buttonHeight,
    height: LayoutRules.buttonHeight,
    borderRadius: LayoutRules.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
  },
  card: {
    marginHorizontal: LayoutRules.screenHorizontalPadding,
    marginTop: Spacing.sm,
    borderRadius: LayoutRules.borderRadius,
    borderWidth: 1,
    padding: LayoutRules.cardPaddingMax,
    gap: LayoutRules.iconTextGap,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
  current: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
  },
  pickerWrap: {
    marginTop: Spacing.sm,
  },
  help: {
    marginTop: Spacing.sm,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
  },
});
