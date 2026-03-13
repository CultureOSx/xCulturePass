import { useColors } from '@/hooks/useColors';
import { memo } from 'react';
import { View } from 'react-native';
import { CP } from '../constants';

export const BrandDots = memo(({ size = 22, opacity = 0.22 }: { size?: number; opacity?: number }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.4 }} pointerEvents="none">
    {[CP.teal, CP.purple, CP.ember, CP.gold, CP.info].map((c, i) => (
      <View
        key={i}
        style={{
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: c,
          opacity,
        }}
      />
    ))}
  </View>
));
BrandDots.displayName = 'BrandDots';
