import { useColors } from '@/hooks/useColors';
import { View, Text, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getStyles } from '../styles';
import { CP } from '../constants';

export function LoadingSkeleton({ topInset }: { topInset: number }) {
  const colors = useColors();
  const styles = getStyles(colors);
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[CP.dark, '#1a0533', '#0a2a2a']}
        style={[styles.hero, { paddingTop: topInset + 8, justifyContent: 'center', alignItems: 'center', minHeight: 340 }]}
      >
        <ActivityIndicator size="large" color={CP.teal} />
        <Text style={{ color: CP.muted, marginTop: 12, fontFamily: 'Poppins_400Regular', fontSize: 13 }}>
          Loading profile…
        </Text>
      </LinearGradient>
    </View>
  );
}
