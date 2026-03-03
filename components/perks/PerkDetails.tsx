import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { Perk } from './types';
import { CATEGORY_LABELS } from './constants';

interface PerkDetailsProps {
  perk: Perk;
  typeInfo: { icon: string; color: string; label: string; gradient: string };
}

export function PerkDetails({ perk, typeInfo }: PerkDetailsProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Details</Text>
      <View style={styles.detailsGrid}>
        <View style={styles.detailItem}>
          <View style={[styles.detailIcon, { backgroundColor: typeInfo.color + '15' }]}>
            <Ionicons name="albums" size={18} color={typeInfo.color} />
          </View>
          <Text style={styles.detailLabel}>Category</Text>
          <Text style={styles.detailValue}>{CATEGORY_LABELS[perk.category || ''] || perk.category || 'General'}</Text>
        </View>
        <View style={styles.detailItem}>
          <View style={[styles.detailIcon, { backgroundColor: typeInfo.color + '15' }]}>
            <Ionicons name="business" size={18} color={typeInfo.color} />
          </View>
          <Text style={styles.detailLabel}>Provider</Text>
          <Text style={styles.detailValue}>{perk.providerType === 'platform' ? 'CulturePass' : perk.providerType === 'business' ? 'Business' : 'Partner'}</Text>
        </View>
        {perk.perUserLimit && (
          <View style={styles.detailItem}>
            <View style={[styles.detailIcon, { backgroundColor: '#FF9F0A15' }]}>
              <Ionicons name="person" size={18} color="#FF9F0A" />
            </View>
            <Text style={styles.detailLabel}>Limit</Text>
            <Text style={styles.detailValue}>{perk.perUserLimit}/user</Text>
          </View>
        )}
        <View style={styles.detailItem}>
          <View style={[styles.detailIcon, { backgroundColor: perk.status === 'active' ? '#34C75915' : '#FF3B3015' }]}>
            <Ionicons name={perk.status === 'active' ? 'checkmark-circle' : 'close-circle'} size={18} color={perk.status === 'active' ? '#34C759' : '#FF3B30'} />
          </View>
          <Text style={styles.detailLabel}>Status</Text>
          <Text style={styles.detailValue}>{perk.status === 'active' ? 'Active' : 'Inactive'}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: 20, paddingVertical: 16 },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Poppins_700Bold',
    color: Colors.text,
    marginBottom: 10,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailItem: {
    width: '47%' as any,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.text,
    marginTop: 2,
  },
});
