import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

export interface MenuItemProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  color?: string;
  showDivider?: boolean;
  badge?: number;
  colors: ReturnType<typeof useColors>;
}

export function MenuItem({ icon, label, value, onPress, color, showDivider = true, badge, colors }: MenuItemProps) {
  const c = color ?? colors.primary;
  return (
    <>
      <Pressable
        style={({ pressed }) => [s.menuItem, { opacity: pressed ? 0.7 : 1 }]}
        onPress={onPress}
      >
        <View style={[s.menuIcon, { backgroundColor: c + '15' }]}>
          <Ionicons name={icon as never} size={18} color={c} />
        </View>
        <Text style={[s.menuLabel, { color: colors.text }]}>{label}</Text>
        {badge != null && badge > 0 && (
          <View style={[s.badge, { backgroundColor: colors.error }]}>
            <Text style={[s.badgeText, { color: colors.textInverse }]}>{badge}</Text>
          </View>
        )}
        {value ? <Text style={[s.menuValue, { color: colors.textSecondary }]}>{value}</Text> : null}
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </Pressable>
      {showDivider && <View style={[s.divider, { backgroundColor: colors.divider }]} />}
    </>
  );
}

const s = StyleSheet.create({
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 14, minHeight: 52 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel:{ flex: 1, fontSize: 15, fontFamily: 'Poppins_500Medium' },
  menuValue:{ fontSize: 14, fontFamily: 'Poppins_400Regular', marginRight: 4 },
  badge:    { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, marginRight: 4 },
  badgeText:{ fontSize: 11, fontFamily: 'Poppins_700Bold' },
  divider:  { height: StyleSheet.hairlineWidth, marginLeft: 66 },
});
