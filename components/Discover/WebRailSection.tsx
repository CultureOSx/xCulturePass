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
          <LinearGradient
            colors={['#0081C8', '#EE334E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.webSectionAccentBar}
          />
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
  },
  webSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  webSectionAccentBar: {
    width: 3,
    height: 36,
    borderRadius: 2,
  },
  webSectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: 'Poppins_700Bold',
    color: '#EAEEFF',
    letterSpacing: -0.3,
  },
  webSectionSub: {
    marginTop: 3,
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: '#7A88AA',
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
