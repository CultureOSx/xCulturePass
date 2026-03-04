import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { EventData } from '@shared/schema';
import WebEventRailCard from './WebEventRailCard';

interface WebRailSectionProps {
  title: string;
  subtitle?: string;
  events: EventData[];
  onSeeAll?: () => void;
}

export default function WebRailSection({
  title,
  subtitle,
  events,
  onSeeAll,
}: WebRailSectionProps) {
  if (events.length === 0) return null;
  return (
    <View style={styles.webSection}>
      <View style={styles.webSectionHeader}>
        <View style={styles.webSectionTitleRow}>
          <View>
            <Text style={styles.webSectionTitle}>{title}</Text>
            {subtitle ? <Text style={styles.webSectionSub}>{subtitle}</Text> : null}
          </View>
        </View>
        {onSeeAll ? (
          <Pressable onPress={onSeeAll} style={styles.webSeeAllBtn}>
            <Text style={styles.webSeeAllText}>See all</Text>
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.7)" />
          </Pressable>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.webRailScroll}>
        {events.map((event) => (
          <WebEventRailCard key={event.id} event={event} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  webSection: {
    gap: 16,
  },
  webSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 4,
  },
  webSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  webSectionTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  webSectionSub: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#94A2C4',
  },
  webSeeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  webSeeAllText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: 'rgba(255,255,255,0.7)',
  },
  webRailScroll: {
    gap: 14,
    paddingBottom: 2,
  },
});
