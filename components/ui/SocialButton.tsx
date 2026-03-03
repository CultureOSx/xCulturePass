/**
 * SocialButton — Standardized social auth button for Google/Apple
 *
 * Usage:
 *   <SocialButton provider="google" onPress={handleGoogleSignIn} />
 *   <SocialButton provider="apple" disabled />
 */

import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Button, type ButtonProps } from './Button';

export interface SocialButtonProps extends Omit<ButtonProps, 'children' | 'variant' | 'leftIcon'> {
  provider: 'google' | 'apple';
  comingSoon?: boolean;
}

const PROVIDER_CONFIG = {
  google: { icon: 'logo-google' as const, label: 'Google', color: '#DB4437' },
  apple: { icon: 'logo-apple' as const, label: 'Apple', color: '#000000' },
} as const;

export function SocialButton({
  provider,
  comingSoon = false,
  disabled,
  ...rest
}: SocialButtonProps) {
  const config = PROVIDER_CONFIG[provider];
  const isDisabled = disabled || comingSoon;

  return (
    <Button
      {...rest}
      variant="outline"
      size="lg"
      disabled={isDisabled}
      style={[styles.button, isDisabled && styles.disabled]}
      leftIcon={config.icon}
      labelStyle={styles.label}
    >
      {comingSoon ? (
        <Text style={styles.wrap}>
          {config.label}
          <Text style={styles.soon}> (coming soon)</Text>
        </Text>
      ) : (
        config.label
      )}
    </Button>
  );
}

const styles = StyleSheet.create({
  button: { flex: 1 },
  disabled: { opacity: 0.5 },
  label: { color: '#1A1A1A' },
  wrap: { fontFamily: 'Poppins_600SemiBold' },
  soon: { fontSize: 10, fontFamily: 'Poppins_400Regular', color: '#888' },
});
