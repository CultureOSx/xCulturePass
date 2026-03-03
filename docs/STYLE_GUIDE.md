# CulturePass — Design System & Style Guide

> Single source of truth for all visual design decisions.
> Always use `useColors()`, `Spacing`, and `TextStyles` from `constants/theme.ts`.
> Never hardcode hex values, font sizes, or spacing in components.

---

## 1. Brand Identity

### Mission
CulturePass celebrates the full mosaic of cultures that make Australia extraordinary. The visual language is warm, inclusive, optimistic, and joyful — reflecting the vibrancy of diaspora communities.

### Personality
- **Warm** — inviting, never corporate
- **Vibrant** — bold colour, never garish
- **Trustworthy** — clean layouts, consistent spacing
- **Inclusive** — accessible contrast ratios, readable type

---

## 2. Colour Palette

> Source of truth: `constants/colors.ts`
> Always access via `useColors()` hook — never hardcode hex.

### Primary Brand
| Role | Light | Dark | Usage |
|------|-------|------|-------|
| `primary` | `#007AFF` | `#0A84FF` | CTAs, active states, links |
| `primarySoft` | `rgba(0,122,255,0.10)` | `rgba(10,132,255,0.15)` | Chip backgrounds, detect buttons |
| `primaryGlow` | `rgba(0,122,255,0.15)` | `rgba(10,132,255,0.20)` | Selected card backgrounds |

### Semantic Colours
| Role | Light | Dark | Usage |
|------|-------|------|-------|
| `secondary` | `#5856D6` | `#5E5CE6` | Purple accent — communities, tags |
| `accent` | `#FF9500` | `#FF9F0A` | Orange — highlights, new badges |
| `gold` | `#FFD700` | `#FFD60A` | Premium tier — CulturePass+ |
| `error` | `#FF3B30` | `#FF453A` | Errors, destructive actions |
| `success` | `#34C759` | `#30D158` | Success states, confirmations |
| `warning` | `#FF9500` | `#FF9F0A` | Warnings, cautions |

### Neutrals (use `useColors()`)
| Token | Light | Dark |
|-------|-------|------|
| `background` | `#FFFFFF` | `#000000` |
| `surface` | `#F2F2F7` | `#1C1C1E` |
| `surfaceElevated` | `#FFFFFF` | `#2C2C2E` |
| `text` | `#000000` | `#FFFFFF` |
| `textSecondary` | `#6C6C70` | `#AEAEB2` |
| `textTertiary` | `#C7C7CC` | `#636366` |
| `border` | `#C6C6C8` | `#38383A` |
| `borderLight` | `#E5E5EA` | `#2C2C2E` |

### Neon Accents (use sparingly — active/focused states only)
| Token | Value | Usage |
|-------|-------|-------|
| `neon.blue` | `#00D4FF` | Active filter chips |
| `neon.purple` | `#BF5AF2` | Focused gradient borders |
| `neon.teal` | `#00E5CC` | Success glow states |

### Gradients
| Name | Colors | Usage |
|------|--------|-------|
| `aurora` | `#007AFF → #5856D6 → #FF2D55` | Hero carousels, feature banners |
| `primary` | `#007AFF → #0055D4` | Primary CTA buttons |
| `sunset` | `#FF9500 → #FF2D55` | Warm featured event cards |
| `brand` | `#5C0D8A → #FF3D77 → #FF7A18` | Onboarding, brand hero screens |

---

## 3. Typography

> Source of truth: `constants/typography.ts`
> Font family: **Poppins** (Google Fonts, loaded via expo-font)

