/**
 * PasswordStrengthIndicator — Visual password strength feedback
 *
 * Usage:
 *   <PasswordStrengthIndicator password={password} />
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';

export interface PasswordStrengthIndicatorProps {
  password: string;
  showLabel?: boolean;
}

function getStrength(password: string): { level: 'weak' | 'medium' | 'strong'; width: number; color: string } {
  if (password.length < 6) {
    return { level: 'weak', width: 33, color: Colors.error };
  }
  if (password.length < 10) {
    return { level: 'medium', width: 66, color: '#FFA500' };
  }
  return { level: 'strong', width: 100, color: Colors.success };
}

export function PasswordStrengthIndicator({
  password,
  showLabel = true,
}: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const strength = getStrength(password);
  const strengthText = { weak: 'Weak', medium: 'Medium', strong: 'Strong' }[strength.level];

  return (
    <View style={styles.container}>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${strength.width}%`, backgroundColor: strength.color }]} />
      </View>
      {showLabel && <Text style={[styles.label, { color: strength.color }]}>{strengthText}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barBg: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  label: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', minWidth: 50 },
});
