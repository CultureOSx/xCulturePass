import { ReactNode } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

interface TabSectionShellProps {
  children: ReactNode;
  maxWidth?: number;
  horizontalPadding?: number;
  style?: StyleProp<ViewStyle>;
}

export default function TabSectionShell({
  children,
  maxWidth,
  horizontalPadding = 0,
  style,
}: TabSectionShellProps) {
  return (
    <View
      style={[
        styles.base,
        {
          maxWidth,
          paddingHorizontal: horizontalPadding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    alignSelf: 'center',
  },
});