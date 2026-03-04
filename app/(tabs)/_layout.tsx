import React from 'react';
import {
  Platform,
  StyleSheet,
  View,
  Text,
  Pressable,
  useWindowDimensions,
  useColorScheme,
} from 'react-native';
import { Tabs, usePathname, router } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabBarTokens, gradients, CultureTokens } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { WebSidebar } from '@/components/web/WebSidebar';

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------
const TABS = [
  { name: 'index',        label: 'Discover',  icon: 'compass-outline',       iconActive: 'compass',        symbol: 'safari',        symbolActive: 'safari.fill'        },
  { name: 'calendar',    label: 'Calendar',   icon: 'calendar-outline',      iconActive: 'calendar',       symbol: 'calendar',      symbolActive: 'calendar.fill'      },
  { name: 'communities', label: 'Community',  icon: 'people-outline',        iconActive: 'people',         symbol: 'person.3',      symbolActive: 'person.3.fill'      },
  { name: 'perks',       label: 'Perks',      icon: 'gift-outline',          iconActive: 'gift',           symbol: 'gift',          symbolActive: 'gift.fill'          },
  { name: 'profile',     label: 'Profile',    icon: 'person-circle-outline', iconActive: 'person-circle',  symbol: 'person.circle', symbolActive: 'person.circle.fill' },
] as const;

const HIDDEN_TAB_ROUTES = ['council', 'explore', 'directory', 'dashboard'] as const;
const VISIBLE_TAB_ROUTES = TABS.map((tab) => tab.name);
const VALID_TAB_PATHS = new Set<string>([
  '/',
  ...VISIBLE_TAB_ROUTES.map((name) => `/${name === 'index' ? '' : name}`.replace(/\/$/, '') || '/'),
  ...HIDDEN_TAB_ROUTES.map((name) => `/${name}`),
]);

