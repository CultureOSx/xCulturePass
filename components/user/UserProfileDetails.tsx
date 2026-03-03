import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { User } from '@shared/schema';
import { CP } from './profileUtils';

type Props = {
  user: User;
  locationText: string;
};

export default function UserProfileDetails({ user, locationText }: Props) {
  const hasDetails = !!(locationText || user.website || user.phone);

  if (!hasDetails) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionAccent} />
        <Text style={styles.sectionTitle}>Details</Text>
      </View>
      <View style={styles.card}>
        {locationText ? (
          <View style={styles.detailRow}>
            <View style={[styles.detailIconWrap, { backgroundColor: CP.purple + '14' }]}>
              <Ionicons name="location" size={18} color={CP.purple} />
            </View>
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>{locationText}</Text>
            </View>
          </View>
        ) : null}
        {user.website ? (
          <>
            {locationText && <View style={styles.detailDivider} />}
            <Pressable style={styles.detailRow} onPress={() => Linking.openURL(user.website!)}>
              <View style={[styles.detailIconWrap, { backgroundColor: CP.teal + '14' }]}>
                <Ionicons name="globe-outline" size={18} color={CP.teal} />
              </View>
              <View style={styles.detailText}>
                <Text style={styles.detailLabel}>Website</Text>
                <Text style={[styles.detailValue, { color: CP.teal }]}>{user.website}</Text>
              </View>
              <Ionicons name="open-outline" size={16} color={CP.muted} />
            </Pressable>
          </>
        ) : null}
        {user.phone ? (
          <>
            <View style={styles.detailDivider} />
            <View style={styles.detailRow}>
              <View style={[styles.detailIconWrap, { backgroundColor: CP.ember + '14' }]}>
                <Ionicons name="call-outline" size={18} color={CP.ember} />
              </View>
              <View style={styles.detailText}>
                <Text style={styles.detailLabel}>Phone</Text>
                <Text style={styles.detailValue}>{user.phone}</Text>
              </View>
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section:       { paddingHorizontal: 20, marginTop: 32 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionAccent: { width: 4, height: 22, borderRadius: 2, backgroundColor: CP.teal },
  sectionTitle:  { fontFamily: 'Poppins_700Bold', fontSize: 18, color: CP.text, letterSpacing: -0.3 },

  card: {
    backgroundColor: CP.surface,
    borderRadius: 20, padding: 20,
    shadowColor: CP.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },

  detailRow:      { flexDirection: 'row', alignItems: 'center', gap: 14 },
  detailIconWrap: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  detailText:     { flex: 1 },
  detailLabel:    { fontFamily: 'Poppins_400Regular', fontSize: 11, color: CP.muted, letterSpacing: 0.4, marginBottom: 2 },
  detailValue:    { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: CP.text },
  detailDivider:  { height: 1, backgroundColor: CP.bg, marginVertical: 16, marginLeft: 60 },
});
