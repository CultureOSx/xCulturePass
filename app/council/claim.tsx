import { useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '@/constants/theme';

export default function CouncilClaimScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ councilId?: string }>();
  const [workEmail, setWorkEmail] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [note, setNote] = useState('');

  const selectedQuery = useQuery({
    queryKey: ['/api/council/selected'],
    queryFn: () => api.council.getSelected(),
    enabled: !params.councilId,
  });

  const councilId = useMemo(() => {
    if (typeof params.councilId === 'string' && params.councilId.length > 0) return params.councilId;
    return selectedQuery.data?.council?.id;
  }, [params.councilId, selectedQuery.data?.council?.id]);

  const councilQuery = useQuery({
    queryKey: ['/api/council', councilId],
    queryFn: () => api.council.get(councilId!),
    enabled: Boolean(councilId),
  });

  const claimMutation = useMutation({
    mutationFn: async () => {
      if (!councilId) throw new Error('Choose a council first');
      return api.council.claim(councilId, {
        workEmail: workEmail.trim(),
        roleTitle: roleTitle.trim(),
        note: note.trim() || undefined,
      });
    },
    onSuccess: () => {
      Alert.alert('Claim submitted', 'Your claim is pending super admin review.');
      router.replace('/(tabs)/council');
    },
    onError: (error: Error) => {
      Alert.alert('Claim failed', error.message || 'Unable to submit claim right now.');
    },
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === 'web' ? 10 : insets.top + 8 }]}>
      <View style={styles.header}>
        <Button variant="ghost" size="sm" onPress={() => router.back()}>Back</Button>
        <Text style={[styles.title, { color: colors.text }]}>Claim council page</Text>
        <View style={{ width: 56 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient
          colors={gradients.culturepassBrand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={[styles.heroTitle, { color: colors.textInverse }]}>Claim your council page</Text>
          <Text style={[styles.heroSub, { color: colors.textInverse }]}>Submit your official work details. Admin review is required before management access is granted.</Text>
        </LinearGradient>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}> 
          <Text style={[styles.label, { color: colors.textSecondary }]}>Council</Text>
          <Text style={[styles.value, { color: colors.text }]}>
            {councilQuery.data?.name ?? 'No council selected'}
          </Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>Your work email domain must exactly match this council’s official website domain.</Text>
        </View>

        <Field
          label="Official work email"
          value={workEmail}
          onChangeText={setWorkEmail}
          placeholder="you@council.gov.au"
          colors={colors}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Field
          label="Role title"
          value={roleTitle}
          onChangeText={setRoleTitle}
          placeholder="Community Partnerships Officer"
          colors={colors}
        />

        <Field
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="Any context for reviewer"
          colors={colors}
          multiline
        />

        <Button
          onPress={() => claimMutation.mutate()}
          loading={claimMutation.isPending}
          disabled={!councilId || !workEmail.trim() || !roleTitle.trim()}
        >
          Submit claim
        </Button>

        {!councilId ? (
          <Button variant="secondary" onPress={() => router.push('/council/select')}>
            Choose council first
          </Button>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  colors,
  autoCapitalize,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  colors: ReturnType<typeof useColors>;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address';
  multiline?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: colors.borderLight,
            minHeight: multiline ? 96 : 48,
            textAlignVertical: multiline ? 'top' : 'center',
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  title: { fontSize: 18, fontFamily: 'Poppins_700Bold' },
  content: { paddingHorizontal: 16, paddingBottom: 120, gap: 12 },
  hero: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 4 },
  heroTitle: { fontSize: 15, fontFamily: 'Poppins_700Bold' },
  heroSub: { fontSize: 12, fontFamily: 'Poppins_400Regular' },
  card: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 6 },
  label: { fontSize: 12, fontFamily: 'Poppins_500Medium' },
  value: { fontSize: 15, fontFamily: 'Poppins_700Bold' },
  hint: { fontSize: 12, fontFamily: 'Poppins_400Regular' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Poppins_500Medium' },
});