### Type Scale
| Style token | Family | Size | Weight | Line Height | Usage |
|------------|--------|------|--------|-------------|-------|
| `display` | Poppins | 34px | 700 Bold | 41px | Hero headings |
| `title1` | Poppins | 28px | 700 Bold | 34px | Screen titles |
| `title2` | Poppins | 22px | 700 Bold | 28px | Section headings |
| `title3` | Poppins | 20px | 600 SemiBold | 25px | Card titles |
| `headline` | Poppins | 17px | 600 SemiBold | 22px | List item titles |
| `body` | Poppins | 17px | 400 Regular | 22px | Body copy |
| `callout` | Poppins | 16px | 400 Regular | 21px | Callouts, subtitles |
| `subheadline` | Poppins | 15px | 400 Regular | 20px | Secondary text |
| `footnote` | Poppins | 13px | 400 Regular | 18px | Captions, footnotes |
| `caption1` | Poppins | 12px | 400 Regular | 16px | Timestamps, tags |
| `caption2` | Poppins | 11px | 400 Regular | 13px | Badges, labels |

### Weight Classes Available
- `Poppins_400Regular` — body text, descriptions
- `Poppins_500Medium` — labels, secondary headings
- `Poppins_600SemiBold` — interactive elements, section labels
- `Poppins_700Bold` — screen titles, CTAs
- `Poppins_800ExtraBold` — hero display text, feature highlights
- `Poppins_900Black` — decorative large type only

### Desktop Overrides
On web at ≥768px breakpoint, increase all sizes by ~20%.

---

## 4. Spacing System

> Source of truth: `constants/spacing.ts`
> Based on a **4-point grid**. Never use arbitrary values.

| Token | Value | Usage |
|-------|-------|-------|
| `Spacing.xs` | 4px | Icon gaps, tight padding |
| `Spacing.sm` | 8px | Inner component padding |
| `Spacing.md` | 12px | Standard gap between elements |
| `Spacing.lg` | 16px | Card padding, list item gaps |
| `Spacing.xl` | 20px | Screen horizontal padding |
| `Spacing.xxl` | 24px | Section spacing |
| `Spacing.xxxl` | 32px | Large section gaps |
| `Spacing.huge` | 48px | Hero section spacing |

### Border Radius
| Token | Value | Usage |
|-------|-------|-------|
| `radius.xs` | 4px | Chips, small badges |
| `radius.sm` | 8px | Input fields, small cards |
| `radius.md` | 12px | Standard cards |
| `radius.lg` | 16px | Modal sheets, large cards |
| `radius.xl` | 20px | Feature cards |
| `radius.round` | 50px | Pills, fully-rounded buttons |
| `radius.circle` | 9999px | Avatar circles, icon buttons |

### Breakpoints (for responsive layouts)
| Name | Min Width | Usage |
|------|-----------|-------|
| `mobile` | 0px | Single-column, full-width |
| `tablet` | 768px | 2-column grids |
| `desktop` | 1024px | Sidebar + main, 3+ columns |

---

## 5. Component Tokens

> Source of truth: `constants/theme.ts`

### Buttons (`ButtonTokens`)
| Variant | Height | Border Radius | Font |
|---------|--------|---------------|------|
| Primary | 56px | 16px | Poppins_600SemiBold 17px |
| Secondary | 52px | 14px | Poppins_600SemiBold 16px |
| Ghost | 44px | 12px | Poppins_500Medium 15px |
| Small | 36px | 10px | Poppins_600SemiBold 13px |

- **Primary**: Solid `colors.primary` background, white text
- **Secondary**: `colors.primarySoft` background, `colors.primary` text, 1.5px primary border
- **Ghost**: Transparent background, `colors.text` text, 1px `colors.border` border
- **Destructive**: Solid `colors.error` background, white text

### Cards (`CardTokens`)
- Background: `colors.surface`
- Border: 1px `colors.borderLight`
- Border radius: 16px (standard), 20px (feature)
- Shadow: `shadowColor: colors.text`, `shadowOffset: {0, 2}`, `shadowOpacity: 0.06`, `shadowRadius: 8`
- Elevation (Android): 3

### Input Fields (`InputTokens`)
- Height: 52px (standard), 44px (search)
- Border radius: 12px (standard), 16px (search)
- Border: 1px `colors.border` (rest), `colors.primary` (focused)
- Background: `colors.surfaceElevated`
- Font: Poppins_400Regular 16px
- Placeholder: `colors.textTertiary`

