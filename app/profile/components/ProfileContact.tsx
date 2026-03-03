import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import type { Profile } from '@/shared/schema';

interface ProfileContactProps {
  profile: Profile;
  hasCoordinates: boolean | null | undefined;
  entityColor: string;
}

export function ProfileContact({ profile, hasCoordinates, entityColor }: ProfileContactProps) {
  const hasContactInfo = profile.address || profile.phone || profile.email || profile.website;
  const hasAbout = profile.description || profile.bio;
  const hasOpeningHours = profile.openingHours;

  return (
    <>
      {hasAbout ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{profile.description || profile.bio}</Text>
        </View>
      ) : null}

      {hasContactInfo ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <View style={styles.contactCard}>
            {profile.address && (
              <Pressable style={styles.contactRow} onPress={() => {
                if (hasCoordinates) {
                  Linking.openURL(`https://www.google.com/maps?q=${profile.latitude},${profile.longitude}`);
                }
              }}>
                <Ionicons name="location-outline" size={18} color={Colors.textSecondary} />
                <Text style={styles.contactText}>{profile.address}</Text>
                {hasCoordinates && <Ionicons name="open-outline" size={14} color={Colors.textTertiary} />}
              </Pressable>
            )}
            {profile.address && (profile.phone || profile.email || profile.website) && <View style={styles.contactDivider} />}
            {profile.phone && (
              <Pressable style={styles.contactRow} onPress={() => Linking.openURL(`tel:${profile.phone}`)}>
                <Ionicons name="call-outline" size={18} color={Colors.textSecondary} />
                <Text style={styles.contactText}>{profile.phone}</Text>
                <Ionicons name="open-outline" size={14} color={Colors.textTertiary} />
              </Pressable>
            )}
            {profile.phone && (profile.email || profile.website) && <View style={styles.contactDivider} />}
            {profile.email && (
              <Pressable style={styles.contactRow} onPress={() => Linking.openURL(`mailto:${profile.email}`)}>
                <Ionicons name="mail-outline" size={18} color={Colors.textSecondary} />
                <Text style={styles.contactText}>{profile.email}</Text>
                <Ionicons name="open-outline" size={14} color={Colors.textTertiary} />
              </Pressable>
            )}
            {profile.email && profile.website && <View style={styles.contactDivider} />}
            {profile.website && (
              <Pressable style={styles.contactRow} onPress={() => Linking.openURL(profile.website!)}>
                <Ionicons name="globe-outline" size={18} color={Colors.textSecondary} />
                <Text style={styles.contactText} numberOfLines={1}>{profile.website}</Text>
                <Ionicons name="open-outline" size={14} color={Colors.textTertiary} />
              </Pressable>
            )}
          </View>
        </View>
      ) : null}

      {hasOpeningHours ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Opening Hours</Text>
          <View style={styles.hoursCard}>
            <Ionicons name="time-outline" size={20} color={entityColor} />
            <Text style={styles.hoursText}>{profile.openingHours}</Text>
          </View>
        </View>
      ) : null}
    </>
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
  description: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  contactCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  contactText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: Colors.text,
    flex: 1,
  },
  contactDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 44,
  },
  hoursCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  hoursText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: Colors.textSecondary,
    lineHeight: 22,
  },
});