function CommunityUnityIcon({ focused, activeColor, color }: { focused: boolean; activeColor: string; color: string }) {
  const baseColor = focused ? activeColor : color;
  return (
    <View style={{ width: TabBarTokens.iconSize + 2, height: TabBarTokens.iconSize + 2, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons
        name={focused ? 'people-circle' : 'people-circle-outline'}
        size={TabBarTokens.iconSize + 1}
        color={baseColor}
      />
      <Ionicons
        name={focused ? 'heart' : 'heart-outline'}
        size={10}
        color={focused ? activeColor : color}
        style={{ position: 'absolute' }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Animated tab item — icon + label + active indicator
// ---------------------------------------------------------------------------
interface TabItemProps {
  tab: (typeof TABS)[number];
  focused: boolean;
  color: string;
  activeColor: string;
  onPress: () => void;
  flex: number;
  isDesktopMenu?: boolean;
}

function TabItem({ tab, focused, color, activeColor, onPress, flex, isDesktopMenu = false }: TabItemProps) {
  const scaleAnim = useSharedValue(focused ? 1 : 0.9);
  const opacityAnim = useSharedValue(focused ? 1 : 0.55);
  const indicatorAnim = useSharedValue(focused ? 1 : 0);

  React.useEffect(() => {
    scaleAnim.value = withSpring(focused ? 1 : 0.94, { damping: 18, stiffness: 320 });
    opacityAnim.value = withTiming(focused ? 1 : 0.72, { duration: 180 });
    indicatorAnim.value = withTiming(focused ? 1 : 0, { duration: 200 });
  }, [focused, scaleAnim, opacityAnim, indicatorAnim]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
    opacity: opacityAnim.value,
  }));

  const pillStyle = useAnimatedStyle(() => ({
    opacity: indicatorAnim.value,
    transform: [
      { scaleX: interpolate(indicatorAnim.value, [0, 1], [0.4, 1], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <Pressable
      style={[tabItemStyles.item, { flex }, isDesktopMenu && tabItemStyles.webItem]}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={tab.label}
    >
      {/* Active pill background */}
      {!isDesktopMenu && (
        <Animated.View style={[tabItemStyles.pill, pillStyle]}>
          <LinearGradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}

      {/* Icon — SF Symbols on iOS, Ionicons elsewhere */}
      {!isDesktopMenu && (
      <Animated.View style={iconStyle}>
        {tab.name === 'communities' ? (
          <CommunityUnityIcon focused={focused} activeColor={activeColor} color={color} />
        ) : Platform.OS === 'ios' ? (
          <SymbolView
            name={(focused ? tab.symbolActive : tab.symbol) as never}
            size={TabBarTokens.iconSize}
            tintColor={focused ? activeColor : color}
            type="hierarchical"
          />
        ) : (
          <Ionicons
            name={focused ? tab.iconActive : tab.icon}
            size={TabBarTokens.iconSize}
            color={focused ? activeColor : color}
          />
        )}
      </Animated.View>
      )}

      {/* Label */}
      <Text
        style={[
          tabItemStyles.label,
          {
            color: focused ? activeColor : color,
            fontFamily: focused ? 'Poppins_600SemiBold' : 'Poppins_500Medium',
            fontSize: isDesktopMenu ? 14 : TabBarTokens.labelSize,
          },
          isDesktopMenu && (focused ? tabItemStyles.webLabelActive : tabItemStyles.webLabel),
        ]}
        numberOfLines={1}
      >
        {tab.label}
      </Text>

      {isDesktopMenu && focused ? <View style={tabItemStyles.webUnderline} /> : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Custom floating tab bar
// ---------------------------------------------------------------------------
interface CustomTabBarProps {
  state: BottomTabBarProps['state'];
  navigation: BottomTabBarProps['navigation'];
}

function CustomTabBar({ state, navigation, position = 'bottom' }: CustomTabBarProps & { position?: 'top' | 'bottom' }) {
  const scheme = useColorScheme();
  const isDark = Platform.OS === 'web' ? false : scheme === 'dark';
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';
  const colors = useColors();
  const isDesktopMenu = position === 'top' && isWeb;

  if (!state || !Array.isArray(state.routes) || state.routes.length === 0) {
    return null;
  }

  const inactiveColor = isDesktopMenu ? colors.textSecondary : (isDark ? 'rgba(232,244,255,0.62)' : 'rgba(0,22,40,0.62)');
  const activeColor = isDesktopMenu ? colors.text : colors.textInverse;
  const bottomPad = Math.max(insets.bottom, isWeb ? 0 : 8);
  const topPad = Math.max(insets.top, isWeb ? 8 : 0);

  // Filter only the visible 5 tabs
  const visibleRoutes = TABS
    .map((tab) => state.routes.find((route) => route.name === tab.name))
    .filter((route): route is BottomTabBarProps['state']['routes'][number] => Boolean(route));

  return (
    <View
      style={[
        tabBarStyles.container,
        position === 'top'
          ? { top: 0, paddingTop: topPad, height: 64 + topPad, borderBottomWidth: 1, borderBottomColor: colors.borderLight }
          : { bottom: 0, paddingBottom: bottomPad, height: TabBarTokens.heightMobile + bottomPad },
      ]}
    >
      {/* Frosted glass background */}
      {isIOS && !isWeb ? (
        <BlurView
          intensity={80}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDark
                ? 'rgba(6,11,20,0.94)'
                : 'rgba(255,255,255,0.98)',
            },
          ]}
        />
      )}

      {/* Top hairline gradient accent */}
      {!isDesktopMenu && (
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={tabBarStyles.topAccent}
        />
      )}

      {/* Tab items */}
      <View style={[tabBarStyles.row, isDesktopMenu && tabBarStyles.webRow]}>
        {visibleRoutes.map((route) => {
          const tab = TABS.find((t) => t.name === route.name);
          if (!tab) return null;

          const focused = state.index === state.routes.indexOf(route);

          const onPress = () => {
            Haptics.selectionAsync();
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabItem
              key={route.name}
              tab={tab}
              focused={focused}
              color={inactiveColor}
              activeColor={activeColor}
              onPress={onPress}
              flex={isDesktopMenu ? 0 : 1}
              isDesktopMenu={isDesktopMenu}
            />
          );
        })}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Tab screens definition (shared between desktop + mobile)
// ---------------------------------------------------------------------------
function TabScreens() {
  return (
    <>
      <Tabs.Screen name="index"       options={{ title: 'Discover' }} />
      <Tabs.Screen name="calendar"   options={{ title: 'Calendar' }} />
      <Tabs.Screen name="communities" options={{ title: 'Community' }} />
      <Tabs.Screen name="perks"      options={{ title: 'Perks' }} />
      <Tabs.Screen name="profile"    options={{ title: 'Profile' }} />
      <Tabs.Screen name="council"    options={{ href: null }} />
      <Tabs.Screen name="explore"    options={{ href: null }} />
      <Tabs.Screen name="directory"  options={{ href: null }} />
      <Tabs.Screen name="dashboard"  options={{ href: null }} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Root layout
// ---------------------------------------------------------------------------
export default function TabLayout() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isDesktop = isWeb && width >= 1024;
  const pathname = usePathname();

  React.useEffect(() => {
    if (!isWeb) return;

    const cleanPath = pathname.split('?')[0].replace(/\/$/, '') || '/';
    if (!VALID_TAB_PATHS.has(cleanPath)) {
      router.replace('/');
    }
  }, [isWeb, pathname]);

  // Desktop web: sidebar navigation on the left, content on the right (no tab bar)
  if (isDesktop) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', overflow: 'hidden' }}>
        <WebSidebar />
        <View style={{ flex: 1, overflow: 'hidden' }}>
          <Tabs
            initialRouteName="index"
            screenOptions={{ headerShown: false }}
            tabBar={() => null}
          >
            <TabScreens />
          </Tabs>
        </View>
      </View>
    );
  }

  // Mobile / tablet: bottom floating tab bar
  return (
    <View style={{ flex: 1, overflow: 'hidden' }}>
      <Tabs
        initialRouteName="index"
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <CustomTabBar {...props} position="bottom" />}
      >
        <TabScreens />
      </Tabs>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const tabBarStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 0,
    elevation: 0,
    overflow: 'hidden',
  },
  topAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    opacity: 0.6,
  },
  row: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  webRow: {
    justifyContent: 'center',
    gap: 18,
    paddingTop: 4,
    paddingBottom: 6,
  },
});

const tabItemStyles = StyleSheet.create({
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
    position: 'relative',
  },
  pill: {
    position: 'absolute',
    top: 2,
    width: 52,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  label: {
    letterSpacing: 0.1,
  },
  webItem: {
    minWidth: 120,
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 4,
  },
  webLabel: {
    fontFamily: 'Poppins_500Medium',
  },
  webLabelActive: {
    fontFamily: 'Poppins_600SemiBold',
  },
  webUnderline: {
    height: 2,
    width: '70%',
    borderRadius: 999,
    backgroundColor: CultureTokens.indigo,
    marginTop: 2,
  },
});
