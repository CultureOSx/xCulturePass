import React from 'react';
import { useColors } from '@/hooks/useColors';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/theme';
import type { EventData } from '@/shared/schema';

interface ProfileEventsProps {
  upcomingEvents: EventData[];
  entityColor: string;
}

export function ProfileEvents({ upcomingEvents, entityColor }: ProfileEventsProps) {
  const colors = useColors();
  const styles = getStyles(colors);
  if (upcomingEvents.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Upcoming Events</Text>
        <Pressable onPress={() => router.push('/(tabs)/explore')}>
          <Text style={[styles.seeAllText, { color: entityColor }]}>See All</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        {upcomingEvents.map((ev) => (
          <Pressable
            key={ev.id}
            style={styles.eventCard}
            onPress={() => {
  const colors = useColors();
  const styles = getStyles(colors);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({ pathname: '/event/[id]', params: { id: ev.id } });
            }}
          >
            <View style={[styles.eventImagePlaceholder, { backgroundColor: ev.imageColor }]}>
              <Ionicons name="calendar" size={24} color={colors.textSecondary} />
              {ev.isFeatured && (
                <View style={styles.eventFeaturedBadge}>
                  <Ionicons name="star" size={10} color={Colors.accent} />
                </View>
              )}
            </View>
            <View style={styles.eventInfo}>
              <Text style={styles.eventTitle} numberOfLines={2}>{ev.title}</Text>
              <View style={styles.eventMetaRow}>
                <Ionicons name="calendar-outline" size={12} color={Colors.textSecondary} />
                <Text style={styles.eventMetaText}>{ev.date}</Text>
              </View>
              <View style={styles.eventMetaRow}>
                <Ionicons name="location-outline" size={12} color={Colors.textSecondary} />
                <Text style={styles.eventMetaText} numberOfLines={1}>{ev.venue}</Text>
              </View>
              <View style={styles.eventBottomRow}>
                <Text style={[styles.eventPrice, { color: ev.priceCents === 0 ? '#2ECC71' : entityColor }]}>
                  {ev.priceLabel}
                </Text>
                <View style={styles.eventAttendeesRow}>
                  <Ionicons name="people-outline" size={11} color={Colors.textTertiary} />
                  <Text style={styles.eventAttendeesText}>{ev.attending}</Text>
                </View>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: Colors.text,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  eventCard: {
    width: 200,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  eventImagePlaceholder: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventFeaturedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventInfo: {
    padding: 10,
    gap: 4,
  },
  eventTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.text,
    lineHeight: 18,
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventMetaText: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: Colors.textSecondary,
  },
  eventBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  eventPrice: {
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
  },
  eventAttendeesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  eventAttendeesText: {
    fontSize: 10,
    fontFamily: 'Poppins_400Regular',
    color: Colors.textTertiary,
  },
});
