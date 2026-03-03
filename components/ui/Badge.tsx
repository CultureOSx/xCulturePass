/**
 * Badge — small status/category label pill.
 *
 * Variants: default | success | warning | error | info | gold | primary
 *
 * Usage:
 *   <Badge variant="success">Free</Badge>
 *   <Badge variant="gold" icon="star">VIP</Badge>
 */

import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChipTokens, Radius } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'gold' | 'primary';

interface BadgeProps {
  variant?: BadgeVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

function resolveOutlineIcon(iconName: keyof typeof Ionicons.glyphMap): keyof typeof Ionicons.glyphMap {
  if (iconName.startsWith('logo-') || iconName.endsWith('-outline')) {
    return iconName;
  }

  const outlineName = `${iconName}-outline` as keyof typeof Ionicons.glyphMap;
  return outlineName in Ionicons.glyphMap ? outlineName : iconName;
}

export function Badge({ variant = 'default', icon, size = 'md', style, children }: BadgeProps) {
  const colors = useColors();

  const variantMap: Record<BadgeVariant, { bg: string; text: string }> = {
    default:  { bg: colors.surfaceSecondary, text: colors.textSecondary },
    primary:  { bg: colors.primaryGlow,      text: colors.primary },
    success:  { bg: colors.success + '26',  text: colors.success },
    warning:  { bg: colors.warning + '26', text: colors.warning },
    error:    { bg: colors.error + '26',  text: colors.error },
    info:     { bg: colors.info + '26', text: colors.info },
    gold:     { bg: colors.gold + '2E',  text: colors.gold },
  };

  const vc = variantMap[variant];
  const isSm = size === 'sm';

  const resolvedIcon = icon ? resolveOutlineIcon(icon) : undefined;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: vc.bg,
          paddingHorizontal: isSm ? ChipTokens.paddingH - 4 : ChipTokens.paddingH,
          paddingVertical: isSm ? 4 : 6,
          borderRadius: Radius.full,
        },
        style,
      ]}
    >
      {resolvedIcon && (
        <Ionicons
          name={resolvedIcon}
          size={isSm ? 10 : 12}
          color={vc.text}
          style={{ marginRight: ChipTokens.gap / 2 }}
        />
      )}
      <Text
        style={[
          styles.label,
          {
            color: vc.text,
            fontSize: isSm ? 10 : 11,
            fontFamily: 'Poppins_600SemiBold',
          },
        ]}
        numberOfLines={1}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  label: {
    letterSpacing: 0.1,
  },
});
