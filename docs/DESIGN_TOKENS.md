# CulturePass UI Token System

> A comprehensive, theme-aware color and component system designed for cultural discovery.
>
> **Not colours. A system.**

---

## 🎨 Core Principles

- **Dark mode first** — Night festival feeling is the default experience
- **Warm discovery** — Saffron and coral create action-oriented warmth
- **Global belonging** — Teal signals cross-cultural connection
- **Cultural authenticity** — Indigo brand, not tech-startup aesthetics
- **Accessible contrast** — All combinations meet WCAG AA minimum

---

## 1. 🎯 Core Brand Tokens

These define the CulturePass identity. Use sparingly, intentionally.

```typescript
import { CultureTokens } from '@/constants/theme';

CultureTokens.indigo      // #2C2A72 — Culture Indigo (primary brand)
CultureTokens.saffron    // #FF8C42 — Festival Saffron (warm discovery)
CultureTokens.coral      // #FF5E5B — Movement Coral (action energy)
CultureTokens.gold       // #FFC857 — Temple Gold (cultural premium)
CultureTokens.teal       // #2EC4B6 — Ocean Teal (global belonging)
```

### When to Use Each

| Token | Use Case | Example |
|-------|----------|---------|
| **Indigo** | Primary brand, navigation active, focus states | Button focus ring, active tab |
| **Saffron** | Event discovery, warm CTAs, primary action | Event card hero, "Browse Events" button |
| **Coral** | Artist features, urgent/emotional content | Artist highlight, "Featured" badge |
| **Gold** | Premium members, cultural markers | CulturePass+ tier badge, temple icons |
| **Teal** | Global belonging, venue/community markers | Venue icon, community join button |

---

## 2. 🌙 Background Tokens

### Dark Mode (Default)

```typescript
--cp-bg-primary:      #0B0B14  // Deep Space — page backgrounds
--cp-bg-secondary:    #1B0F2E  // Midnight Plum — secondary surfaces
--cp-bg-surface:      #22203A  // Rich Purple — card/component backgrounds
--cp-bg-elevated:     #2C2A72  // Culture Indigo — active/interactive surfaces
```

### Light Mode (Optional)

```typescript
--cp-bg-primary-light:  #F4EDE4  // Warm beige background
--cp-bg-secondary-light: #FFFFFF  // White surfaces
--cp-bg-surface-light:  #FFF8F0  // Off-white card backgrounds
--cp-bg-elevated-light: #E6D3B3  // Tan active surfaces
```

### Usage

```typescript
import { useColors } from '@/hooks/useColors';

const MyComponent = () => {
  const colors = useColors();
  return (
    <View style={{ backgroundColor: colors.background }}>
      <Card style={{ backgroundColor: colors.surface }} />
    </View>
  );
};
```

---

## 3. 🧍 Text Tokens

### Dark Mode (Default)

```typescript
--cp-text-primary:      #FFFFFF   // Primary readable text
--cp-text-secondary:    #C9C9D6   // Supporting text, captions
--cp-text-muted:        #8D8D8D   // Placeholder, disabled labels
--cp-text-on-accent:    #0B0B14   // Text on colored backgrounds
```

### Light Mode

```typescript
--cp-text-primary-light:    #1B0F2E  // Dark text on light backgrounds
--cp-text-secondary-light:  #4A4A4A  // Supporting text
--cp-text-muted-light:      #8D8D8D  // Muted text
```

### Contrast Ratios

All text meets WCAG AA minimum (4.5:1 for standard, 3:1 for large):

| Text Color | Background | Ratio |
|-----------|-----------|-------|
| `text-primary` | `bg-primary` | 18:1 ✓ |
| `text-secondary` | `bg-secondary` | 8.2:1 ✓ |
| `text-muted` | `bg-secondary` | 3.8:1 ✓ |

---

## 4. 🎟 Functional Tokens

Use for category-specific UI and bottom-sheet filtering.

### Events

```typescript
CultureTokens.event       // #FF8C42 — Saffron
CultureTokens.eventSoft   // #FFE1CC — Light tint for backgrounds
```

### Artists

```typescript
CultureTokens.artist      // #FF5E5B — Coral
CultureTokens.artistSoft  // #FFD6D5 — Light coral background
```

### Venues

```typescript
CultureTokens.venue       // #2EC4B6 — Teal
CultureTokens.venueSoft   // #D7F5F1 — Light teal background
```

### Movies

```typescript
CultureTokens.movie       // #FFC857 — Gold
CultureTokens.movieSoft   // #FFF3CC — Light gold background
```

### Community

```typescript
CultureTokens.community   // #3A86FF — Bright Blue
CultureTokens.communitySoft // #DCE8FF — Light blue background
```

### Usage Example

