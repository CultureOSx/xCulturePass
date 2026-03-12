import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CultureTokens } from '@/constants/theme';

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
  const topInset = Platform.OS === 'web' ? 0 : insets.top;

  return (
    <View style={[s.container, { paddingTop: topInset }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={s.title}>Community Guidelines</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40, paddingTop: 10 }}>
        <Text style={s.lead}> 
          These rules help keep CulturePass safe, welcoming, and useful for everyone.
        </Text>

        {RULES.map((rule, idx) => (
          <View key={rule.title} style={s.card}>
            <Text style={s.cardTitle}>{idx + 1}. {rule.title}</Text>
            <Text style={s.cardBody}>{rule.body}</Text>
          </View>
        ))}

        <View style={s.footerCard}>
          <Ionicons name="shield-checkmark" size={20} color={CultureTokens.indigo} />
          <Text style={s.footerText}>
            By using CulturePass, you agree to follow these guidelines together with our Terms and Privacy Policy.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#0B0B14' },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn:    { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  title:      { fontSize: 18, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  lead:       { fontSize: 14, fontFamily: 'Poppins_400Regular', lineHeight: 22, marginBottom: 20, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  card:       { borderWidth: 1, borderRadius: 16, padding: 18, marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' },
  cardTitle:  { fontSize: 16, fontFamily: 'Poppins_700Bold', marginBottom: 6, color: '#FFFFFF' },
  cardBody:   { fontSize: 14, fontFamily: 'Poppins_400Regular', lineHeight: 22, color: 'rgba(255,255,255,0.6)' },
  footerCard: { marginTop: 12, borderRadius: 16, padding: 16, flexDirection: 'row', gap: 12, backgroundColor: CultureTokens.indigo + '15', borderWidth: 1, borderColor: CultureTokens.indigo + '30' },
  footerText: { flex: 1, fontSize: 14, fontFamily: 'Poppins_500Medium', lineHeight: 20, color: 'rgba(255,255,255,0.8)' },
});
