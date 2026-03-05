import { ReactNode } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

interface TabScreenShellProps {
  children: ReactNode;
  contentMaxWidth?: number;
  horizontalPadding?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  showsVerticalScrollIndicator?: boolean;
}

export default function TabScreenShell({
  children,
  contentMaxWidth,
  horizontalPadding = 0,
  contentContainerStyle,
  refreshControl,
  showsVerticalScrollIndicator = false,
}: TabScreenShellProps) {
  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        refreshControl={refreshControl}
        contentContainerStyle={[
          styles.content,
          {
            maxWidth: contentMaxWidth,
            paddingHorizontal: horizontalPadding,
          },
          contentContainerStyle,
        ]}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    width: '100%',
    alignSelf: 'center',
  },
});