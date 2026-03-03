import React from 'react';
import { View, Pressable, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ProfileSocialsProps {
  activeSocials: { key: string; icon: string }[];
  socialLinks: Record<string, string | undefined>;
  entityColor: string;
}

export function ProfileSocials({ activeSocials, socialLinks, entityColor }: ProfileSocialsProps) {
  if (activeSocials.length === 0) return null;

  return (
    <View style={styles.socialRow}>
      {activeSocials.map(s => (
        <Pressable
          key={s.key}
          style={[styles.socialIcon, { backgroundColor: entityColor + '15' }]}
          onPress={() => {
            const url = socialLinks[s.key];
            if (url) Linking.openURL(url);
          }}
        >
          <Ionicons name={s.icon as any} size={22} color={entityColor} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  socialRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 16,
    marginBottom: 4,
  },
  socialIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
