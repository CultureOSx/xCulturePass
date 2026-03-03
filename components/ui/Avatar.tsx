/**
 * Avatar — CulturePassAU design system component.
 *
 * Usage:
 *   <Avatar uri={user.avatarUrl} name="Alice Chen" size="lg" />
 *   <Avatar name="CulturePass" size="md" gradientSeed="culture" badge="plus" />
 */

import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AvatarTokens } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';

export type AvatarSize = keyof typeof AvatarTokens.size;
export type AvatarBadge = 'online' | 'plus' | 'elite' | 'verified' | 'none';

/** Deterministic gradient from a string seed */
function seedGradient(seed: string): [string, string] {
  const PALETTES: [string, string][] = [
    ['#0081C8', '#EE334E'],
    ['#EE334E', '#FCB131'],
    ['#00A651', '#0081C8'],
    ['#FCB131', '#00A651'],
    ['#9B59B6', '#0081C8'],
    ['#0081C8', '#00A651'],
    ['#EE334E', '#9B59B6'],
    ['#FCB131', '#EE334E'],
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTES[Math.abs(hash) % PALETTES.length];
}

export interface AvatarProps {
  /** Remote image URI */
  uri?: string | null;
  /** Display name — used for initials fallback */
  name?: string;
  size?: AvatarSize;
  /** Gradient seed — defaults to name */
  gradientSeed?: string;
  /** Status / tier badge */
  badge?: AvatarBadge;
  style?: StyleProp<ViewStyle>;
}

export function Avatar({
  uri,
  name = '',
  size = 'md',
  gradientSeed,
  badge = 'none',
  style,
}: AvatarProps) {
  const colors = useColors();
  const dim = AvatarTokens.size[size];
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase() || '?';

  const fontSize =
    size === 'xs' ? 10 :
    size === 'sm' ? 12 :
    size === 'md' ? 14 :
    size === 'lg' ? 20 :
    size === 'xl' ? 26 : 32;

  const badgeSize = Math.max(12, Math.round(dim * 0.28));
  const badgeOffset = Math.round(badgeSize * -0.1);

  const [grad0, grad1] = seedGradient(gradientSeed ?? name ?? 'cp');

  const badgeContent = () => {
    if (badge === 'online')   return <View style={[badgeStyles.dot, { backgroundColor: colors.success, width: badgeSize, height: badgeSize, borderRadius: badgeSize }]} />;
    if (badge === 'plus')     return <View style={[badgeStyles.dot, { backgroundColor: colors.primary,  width: badgeSize, height: badgeSize, borderRadius: badgeSize }]}><Text style={[badgeStyles.plus, { fontSize: badgeSize * 0.55 }]}>+</Text></View>;
    if (badge === 'elite')    return <View style={[badgeStyles.dot, { backgroundColor: colors.gold,     width: badgeSize, height: badgeSize, borderRadius: badgeSize }]}><Ionicons name="star" size={badgeSize * 0.55} color="#fff" /></View>;
    if (badge === 'verified') return <View style={[badgeStyles.dot, { backgroundColor: colors.info,    width: badgeSize, height: badgeSize, borderRadius: badgeSize }]}><Ionicons name="checkmark" size={badgeSize * 0.6} color="#fff" /></View>;
    return null;
  };

  return (
    <View style={[{ width: dim, height: dim, position: 'relative' }, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: dim, height: dim, borderRadius: AvatarTokens.radius }}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <LinearGradient
          colors={[grad0, grad1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: dim, height: dim, borderRadius: AvatarTokens.radius, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontFamily: 'Poppins_700Bold', fontSize, color: '#fff', letterSpacing: 0.5 }}>
            {initials}
          </Text>
        </LinearGradient>
      )}

      {badge !== 'none' && (
        <View style={[badgeStyles.wrapper, { bottom: badgeOffset, right: badgeOffset, borderColor: colors.background }]}>
          {badgeContent()}
        </View>
      )}
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  dot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: {
    color: '#fff',
    fontFamily: 'Poppins_700Bold',
    lineHeight: undefined,
    includeFontPadding: false,
  },
});
