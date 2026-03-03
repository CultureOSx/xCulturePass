/**
 * Checkbox — Simple checkbox component
 *
 * Usage:
 *   <Checkbox checked={agreed} onToggle={setAgreed} label="I agree to terms" />
 */

import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

export interface CheckboxProps {
  checked: boolean;
  onToggle: (checked: boolean) => void;
  label?: string | React.ReactNode;
  color?: string;
}

export function Checkbox({ checked, onToggle, label, color = Colors.primary }: CheckboxProps) {
  return (
    <Pressable style={styles.row} onPress={() => onToggle(!checked)}>
      <View
        style={[
          styles.box,
          checked && { backgroundColor: color, borderColor: color },
        ]}
      >
        {checked && <Ionicons name="checkmark" size={14} color="#FFF" />}
      </View>
      {label && <Text style={styles.label}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  box: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255,255,255,0.85)',
  },
});