### Tab Bar
- Height: 68px (content area) + safe area inset
- Active pill: `colors.primary` background, white icon+label
- Inactive: transparent background, `colors.textSecondary` icon+label
- Background: iOS BlurView (intensity 80, tint auto), Android/Web solid `colors.surface`
- Active icon size: 22px; Inactive: 22px
- Label font: Poppins_600SemiBold 11px

---

## 6. Icons

### Icon Library
- **Primary**: Ionicons (via `@expo/vector-icons`) — all platforms
- **iOS native**: SF Symbols via `expo-symbols` (`SymbolView`) — iOS 16+ only

### SF Symbol Mapping (iOS)
| Tab | Ionicons (fallback) | SF Symbol (active) |
|-----|--------------------|--------------------|
| Discover | `compass` / `compass-outline` | `safari.fill` / `safari` |
| Calendar | `calendar` / `calendar-outline` | `calendar.fill` / `calendar` |
| Community | `people` / `people-outline` | `person.3.fill` / `person.3` |
| Perks | `gift` / `gift-outline` | `gift.fill` / `gift` |
| Profile | `person-circle` / `person-circle-outline` | `person.circle.fill` / `person.circle` |

### Icon Sizing
| Context | Size |
|---------|------|
| Tab bar | 22px |
| Nav bar buttons | 24px |
| Card lead icons | 20px |
| Inline/label icons | 16–18px |
| Small badges | 12–14px |

---

## 7. Motion & Haptics

### Animation Durations
| Type | Duration | Easing |
|------|----------|--------|
| Micro (color/opacity) | 150ms | `ease-in-out` |
| Standard (position/scale) | 250ms | `ease-out` |
| Elaborate (modals, sheets) | 350ms | `spring` |
| Scroll-reactive blur | continuous | `interpolate` |

### Haptic Feedback (iOS — `expo-haptics`)
| Interaction | Haptic |
|-------------|--------|
| Tab bar press | `Haptics.selectionAsync()` |
| Category chip select | `Haptics.selectionAsync()` |
| State/city pick in location picker | `Haptics.selectionAsync()` |
| City confirmed (location picker close) | `Haptics.notificationAsync(Success)` |
| Error / denied permission | `Haptics.notificationAsync(Error)` |
| Card tap / open | `Haptics.impactAsync(Light)` |
| Home logo button | `Haptics.impactAsync(Light)` |
| Open modals/sheets | `Haptics.impactAsync(Light)` |
| Detect location button | `Haptics.impactAsync(Medium)` |
| QR scan success | `Haptics.notificationAsync(Success)` |

### Scroll-Reactive Header (Discover tab — iOS)
- `scrollY`: Reanimated `useSharedValue(0)`
- Border: opacity interpolated `0→1` over scroll `0→40px`
- BlurView: opacity interpolated `0→1` over scroll `0→80px`

---

## 8. Platform-Specific Behaviour

| Feature | iOS | Android | Web |
|---------|-----|---------|-----|
| Tab bar | BlurView frosted glass | Solid `colors.surface` | Solid `colors.surface` |
| Tab icons | SF Symbols | Ionicons | Ionicons |
| Haptics | Full support | Full support | No-op |
| Modals | `pageSheet` presentation | Full-screen | Full-screen |
| Header blur | `BlurView` | Not rendered | Not rendered |
| Location detection | Apple Maps geocoder | Google Maps geocoder | Browser Geolocation |
| Safe area | `useSafeAreaInsets()` | `useSafeAreaInsets()` | Fixed 67px top |

---

## 9. Accessibility

### Colour Contrast
- Body text on white: ≥ 7:1 (WCAG AAA)
- UI controls on white: ≥ 4.5:1 (WCAG AA)
- Large text (≥18px bold): ≥ 3:1 (WCAG AA)

### Interaction Targets
- Minimum tappable area: 44×44pt (Apple HIG)
- Use `hitSlop` on small icons: `hitSlop={12}`

### Labels
- All `Pressable` buttons must have `accessibilityLabel`
- All `Image` components must have `accessibilityLabel` or `accessibilityRole="none"` for decorative
- All `TextInput` must have `accessibilityLabel={label}`

