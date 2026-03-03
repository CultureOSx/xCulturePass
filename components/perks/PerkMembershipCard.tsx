import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { Perk } from './types';

interface PerkMembershipCardProps {
  perk: Perk;
}

export function PerkMembershipCard({ perk }: PerkMembershipCardProps) {
  const colors = useColors();
  if (!perk.isMembershipRequired) return null;

  return (
    <>
      <View style={styles.divider} />
      <View style={styles.section}>
        <View style={[styles.membershipCard, { backgroundColor: colors.info + '12', borderLeftColor: colors.info }]}>
          <View style={[styles.membershipIcon, { backgroundColor: colors.info + '24' }]}>
            <Ionicons name="star" size={20} color={colors.info} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.membershipTitle, { color: colors.info }]}>CulturePass+ Exclusive</Text>
            <Text style={[styles.membershipSub, { color: colors.info }]}>This perk requires an active CulturePass+ membership to redeem.</Text>
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
  membershipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
  },
  membershipIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  membershipTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
  },
  membershipSub: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
  },
});
