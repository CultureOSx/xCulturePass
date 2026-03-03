import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

const RULES = [
  {
    title: 'Be respectful and inclusive',
    body: 'Treat all members with dignity. Harassment, hate speech, or discriminatory behaviour is not allowed.',
  },
  {
    title: 'Share authentic and lawful content',
    body: 'Only upload content you own or are authorised to share. Avoid misinformation, spam, and illegal content.',
  },
  {
    title: 'Protect privacy',
    body: 'Do not publish private personal information without consent. Respect community and event participant privacy.',
  },
  {
    title: 'Event and ticket integrity',
    body: 'Do not create misleading event listings or misuse tickets/perks. Fraudulent activity may result in account suspension.',
  },
  {
    title: 'Report issues responsibly',
    body: 'Use reporting/support channels for abusive content or suspicious activity. Repeated false reports are not allowed.',
  },
];

export default function CommunityGuidelinesScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const colors = useColors();

  return (
    <View style={[s.container, { paddingTop: topInset, backgroundColor: colors.background }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={[s.backBtn, { backgroundColor: colors.backgroundSecondary }]} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[s.title, { color: colors.text }]}>Community Guidelines</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
        <Text style={[s.lead, { color: colors.text }]}> 
          These rules help keep CulturePass safe, welcoming, and useful for everyone.
        </Text>

        {RULES.map((rule, idx) => (
          <View key={rule.title} style={[s.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={[s.cardTitle, { color: colors.text }]}>{idx + 1}. {rule.title}</Text>
            <Text style={[s.cardBody, { color: colors.text }]}>{rule.body}</Text>
          </View>
        ))}

        <View style={[s.footerCard, { backgroundColor: colors.primary + '12' }]}>
          <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
          <Text style={[s.footerText, { color: colors.text }]}>
            By using CulturePass, you agree to follow these guidelines together with our Terms and Privacy Policy.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1 },
  header:     { height: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn:    { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title:      { fontSize: 18, fontFamily: 'Poppins_700Bold' },
  lead:       { fontSize: 14, lineHeight: 21, marginBottom: 12 },
  card:       { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  cardTitle:  { fontSize: 15, fontFamily: 'Poppins_700Bold', marginBottom: 6 },
  cardBody:   { fontSize: 14, lineHeight: 20 },
  footerCard: { marginTop: 8, borderRadius: 12, padding: 12, flexDirection: 'row', gap: 8 },
  footerText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