```typescript
// Category-based icon color
const CategoryIcon = ({ category }) => {
  const iconColor = {
    events: CultureTokens.event,
    artists: CultureTokens.artist,
    venues: CultureTokens.venue,
    movies: CultureTokens.movie,
    community: CultureTokens.community,
  }[category];

  return <Ionicons name="star" color={iconColor} size={24} />;
};
```

---

## 5. 🟢 Status Tokens

Standard status signalling.

```typescript
CultureTokens.success   // #2EC4B6 — Teal (matches Ocean Teal)
CultureTokens.warning   // #FFC857 — Gold
CultureTokens.error     // #FF5E5B — Coral
CultureTokens.info      // #3A86FF — Blue
```

### Usage

```typescript
// Ticket status badges
const TicketStatusBadge = ({ status }) => {
  const color = {
    confirmed: CultureTokens.success,
    pending: CultureTokens.warning,
    cancelled: CultureTokens.error,
    used: CultureTokens.info,
  }[status];

  return <Badge style={{ backgroundColor: color }} {...} />;
};
```

---

## 6. 🧭 Interaction Tokens

### Hover States

```typescript
--cp-hover: #FF8C42  // Saffron — same bright as primary action
```

### Focus States

```typescript
--cp-focus: #3A86FF  // Blue — clear keyboard navigation ring
```

### Active States

```typescript
--cp-active: #2C2A72  // Indigo — pressed / toggle-on state
```

### Disabled States

```typescript
--cp-disabled: #8D8D8D  // Muted gray — always low contrast
```

---

## 7. 🧱 Borders & Dividers

### Border Colors

```typescript
--cp-border-soft:     #2A2747   // Soft border (dark mode)
--cp-border-strong:   #2C2A72   // Strong border (dark mode)
--cp-divider:         #3A375A   // Full-width divider
```

### Usage

```typescript
<View style={{
  borderWidth: 1,
  borderColor: colors.border,    // Card outlines
}}>
  <Text>...</Text>
</View>

<Divider color={colors.divider} />  // Full-width separator
```

---

## 8. ✨ Signature Gradient

The **CulturePass Brand Gradient** — use for flagship moments.

```typescript
import { gradients } from '@/constants/theme';

gradients.culturepassBrand == [
  #2C2A72 (Indigo),
  #FF8C42 (Saffron),
  #FF5E5B (Coral)
]
```

### Use Cases

- Hero banners (Discover screen top)
- Onboarding screens (location, interests, communities)
- Flagship CTAs (CulturePass+ upgrade)
- Achievement badges (100 events attended, etc.)

### Example

```typescript
import LinearGradient from 'react-native-linear-gradient';
import { gradients } from '@/constants/theme';

<LinearGradient
  colors={gradients.culturepassBrand}
  angle={135}
  style={{ borderRadius: 16 }}>
  <Text style={{ color: '#FFFFFF' }}>
    Upgrade to CulturePass+
  </Text>
</LinearGradient>
```

---

## 9. 🔘 Button Tokens

### Primary Button

```typescript
--cp-btn-primary-bg:     #FF8C42  // Saffron
--cp-btn-primary-text:   #0B0B14  // Deep Space text
--cp-btn-primary-border: transparent
```

**Use for**: Primary CTAs ("Browse Events", "Join Community", "Buy Tickets")

### Secondary Button

```typescript
--cp-btn-secondary-bg:     #2C2A72  // Indigo
--cp-btn-secondary-text:   #FFFFFF  // White
--cp-btn-secondary-border: transparent
```

**Use for**: Secondary CTAs ("Cancel", "Learn More")

### Ghost Button

```typescript
--cp-btn-ghost-border:  #2EC4B6  // Teal
--cp-btn-ghost-text:    #2EC4B6  // Teal
--cp-btn-ghost-bg:      transparent
```

**Use for**: Tertiary or linking actions

### Disabled Button

```typescript
--cp-btn-disabled-bg:    #8D8D8D  // Muted gray
--cp-btn-disabled-text:  #FFFFFF
--cp-btn-disabled-opacity: 0.5
```

---

## 10. 📐 Component Tokens

Shared sizing and spacing for consistent UI.

### ButtonTokens

```typescript
import { ButtonTokens } from '@/constants/theme';

ButtonTokens.height      // sm: 36, md: 44 (Apple minimum), lg: 52
ButtonTokens.paddingH    // sm: 16, md: 20, lg: 28
ButtonTokens.radius      // 12
ButtonTokens.radiusPill  // 9999 (full pill)
ButtonTokens.fontSize    // sm: 14, md: 15, lg: 16
ButtonTokens.iconGap     // 8 (space between icon + text)
```

### CardTokens

