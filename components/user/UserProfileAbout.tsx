import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import type { User } from '@shared/schema';
import { CP } from './profileUtils';

type Props = {
  user: User;
};

export default function UserProfileAbout({ user }: Props) {
  if (!user.bio) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionAccent} />
        <Text style={styles.sectionTitle}>About</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.bioText}>{user.bio}</Text>
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
  bioText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15, color: Colors.textSecondary, lineHeight: 26,
  },
});
