/**
 * BackButton — Apple-style chevron back button.
 *
 * Uses SF Symbol `chevron.left` on iOS and Ionicons `chevron-back` on Android/Web.
 * Handles both `router.back()` and a fallback route if there's nothing to go back to.
 *
 * Usage:
 *   <BackButton />
 *   <BackButton fallback="/(tabs)" />
 *   <BackButton color="#fff" onPress={() => router.replace('/(tabs)')} />
 */
import React from 'react';
import { Pressable, Platform, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface BackButtonProps {
  /** Override the default router.back() behaviour */
  onPress?: () => void;
  /** Icon tint color — defaults to theme text color */
  color?: string;
  /** Icon size — defaults to 26 */
  size?: number;
  /** Route to navigate to if there's no history to go back to */
  fallback?: string;
  /** Additional container style */
  style?: StyleProp<ViewStyle>;
  /** Add a subtle circular background (useful on hero images) */
  circled?: boolean;
}

export function BackButton({
  onPress,
  color,
  size = 26,
  fallback = '/(tabs)',
  style,
  circled = false,
}: BackButtonProps) {
  const colors = useColors();
  const tint = color ?? colors.text;

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallback as never);
    }
  };

  const isIOS = Platform.OS === 'ios';

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={12}
      style={({ pressed }) => [
        styles.btn,
        circled && [
          styles.circled,
          { backgroundColor: colors.surface + 'CC' },
        ],
        pressed && styles.pressed,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      {isIOS ? (
        // SF Symbol chevron on iOS — matches native UIKit back button
        <Ionicons name="chevron-back" size={size} color={tint} />
      ) : (
        <Ionicons name="chevron-back" size={size} color={tint} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circled: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  pressed: {
    opacity: 0.6,
  },
});
