import { memo } from 'react';
import { useColors } from '@/hooks/useColors';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getStyles } from '../styles';
import { CP } from '../constants';

export const DetailRow = memo(({
  icon, iconBg, iconColor, label, value, valueColor, onPress, showArrow,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string; iconColor: string;
  label: string; value: string;
  valueColor?: string; onPress?: () => void; showArrow?: boolean;
}) => {
  const colors = useColors();
  const styles = getStyles(colors);
  const content = (
    <>
      <View style={[styles.detailIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.detailText}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
      </View>
      {showArrow && <Ionicons name="open-outline" size={16} color={CP.muted} />}
    </>
  );
  if (onPress) {
    return <Pressable style={styles.detailRow} onPress={onPress}>{content}</Pressable>;
  }
  return <View style={styles.detailRow}>{content}</View>;
});
DetailRow.displayName = 'DetailRow';