### Reduce Motion
- Respect `useReducedMotion()` from Reanimated — skip animations when enabled

---

## 10. Screen Layout Rules

### Native (iOS/Android)
```
┌─────────────────────────────────┐
│  Safe area inset (top)          │
│  Header row (44pt)              │
│─────────────────────────────────│
│                                 │
│  Content (flex: 1, scroll)      │
│  Horizontal padding: 20px       │
│                                 │
│─────────────────────────────────│
│  Tab bar (68pt + safe area)     │
└─────────────────────────────────┘
```

### Web (≥1024px desktop)
```
┌──────────┬──────────────────────┐
│ Sidebar  │  Content area        │
│ 220px    │  max-width: 1200px   │
│ (fixed)  │  auto margins        │
└──────────┴──────────────────────┘
```

### Section Anatomy
1. Screen title — `TextStyles.title1`, color `colors.text`
2. Section label — `TextStyles.caption1`, uppercase, letter-spacing 1, color `colors.textSecondary`
3. Content cards — `CardTokens` applied
4. Bottom padding — 80px minimum (clears tab bar)

---

## 11. Voice & Tone (Copy)

| Context | Tone | Example |
|---------|------|---------|
| Onboarding | Warm, welcoming | "Where are you? Let's find events near you." |
| Empty states | Encouraging | "No events yet. Check back soon — your community is growing!" |
| Errors | Clear, not scary | "Something went wrong. Pull to refresh." |
| Buttons | Action-oriented | "Continue", "Get Tickets", "Join Community" |
| Haptic moments | Invisible | (never describe haptics in UI text) |

---

## 12. Do's and Don'ts

### Do
- Use `useColors()` for every colour reference in components
- Use `Spacing.*` constants for all padding/margin/gap values
- Use `<Button>`, `<Card>`, `<Badge>` from `components/ui` — never raw `Pressable + Text`
- Wrap all async data screens in `<ErrorBoundary>`
- Add `accessibilityLabel` to all interactive elements
- Use `Platform.OS === 'ios'` guards for BlurView and SF Symbols
- Call `Haptics` on all meaningful user interactions (iOS/Android only)

### Don't
- Hardcode hex colors (`#007AFF`) in component files
- Use arbitrary spacing values (e.g., `margin: 13`)
- Use system fonts — Poppins must be loaded before rendering
- Import from individual `constants/*.ts` files in screens — use `constants/theme`
- Bypass `ErrorBoundary` for screens with network requests
- Use `any` TypeScript casts without a comment explaining why
- Skip haptics "because it's a small interaction" — consistency matters

---

## 13. File & Component Naming

| Type | Convention | Example |
|------|-----------|---------|
| Screen files | `kebab-case.tsx` | `event-detail.tsx` |
| Component files | `PascalCase.tsx` | `EventCard.tsx` |
| Hook files | `camelCase.ts` prefixed `use` | `useLocations.ts` |
| Utility files | `camelCase.ts` | `formatDate.ts` |
| Constant files | `camelCase.ts` | `colors.ts` |
| Style objects | `s` (local), `styles` (shared) | `const s = StyleSheet.create(...)` |

---

## 14. Design Assets

| Asset | Location | Dimensions |
|-------|----------|------------|
| App icon | `assets/images/icon.png` | 1024×1024 |
| Splash icon | `assets/images/splash-icon.png` | 1024×1024 |
| Android foreground | `assets/images/android-icon-foreground.png` | 1024×1024 |
| Android background | `assets/images/android-icon-background.png` | 1024×1024 |
| Android monochrome | `assets/images/android-icon-monochrome.png` | 1024×1024 |
| Favicon | `assets/images/favicon.png` | 196×196 |
| Adaptive icon bg color | `#E6F4FE` | — |

### Brand Colors (Figma)
- Primary Blue: `#007AFF`
- Brand Purple: `#5C0D8A`
- Brand Magenta: `#FF3D77`
- Brand Orange: `#FF7A18`
- Background (light): `#FFFFFF`
- Background (dark): `#000000`
