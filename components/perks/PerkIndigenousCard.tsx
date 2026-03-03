import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';

interface PerkIndigenousCardProps {
  isIndigenous: boolean;
}

export function PerkIndigenousCard({ isIndigenous }: PerkIndigenousCardProps) {
  const colors = useColors();
  if (!isIndigenous) return null;

  return (
    <>
      <View style={styles.divider} />
      <View style={styles.section}>
        <View style={[styles.indigenousCard, { backgroundColor: colors.warning + '12', borderLeftColor: colors.warning }]}>
          <View style={styles.indigenousHeader}>
            <View style={[styles.indigenousIconBg, { backgroundColor: colors.warning + '26' }]}>
              <Ionicons name="earth" size={18} color={colors.warning} />
            </View>
            <Text style={[styles.indigenousTitle, { color: colors.text }]}>Supporting First Nations</Text>
          </View>
          <Text style={[styles.indigenousBody, { color: colors.textSecondary }]}>
            This perk supports Aboriginal and Torres Strait Islander businesses and communities. By redeeming this perk, you are helping to grow Indigenous enterprise and cultural visibility.
          </Text>
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
  indigenousCard: {
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
  },
  indigenousHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  indigenousIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indigenousTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
  },
  indigenousBody: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 20,
  },
});
