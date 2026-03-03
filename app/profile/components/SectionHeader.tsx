import { memo } from 'react';
import { View, Text } from 'react-native';
import { styles } from '../styles';

export const SectionHeader = memo(({ title }: { title: string }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionAccent} />
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
));
SectionHeader.displayName = 'SectionHeader';
