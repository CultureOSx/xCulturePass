import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import type { Profile } from '@/shared/schema';

interface ProfileMapProps {
  hasCoordinates: boolean | null | undefined;
  profile: Profile;
  entityColor: string;
  locationText: string;
}

export function ProfileMap({ hasCoordinates, profile, entityColor, locationText }: ProfileMapProps) {
  if (!hasCoordinates) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Location</Text>
      <Pressable
        style={styles.mapCard}
        onPress={() => Linking.openURL(`https://www.google.com/maps?q=${profile.latitude},${profile.longitude}`)}
      >
        <View style={[styles.mapIconWrap, { backgroundColor: entityColor + '15' }]}>
          <Ionicons name="map" size={28} color={entityColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.mapTitle}>View on Google Maps</Text>
          <Text style={styles.mapAddress} numberOfLines={2}>{locationText || profile.location || 'View location'}</Text>
        </View>
        <Ionicons name="navigate" size={20} color={entityColor} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
  mapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  mapIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.text,
    marginBottom: 2,
  },
  mapAddress: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
