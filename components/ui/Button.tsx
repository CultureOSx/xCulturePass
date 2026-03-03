/**
 * Button — CulturePassAU design system component.
 *
 * Variants: primary | secondary | ghost | danger | gold | outline | gradient
 * Sizes:    sm | md | lg
 * Shape:    default (rounded) | pill
 *
 * Usage:
 *   <Button onPress={handleSubmit} loading={isLoading}>Buy Ticket</Button>
 *   <Button variant="gradient" size="lg" fullWidth>Get Started</Button>
 *   <Button variant="ghost" size="sm" leftIcon="bookmark-outline" pill>Save</Button>
 */

import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ButtonTokens, Duration, SpringConfig } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold' | 'outline' | 'gradient';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
  /** Pill / capsule shape — overrides default border radius */
  pill?: boolean;
  /** Custom gradient colors — only used when variant="gradient" */
  gradientColors?: [string, string, ...string[]];
  /** Enable subtle haptic feedback on press (iOS/Android) */
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function resolveOutlineIcon(iconName: keyof typeof Ionicons.glyphMap): keyof typeof Ionicons.glyphMap {
  if (iconName.startsWith('logo-') || iconName.endsWith('-outline')) {
    return iconName;
  }

  const outlineName = `${iconName}-outline` as keyof typeof Ionicons.glyphMap;
  return outlineName in Ionicons.glyphMap ? outlineName : iconName;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  pill = false,
  gradientColors,
  haptic = true,
  disabled,
  style,
  labelStyle,
  children,
  onPress,
  ...rest
}: ButtonProps) {
  const colors = useColors();

  const height = ButtonTokens.height[size];
  const paddingH = ButtonTokens.paddingH[size];
  const fontSize = ButtonTokens.fontSize[size];
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 20 : 18;
  const radius = pill ? ButtonTokens.radiusPill : ButtonTokens.radius;

  const isDisabled = disabled || loading;

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, SpringConfig.snappy);
    opacity.value = withTiming(0.9, { duration: Duration.instant });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, SpringConfig.smooth);
    opacity.value = withTiming(1, { duration: Duration.instant });
  };

  const handlePress: PressableProps['onPress'] = (event) => {
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
    onPress?.(event);
  };

  const variantColors = {
    primary:   { bg: colors.primary,     border: 'transparent', label: colors.textInverse },
    secondary: { bg: colors.primaryGlow, border: colors.primary, label: colors.primary },
    ghost:     { bg: 'transparent',      border: 'transparent', label: colors.primary },
    danger:    { bg: colors.error,       border: 'transparent', label: colors.textInverse },
    gold:      { bg: colors.gold,        border: 'transparent', label: colors.textInverse },
    outline:   { bg: 'transparent',      border: colors.border,  label: colors.text },
    gradient:  { bg: 'transparent',      border: 'transparent', label: colors.textInverse },
  } as const;

  const vc = variantColors[variant];

  const defaultGradient: [string, string] = [colors.primary, colors.secondary];
  const finalGradient = gradientColors ?? defaultGradient;
  const resolvedLeftIcon = leftIcon ? resolveOutlineIcon(leftIcon) : undefined;
  const resolvedRightIcon = rightIcon ? resolveOutlineIcon(rightIcon) : undefined;

  const content = loading ? (
    <ActivityIndicator color={vc.label} size={iconSize} />
  ) : (
    <View style={styles.row}>
      {resolvedLeftIcon && (
        <Ionicons
          name={resolvedLeftIcon}
          size={iconSize}
          color={vc.label}
          style={{ marginRight: ButtonTokens.iconGap }}
        />
      )}
      <Text
        style={[
          styles.label,
          { color: vc.label, fontSize, fontFamily: 'Poppins_600SemiBold' },
          labelStyle,
        ]}
        numberOfLines={1}
      >
        {children}
      </Text>
      {resolvedRightIcon && (
        <Ionicons
          name={resolvedRightIcon}
          size={iconSize}
          color={vc.label}
          style={{ marginLeft: ButtonTokens.iconGap }}
        />
      )}
    </View>
  );

  if (variant === 'gradient') {
    return (
      <AnimatedPressable
        {...rest}
        onPress={handlePress}
        disabled={isDisabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          animatedStyle,
          { alignSelf: fullWidth ? 'stretch' : 'auto', opacity: isDisabled ? 0.5 : 1 },
          style as ViewStyle,
        ]}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
      >
        <LinearGradient
          colors={finalGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.base,
            { height, paddingHorizontal: paddingH, borderRadius: radius },
          ]}
        >
          {content}
        </LinearGradient>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      {...rest}
      onPress={handlePress}
      disabled={isDisabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        animatedStyle,
        styles.base,
        {
          height,
          paddingHorizontal: paddingH,
          backgroundColor: vc.bg,
          borderColor: vc.border,
          borderWidth: variant === 'secondary' ? 1.5 : variant === 'outline' ? 1 : 0,
          borderRadius: radius,
          opacity: isDisabled ? 0.5 : 1,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        style as ViewStyle,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {content}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    letterSpacing: 0.1,
  },
});
