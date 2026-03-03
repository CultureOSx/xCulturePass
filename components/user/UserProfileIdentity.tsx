import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { User } from '@shared/schema';
import { CP } from './profileUtils';

type Props = {
  user: User;
  displayName: string;
  memberSince: string;
  tierConf: {
    color: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  };
};

export default function UserProfileIdentity({
  user,
  displayName,
  memberSince,
  tierConf,
}: Props) {
  if (!user.culturePassId) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionAccent} />
        <Text style={styles.sectionTitle}>Digital Identity</Text>
      </View>

      <LinearGradient
        colors={[CP.dark, '#1a0533', CP.darkMid]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.cpidCard}
      >
        <LinearGradient
          colors={['transparent', CP.teal, CP.purple, CP.teal, 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.cpidAccentEdge}
        />

        <View style={styles.cpidTop}>
          <View style={styles.cpidLogoRow}>
            <LinearGradient colors={[CP.teal, CP.purple]} style={styles.cpidLogoIcon}>
              <Ionicons name="globe" size={13} color="#FFF" />
            </LinearGradient>
            <Text style={styles.cpidLogoText}>CulturePass</Text>
          </View>
          <View style={styles.cpidVerifiedIcon}>
            <Ionicons name="shield-checkmark" size={15} color={CP.teal} />
          </View>
        </View>

        <View style={styles.cpidCenter}>
          <Text style={styles.cpidLabel}>CULTUREPASS ID</Text>
          <Text style={styles.cpidValue}>{user.culturePassId}</Text>
          <LinearGradient
            colors={['transparent', CP.teal, 'transparent']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.cpidUnderline}
          />
        </View>

        <View style={styles.cpidMeta}>
          <View style={styles.cpidMetaItem}>
            <Text style={styles.cpidMetaLabel}>Name</Text>
            <Text style={styles.cpidMetaValue}>{displayName}</Text>
          </View>
          <View style={styles.cpidMetaItem}>
            <Text style={styles.cpidMetaLabel}>Since</Text>
            <Text style={styles.cpidMetaValue}>{memberSince || 'N/A'}</Text>
          </View>
          <View style={[styles.cpidMetaItem, { alignItems: 'flex-end' as const }]}>
            <Text style={styles.cpidMetaLabel}>Tier</Text>
            <Text style={[styles.cpidMetaValue, { color: CP.teal }]}>{tierConf.label}</Text>
          </View>
        </View>

        <View style={styles.cpidFooter}>
          <Text style={styles.cpidFooterText}>Verified Digital Identity</Text>
          <Ionicons name="finger-print" size={20} color={CP.teal + '55'} />
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  section:       { paddingHorizontal: 20, marginTop: 32 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionAccent: { width: 4, height: 22, borderRadius: 2, backgroundColor: CP.teal },
  sectionTitle:  { fontFamily: 'Poppins_700Bold', fontSize: 18, color: CP.text, letterSpacing: -0.3 },

  cpidCard: {
    borderRadius: 24, padding: 24, overflow: 'hidden',
    shadowColor: CP.purple,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.35, shadowRadius: 28, elevation: 14,
  },
  cpidAccentEdge: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 2.5,
  },
  cpidTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 26,
  },
  cpidLogoRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cpidLogoIcon: {
    width: 26, height: 26, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  cpidLogoText:    { fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#FFF', letterSpacing: 0.4 },
  cpidVerifiedIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: CP.teal + '40',
    alignItems: 'center', justifyContent: 'center',
  },

  cpidCenter:    { alignItems: 'center', marginBottom: 26 },
  cpidLabel:     { fontFamily: 'Poppins_500Medium', fontSize: 9, color: CP.muted, letterSpacing: 4, marginBottom: 8 },
  cpidValue:     { fontFamily: 'Poppins_700Bold', fontSize: 30, color: '#FFF', letterSpacing: 5 },
  cpidUnderline: { width: 160, height: 1.5, marginTop: 10, opacity: 0.65 },

  cpidMeta:      { flexDirection: 'row', marginBottom: 20, gap: 8 },
  cpidMetaItem:  { flex: 1 },
  cpidMetaLabel: {
    fontFamily: 'Poppins_400Regular', fontSize: 9, color: CP.muted,
    textTransform: 'uppercase' as const, letterSpacing: 1.2, marginBottom: 4,
  },
  cpidMetaValue: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#FFF' },

  cpidFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 14,
  },
  cpidFooterText: {
    fontFamily: 'Poppins_500Medium', fontSize: 11, color: CP.muted, letterSpacing: 0.3,
  },
});
