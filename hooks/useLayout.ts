/**
 * useLayout — responsive layout hook for CulturePassAU.
 *
 * Returns platform + breakpoint state and pre-computed responsive values
 * so every component gets consistent grid, padding, and column config
 * without ad-hoc `useWindowDimensions()` boilerplate.
 *
 * Usage:
 *   const { isDesktop, numColumns, hPad, tabBarHeight, sidebarWidth } = useLayout();
 *
 * Web layout model:
 *   Mobile  (<768px)  → bottom tab bar, full-width content, 16px h-padding
 *   Tablet  (768-1023) → bottom tab bar, full-width content, 24px h-padding
 *   Desktop (≥1024px) → left sidebar (240px) + main content, 32px h-padding
 *
 * On desktop web, the sidebar occupies 240px on the left. Components that
 * need to compute absolute widths must subtract sidebarWidth.
 * columnWidth() does this automatically.
 */

import { Platform, useWindowDimensions } from 'react-native';
import { Breakpoints, TabBarTokens } from '@/constants/theme';

/** Width of the desktop web left-nav sidebar in pixels */
export const SIDEBAR_WIDTH = 240;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LayoutState {
  /** Raw window width from useWindowDimensions */
  width: number;
  /** Raw window height from useWindowDimensions */
  height: number;

  // Platform
  isWeb:     boolean;
  isNative:  boolean;
  isIOS:     boolean;
  isAndroid: boolean;

  // Breakpoints
  isMobile:  boolean;   // < 768px
  isTablet:  boolean;   // 768–1023px
  isDesktop: boolean;   // ≥ 1024px

  // Grid
  /** Recommended column count for event / content grids */
  numColumns: number;
  /** Recommended column count for wider featured/discover grids */
  numColumnsWide: number;

  // Spacing
  /** Horizontal page padding */
  hPad: number;
  /** Vertical section spacing */
  vPad: number;
  /** Gap between grid columns */
  columnGap: number;

  // Navigation
  tabBarHeight: number;

  /**
   * Width of the left sidebar on desktop web (240px), 0 on all other layouts.
   * Subtract this when computing content-area widths on desktop web.
   */
  sidebarWidth: number;

  /**
   * Top padding needed to clear any fixed navigation overlay.
   * 0 on web (sidebar layout has no top bar).
   * insets.top equivalent is handled per-screen with useSafeAreaInsets().
   */
  webTopInset: 0;

  // Helpers
  /**
   * Width of a single grid column.
   * Accounts for outer padding + column gaps + sidebar on desktop web.
   */
  columnWidth: (cols?: number) => number;

  /**
   * Total usable content width after subtracting sidebar and outer padding.
   */
  contentWidth: number;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLayout(): LayoutState {
  const { width, height } = useWindowDimensions();

  const isWeb     = Platform.OS === 'web';
  const isNative  = !isWeb;
  const isIOS     = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';

  const isDesktop = isWeb && width >= Breakpoints.desktop;
  const isTablet  = width >= Breakpoints.tablet && !isDesktop;
  const isMobile  = !isDesktop && !isTablet;

  // Sidebar (desktop web only)
  const sidebarWidth = isDesktop ? SIDEBAR_WIDTH : 0;

  // Grid columns
  const numColumns     = isDesktop ? 3 : 2;
  const numColumnsWide = isDesktop ? 4 : isTablet ? 3 : 2;

  // Spacing
  const hPad = isDesktop ? 32 : isTablet ? 24 : 16;
  const vPad = isDesktop ? 32 : 24;
  const columnGap = isDesktop ? 16 : 14;

  // Navigation
  const tabBarHeight = isDesktop
    ? 0  // no tab bar on desktop — sidebar handles navigation
    : TabBarTokens.heightMobile;

  // Usable content width (subtract sidebar on desktop)
  const contentWidth = width - sidebarWidth - hPad * 2;

  // Column width helper
  const columnWidth = (cols = numColumns): number => {
    const totalGaps = (cols - 1) * columnGap;
    return (width - sidebarWidth - hPad * 2 - totalGaps) / cols;
  };

  return {
    width,
    height,
    isWeb,
    isNative,
    isIOS,
    isAndroid,
    isMobile,
    isTablet,
    isDesktop,
    numColumns,
    numColumnsWide,
    hPad,
    vPad,
    columnGap,
    tabBarHeight,
    sidebarWidth,
    webTopInset: 0,
    columnWidth,
    contentWidth,
  };
}
