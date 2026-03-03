/**
 * Input — CulturePassAU design system component.
 *
 * Usage:
 *   <Input
 *     label="Email"
 *     placeholder="Enter your email"
 *     leftIcon="mail-outline"
 *     value={email}
 *     onChangeText={setEmail}
 *     keyboardType="email-address"
 *   />
 *   <Input label="Password" secureTextEntry leftIcon="lock-closed-outline" />
 *   <Input variant="search" placeholder="Search events..." />
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { InputTokens, Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';

export type InputVariant = 'default' | 'search' | 'ghost';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  /** Shortcut: adds an eye icon that toggles secureTextEntry */
  passwordToggle?: boolean;
  variant?: InputVariant;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<object>;
}

function resolveOutlineIcon(iconName: keyof typeof Ionicons.glyphMap): keyof typeof Ionicons.glyphMap {
  if (iconName.startsWith('logo-') || iconName.endsWith('-outline')) {
    return iconName;
  }

  const outlineName = `${iconName}-outline` as keyof typeof Ionicons.glyphMap;
  return outlineName in Ionicons.glyphMap ? outlineName : iconName;
}

export function Input({
  label,
  hint,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  passwordToggle = false,
  variant = 'default',
  containerStyle,
  inputStyle,
  secureTextEntry,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const colors = useColors();
  const [showPassword, setShowPassword] = useState(false);
  const focused = useSharedValue(0);

  const borderColor = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focused.value,
      [0, 1],
      [error ? colors.error : colors.border, error ? colors.error : colors.primary],
    ),
  }));

  const handleFocus: TextInputProps['onFocus'] = (e) => {
    focused.value = withTiming(1, { duration: 180 });
    onFocus?.(e);
  };

  const handleBlur: TextInputProps['onBlur'] = (e) => {
    focused.value = withTiming(0, { duration: 180 });
    onBlur?.(e);
  };

  const isSecure = passwordToggle ? !showPassword : secureTextEntry;
  const effectiveRightIcon = passwordToggle
    ? (showPassword ? 'eye-off-outline' : 'eye-outline')
    : rightIcon;
  const effectiveRightPress = passwordToggle
    ? () => setShowPassword((v) => !v)
    : onRightIconPress;
  const resolvedLeftIcon = leftIcon ? resolveOutlineIcon(leftIcon) : undefined;
  const resolvedRightIcon = effectiveRightIcon ? resolveOutlineIcon(effectiveRightIcon) : undefined;

  const isSearch = variant === 'search';
  const height = isSearch ? InputTokens.heightSearch : InputTokens.height;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: error ? colors.error : colors.text }]}>
          {label}
        </Text>
      )}

      <Animated.View
        style={[
          styles.inputRow,
          {
            height,
            backgroundColor: variant === 'ghost' ? 'transparent' : colors.surfaceElevated,
            borderWidth: variant === 'ghost' ? 0 : 1,
            borderRadius: isSearch ? InputTokens.radius + 4 : InputTokens.radius,
          },
          borderColor,
        ]}
      >
        {resolvedLeftIcon && (
          <Ionicons
            name={resolvedLeftIcon}
            size={InputTokens.iconSize}
            color={colors.textTertiary}
            style={styles.leftIcon}
          />
        )}

        <TextInput
          {...rest}
          secureTextEntry={isSecure}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={colors.textTertiary}
          style={[
            styles.input,
            {
              color: colors.text,
              fontFamily: 'Poppins_400Regular',
              fontSize: InputTokens.fontSize,
              paddingLeft: resolvedLeftIcon ? 0 : InputTokens.paddingH,
              paddingRight: resolvedRightIcon ? 0 : InputTokens.paddingH,
            },
            inputStyle,
          ]}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={label}
        />

        {resolvedRightIcon && (
          <Pressable
            onPress={effectiveRightPress}
            hitSlop={8}
            style={styles.rightIcon}
            accessibilityRole="button"
            accessibilityLabel={passwordToggle ? (showPassword ? "Hide password" : "Show password") : undefined}
          >
            <Ionicons
              name={resolvedRightIcon}
              size={InputTokens.iconSize}
              color={colors.textSecondary}
            />
          </Pressable>
        )}
      </Animated.View>

      {(error || hint) && (
        <Text
          style={[
            styles.hint,
            { color: error ? colors.error : colors.textTertiary },
          ]}
        >
          {error || hint}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.xs,
  },
  label: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    letterSpacing: 0.1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: Radius.md,
  },
  leftIcon: {
    marginLeft: InputTokens.paddingH,
    marginRight: InputTokens.iconGap,
  },
  rightIcon: {
    paddingHorizontal: InputTokens.paddingH,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  input: {
    flex: 1,
    height: '100%',
    padding: 0,
  },
  hint: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    marginTop: Spacing.xs,
  },
});
