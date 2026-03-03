import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CP } from './profileUtils';

type SocialIcon = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
};

type Props = {
  activeSocials: SocialIcon[];
  socialLinks: Record<string, string | undefined>;
};

export default function UserProfileSocial({ activeSocials, socialLinks }: Props) {
  if (activeSocials.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionAccent} />
        <Text style={styles.sectionTitle}>Social</Text>
      </View>
      <View style={styles.socialGrid}>
        {activeSocials.map((s) => (
          <Pressable
            key={s.key}
            style={styles.socialCard}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const url = socialLinks[s.key];
              if (url) Linking.openURL(url);
            }}
          >
            <View style={[styles.socialStrip, { backgroundColor: s.color }]} />
            <View style={[styles.socialIconWrap, { backgroundColor: s.color + '14' }]}>
              <Ionicons name={s.icon} size={22} color={s.color} />
            </View>
            <Text style={styles.socialLabel}>{s.label}</Text>
            <Ionicons name="open-outline" size={14} color={CP.muted} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section:       { paddingHorizontal: 20, marginTop: 32 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionAccent: { width: 4, height: 22, borderRadius: 2, backgroundColor: CP.teal },
  sectionTitle:  { fontFamily: 'Poppins_700Bold', fontSize: 18, color: CP.text, letterSpacing: -0.3 },

  socialGrid: { gap: 10 },
  socialCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: CP.surface, borderRadius: 16, padding: 16,
    overflow: 'hidden',
    shadowColor: CP.dark,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  socialStrip: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 3.5, borderRadius: 2,
  },
  socialIconWrap: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  socialLabel: { flex: 1, fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: CP.text },
});
