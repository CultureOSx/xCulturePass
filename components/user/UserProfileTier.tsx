import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { CP } from './profileUtils';

type Props = {
  tierConf: {
    color: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  };
  memberSince: string;
};

export default function UserProfileTier({ tierConf, memberSince }: Props) {
  return (
    <View style={styles.tierRow}>
      <LinearGradient
        colors={[tierConf.color + '25', tierConf.color + '08']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={[styles.tierBadge, { borderColor: tierConf.color + '45' }]}
      >
        <Ionicons name={tierConf.icon} size={15} color={tierConf.color} />
        <Text style={[styles.tierText, { color: tierConf.color }]}>{tierConf.label} Member</Text>
      </LinearGradient>
      {memberSince ? (
        <View style={styles.memberSince}>
          <Ionicons name="calendar-outline" size={14} color={CP.muted} />
          <Text style={styles.memberSinceText}>Since {memberSince}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tierRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 20, paddingTop: 22, paddingBottom: 4, gap: 12,
  },
  tierBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 50, borderWidth: 1.5,
  },
  tierText:        { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
  memberSince:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  memberSinceText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: Colors.textTertiary },
});
