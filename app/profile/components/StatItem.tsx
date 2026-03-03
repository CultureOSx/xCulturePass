import { memo } from 'react';
import { View, Text } from 'react-native';
import { styles } from '../styles';
import { formatNumber } from '../constants';

export const StatItem = memo(({ value, label }: { value: number; label: string }) => (
  <View style={styles.statItem}>
    <Text style={styles.statNum}>{formatNumber(value)}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
));
StatItem.displayName = 'StatItem';
