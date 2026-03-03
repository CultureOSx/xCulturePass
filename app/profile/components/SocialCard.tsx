import { memo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';
import { CP } from '../constants';

export const SocialCard = memo(({ icon, label, color, accentColor, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  accentColor: string;
  onPress: () => void;
}) => {
  return (
    <Pressable
      style={({ pressed }) => [styles.socialCard, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
      onPress={onPress}
    >
      <View style={[styles.socialStrip, { backgroundColor: accentColor }]} />
      <View style={[styles.socialIconWrap, { backgroundColor: color + '14' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.socialLabel}>{label}</Text>
      <Ionicons name="open-outline" size={14} color={CP.muted} />
    </Pressable>
  );
});
SocialCard.displayName = 'SocialCard';
