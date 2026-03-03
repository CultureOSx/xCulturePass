import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { Perk } from './types';

interface PerkAboutProps {
  perk: Perk;
}

export function PerkAbout({ perk }: PerkAboutProps) {
  return (
    <>
      <View style={styles.section}>
        <Text style={styles.title}>{perk.title}</Text>
        <View style={styles.providerRow}>
          <Ionicons name="business-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.providerText}>{perk.providerName || 'CulturePass'}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About this perk</Text>
        <Text style={styles.description}>{perk.description || 'No description available.'}</Text>
      </View>

      <View style={styles.divider} />
    </>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: 20, paddingVertical: 16 },
  title: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  providerText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Poppins_700Bold',
    color: Colors.text,
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: Colors.textSecondary,
    lineHeight: 23,
  },
});
