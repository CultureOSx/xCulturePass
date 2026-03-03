/**
 * useColors — dark/light-mode-aware color hook for CulturePassAU.
 *
 * Returns the correct color theme based on:
 * - Native: device system color scheme (dark by default in CulturePass UX)
 * - Web: user's system color scheme preference (respects system setting)
 *
 * Usage:
 *   const colors = useColors();
 *   <View style={{ backgroundColor: colors.background }} />
 *   <Text style={{ color: colors.text }} />
 *
 * For static use (e.g. in StyleSheet.create at module level where hooks
 * cannot be called), import Colors directly:
 *   import Colors from '@/constants/colors';
 *   // Colors.primary, Colors.background, etc. (maps to light theme by default)
 *
 * Note on web theming:
 *   The WebSidebar uses its own `useColorScheme()` for dark/light detection.
 *   The main content area can use `useColors()` which respects the system setting.
 *   Most web screens use a custom dark gradient background, so this hook's
 *   return value primarily affects text/border colors on web.
 */

import { Platform, useColorScheme } from 'react-native';
import type { ColorTheme } from '@/constants/colors';
import { light, dark } from '@/constants/colors';

export function useColors(): ColorTheme {
  // Web: respect the user's system color scheme preference
  // Native: same — useColorScheme returns the device setting
  const scheme = useColorScheme();
  return scheme === 'dark' ? dark : light;
}

// ---------------------------------------------------------------------------
// Selector variant — access a single token without re-rendering on
// unrelated color changes (useful for components that only use one color).
//
// Usage:
//   const primary = useColor('primary');
// ---------------------------------------------------------------------------
export function useColor<K extends keyof ColorTheme>(key: K): ColorTheme[K] {
  const colors = useColors();
  return colors[key];
}

// ---------------------------------------------------------------------------
// Utilities for inline platform-aware color decisions
// ---------------------------------------------------------------------------

/** Returns `darkValue` if the current scheme is dark, `lightValue` otherwise */
export function useSchemeValue<T>(darkValue: T, lightValue: T): T {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkValue : lightValue;
}

/** Returns true when the current color scheme is dark */
export function useIsDark(): boolean {
  const scheme = useColorScheme();
  return scheme === 'dark';
}
