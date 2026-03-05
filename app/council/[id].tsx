import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { View, Text, ScrollView, ActivityIndicator, Pressable, Linking } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Button } from '@/components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function CouncilDetailScreen() {
  const { id } = useLocalSearchParams();
  const colors = useColors();
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/council/detail', id],
    queryFn: () => api.council.get(id as string),
    enabled: !!id,
  });
  const council = data;

  if (isLoading) return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 64 }} />;
  if (error || !council) return <Text style={{ color: colors.error, marginTop: 64 }}>Council not found.</Text>;

  return (
    <ErrorBoundary>
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 32, gap: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="business" size={32} color={colors.primary} />
          <Text style={{ fontSize: 28, fontWeight: '700', color: colors.primary }}>{council.name}</Text>
          <View style={{ marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: council.verificationStatus === 'verified' ? colors.accent : colors.border }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: council.verificationStatus === 'verified' ? colors.surface : colors.textSecondary }}>{council.verificationStatus === 'verified' ? 'Verified' : 'Unverified'}</Text>
          </View>
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: 16 }}>{council.state} · {council.suburb} · {council.country}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 16 }}>{council.description}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {council.websiteUrl ? (
            <Pressable onPress={() => Linking.openURL(council.websiteUrl || '')}>
              <Text style={{ color: colors.accent, textDecorationLine: 'underline', fontSize: 15 }}>🌐 Website</Text>
            </Pressable>
          ) : null}
          {council.email ? (
            <Pressable onPress={() => Linking.openURL(`mailto:${council.email}`)}>
              <Text style={{ color: colors.primary, textDecorationLine: 'underline', fontSize: 15 }}>✉️ Email</Text>
            </Pressable>
          ) : null}
          {council.phone ? (
            <Pressable onPress={() => Linking.openURL(`tel:${council.phone}`)}>
              <Text style={{ color: colors.primary, textDecorationLine: 'underline', fontSize: 15 }}>📞 {council.phone}</Text>
            </Pressable>
          ) : null}
          <Text style={{ color: colors.textSecondary, fontSize: 15 }}>LGA: {council.lgaCode}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 15 }}>Postcode: {council.postcode}</Text>
        </View>
        <CouncilDetailActions council={council} />
      </ScrollView>
    </ErrorBoundary>
  );
}

function CouncilDetailActions({ council }: { council: any }) {
  // Claim/follow logic placeholder
  return (
    <View style={{ marginTop: 24 }}>
      <Button onPress={() => alert('Followed!')}>Follow Council</Button>
      <Button onPress={() => alert('Claim request sent!')} style={{ marginTop: 12 }}>Claim Council</Button>
    </View>
  );
}