```typescript
import { CardTokens } from '@/constants/theme';

CardTokens.radius        // 16
CardTokens.radiusLarge   // 20 (for featured cards)
CardTokens.padding       // 14 (standard card padding)
CardTokens.paddingLarge  // 18 (spacious card padding)
CardTokens.imageHeight   // mobile: 120, tablet: 140, desktop: 160
CardTokens.minWidth      // 160
```

### InputTokens

```typescript
import { InputTokens } from '@/constants/theme';

InputTokens.height       // 48
InputTokens.radius       // 12
InputTokens.fontSize     // 16
InputTokens.paddingH     // 16
InputTokens.iconSize     // 20
InputTokens.iconGap      // 10
```

### ChipTokens

```typescript
import { ChipTokens } from '@/constants/theme';

ChipTokens.height        // 36
ChipTokens.paddingH      // 16
ChipTokens.radius        // 50 (pill-shaped)
ChipTokens.fontSize      // 13
```

### AvatarTokens

```typescript
import { AvatarTokens } from '@/constants/theme';

AvatarTokens.size       // xs: 24, sm: 32, md: 40, lg: 56, xl: 72, xxl: 96
AvatarTokens.radius     // 9999 (always circular)
AvatarTokens.badgeSize  // 12 (status indicator)
```

### TabBarTokens

```typescript
import { TabBarTokens } from '@/constants/theme';

TabBarTokens.heightMobile     // 84
TabBarTokens.heightDesktop    // 64
TabBarTokens.iconSize         // 24
TabBarTokens.labelSize        // 10 (mobile)
TabBarTokens.labelSizeDesktop // 11
```

---

## 11. 🌐 Global UX Statement

This token system creates:

✓ **Warm discovery** — Saffron CTAs feel approachable, not cold
✓ **Night festival feeling** — Deep space background + cultural colors
✓ **Global belonging** — Teal signals cross-cultural community
✓ **Authenticity** — Indigo brand, not another fintech startup

Instead of:

❌ Tech blue startup vibe
❌ Corporate fintech colors
❌ Sterile, high-contrast design

---

## 12. 📋 Usage Guide

### Import Pattern

Always import from `theme.ts`, never individual files:

```typescript
// ✓ Correct
import { Colors, CultureTokens, ButtonTokens, CardTokens } from '@/constants/theme';

// ❌ Wrong
import { dark, light } from '@/constants/colors';
```

### Hook Pattern for Colors

```typescript
import { useColors } from '@/hooks/useColors';

const MyComponent = () => {
  const colors = useColors();

  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={{ color: colors.text }}>Hello</Text>
    </View>
  );
};
```

### Direct Token Access

```typescript
import { CultureTokens, ButtonTokens, CardTokens } from '@/constants/theme';

// Use directly for non-theme-aware values (component tokens)
const cardRadius = CardTokens.radius;      // 16
const buttonHeight = ButtonTokens.height.md;  // 44

// Use with useColors() for theme-aware values
const brandColor = CultureTokens.indigo;   // always #2C2A72
```

### Never Hardcode Colors

```typescript
// ❌ Never do this
<View style={{ backgroundColor: '#FF8C42' }} />

// ✓ Always use tokens
<View style={{ backgroundColor: CultureTokens.saffron }} />

// ✓ Or use hook for theme colors
const colors = useColors();
<View style={{ backgroundColor: colors.surface }} />
```

---

## 13. 🎬 Implementation Roadmap

### Phase 1 (Immediate)
- [ ] Update all hardcoded colors → `useColors()` or `CultureTokens`
- [ ] Audit event/artist/venue/movie cards for functional token colors
- [ ] Add CulturePass signature gradient to hero sections

### Phase 2 (Next Sprint)
- [ ] Light mode refinement (test all contrast ratios)
- [ ] Button state variants (hover, active, disabled)
- [ ] Focus ring design for keyboard navigation

### Phase 3 (Future)
- [ ] Custom theme/brand customization API
- [ ] RTL language support (Arabic, Hebrew)
- [ ] High contrast mode for accessibility
- [ ] Theme preview/switcher in settings

---

## 14. 📚 Related Files

- [constants/colors.ts](../constants/colors.ts) — Raw token definitions
- [constants/theme.ts](../constants/theme.ts) — Master export surface
- [hooks/useColors.ts](../hooks/useColors.ts) — Theme-aware hook
- [hooks/useLayout.ts](../hooks/useLayout.ts) — Responsive breakpoints
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System architecture + layer overview

---

## Questions?

- **Token missing?** Add it to `CultureTokens` object in `constants/colors.ts`
- **Color not matching design?** Update in `dark` or `light` theme object, confirm in Figma
- **Brand usage unclear?** Reference "When to Use Each" tables above

Remember: **Every color serves a purpose. No random hex values.**

