import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { Perk } from './types';

interface PerkAvailabilityProps {
  perk: Perk;
  typeInfo: { icon: string; color: string; label: string; gradient: string };
  remaining: number | null;
  usagePercent: number;
}

export function PerkAvailability({ perk, typeInfo, remaining, usagePercent }: PerkAvailabilityProps) {
  if (!perk.usageLimit) return null;

  return (
    <>
      <View style={styles.divider} />
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Availability</Text>
        <View style={styles.availabilityCard}>
          <View style={styles.availRow}>
            <Text style={styles.availLabel}>{remaining} of {perk.usageLimit} remaining</Text>
            <Text style={[styles.availPercent, { color: usagePercent > 80 ? Colors.error : typeInfo.color }]}>{usagePercent}% claimed</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min(usagePercent, 100)}%` as any, backgroundColor: usagePercent > 80 ? Colors.error : typeInfo.color }]} />
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 20,
  },
  section: { paddingHorizontal: 20, paddingVertical: 16 },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Poppins_700Bold',
    color: Colors.text,
    marginBottom: 10,
  },
  availabilityCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
  },
  availRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  availLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: Colors.text,
  },
  availPercent: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});
