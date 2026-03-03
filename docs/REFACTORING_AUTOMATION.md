# CulturePass Refactoring Automation Guide

**Purpose:** Provide templates and tools to automate the refactoring of remaining 60+ files to use the token system.

---

## 🤖 Automated Refactoring Template

### Step 1: Import Updates (Apply to ALL files)

**Pattern:** Find and replace imports

#### Replace:
```typescript
import { Colors } from '@/constants/theme';
```

#### With:
```typescript
import { Colors, CultureTokens, ButtonTokens, CardTokens, InputTokens, ChipTokens } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
```

---

## Step 2: Component Colors → Hook-Based

### Pattern A: Functional Components

#### Before:
```typescript
interface MyComponentProps { ... }

export default function MyComponent(props: MyComponentProps) {
  return (
    <View style={{ backgroundColor: Colors.background }}>
      <Text style={{ color: Colors.text }}>...</Text>
    </View>
  );
}
```

#### After:
```typescript
interface MyComponentProps { ... }

export default function MyComponent(props: MyComponentProps) {
  const colors = useColors();
  
  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={{ color: colors.text }}>...</Text>
    </View>
  );
}
```

---

### Pattern B: StyleSheet Colors

#### Before:
```typescript
const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    color: Colors.text,
  },
});
```

#### After:
```typescript
const styles = StyleSheet.create({
  container: {
    // backgroundColor removed — applied inline with useColors()
    borderWidth: 1,
    // borderColor removed — applied inline
    // color removed — applied inline
  },
});

// In component:
<View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]} />
<Text style={[styles.text, { color: colors.text }]} />
```

---

## Step 3: Hardcoded Hex Colors → Tokens

### Color Mapping Reference

| Hardcoded | Use | Token |
|-----------|-----|-------|
| `#0B0B14`, `#000000` | Dark backgrounds | `colors.background`, `colors.backgroundSecondary` |
| `#FFFFFF` | White text | `colors.text` (in dark) or `colors.textInverse` |
| `#FF8C42` | Saffron (events) | `CultureTokens.saffron` or `CultureTokens.event` |
| `#FF5E5B` | Coral (artists) | `CultureTokens.coral` or `CultureTokens.artist` |
| `#2EC4B6` | Teal (venues) | `CultureTokens.teal` or `CultureTokens.venue` |
| `#FFC857` | Gold (premium) | `CultureTokens.gold` or `CultureTokens.movie` |
| `#2C2A72` | Indigo (brand) | `CultureTokens.indigo` |
| `#007AFF` | Blue (primary) | `colors.primary` |
| Any other hex | Custom brand color | Use closest `CultureTokens.*` |

---

## Step 4: Hardcoded Sizes → Tokens

### Size Mapping Reference

| Hardcoded | Use | Token |
|-----------|-----|-------|
| `height: 44` | Button standard | `ButtonTokens.height.md` |
| `height: 36` | Small button | `ButtonTokens.height.sm` |
| `height: 52` | Large button | `ButtonTokens.height.lg` |
| `borderRadius: 12` | Button radius | `ButtonTokens.radius` |
| `borderRadius: 9999` | Pill shape | `ButtonTokens.radiusPill` |
| `borderRadius: 16` | Card radius | `CardTokens.radius` |
| `padding: 14` | Card padding | `CardTokens.padding` |
| `height: 48` | Input height | `InputTokens.height` |
| `height: 36` | Chip height | `ChipTokens.height` |
| Other radius values | Check use case | `CardTokens.radius`, `ButtonTokens.radius`, etc. |

---

## 🛠️ Four-Step Refactoring Checklist

For each component/screen:

### Step 1: Imports (2 min)
- [ ] Add `useColors` hook import
- [ ] Add necessary token imports (ButtonTokens, CardTokens, etc.)
- [ ] Keep existing `Colors` import (used for shadows, glass, gradients)
- [ ] Remove unused imports

### Step 2: Component Logic (5 min)
- [ ] Add `const colors = useColors();` at top of component
- [ ] Replace `Colors.background` with `colors.background`
- [ ] Replace `Colors.text` with `colors.text`
- [ ] Replace `Colors.surface` with `colors.surface`
- [ ] Replace `Colors.textSecondary` with `colors.textSecondary`
- [ ] Keep `Colors.shadows.*` and `Colors.glass.*` (not theme-aware)

### Step 3: Hardcoded Colors → Tokens (5 min)
- [ ] Find all `'#'` hex color values
- [ ] Replace `'#FF8C42'` with `CultureTokens.saffron`
- [ ] Replace `'#FF5E5B'` with `CultureTokens.coral`
- [ ] Replace `'#2C2A72'` with `CultureTokens.indigo`
- [ ] Replace `'#2EC4B6'` with `CultureTokens.teal`
- [ ] Replace `'#FFC857'` with `CultureTokens.gold`

### Step 4: Hardcoded Sizes → Tokens (5 min)
- [ ] Replace button heights with `ButtonTokens.height.{sm|md|lg}`
- [ ] Replace button radius with `ButtonTokens.radius`
- [ ] Replace card radius with `CardTokens.radius`
- [ ] Replace card padding with `CardTokens.padding`
- [ ] Replace input heights with `InputTokens.height`

---

## 🔍 Find & Replace Commands (For IDE)

### Command 1: Import Update
**Find:**
```
import { Colors } from '@/constants/theme';
```

**Replace:**
```
import { Colors, CultureTokens, ButtonTokens, CardTokens, InputTokens, ChipTokens } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
```

### Command 2: Background Colors
**Find:**
```
backgroundColor: Colors\.background
```

**Replace:**
```
backgroundColor: colors.background  // Add: const colors = useColors();
```

### Command 3: Text Colors
**Find:**
```
color: Colors\.text
```

**Replace:**
```
color: colors.text
```

### Command 4: Saffron Brand Color
**Find:**
```
'#FF8C42'|Colors?\..*Saffron.*|Colors?\.event
```

**Replace:**
```
CultureTokens.saffron
```

### Command 5: Button Heights
**Find:**
```
height:\s*44([^0-9]|$)
```

**Replace:**
```
height: ButtonTokens.height.md$1
```

---

## 📋 File-by-File Checklist

### Phase 3: Main Tab Screens (High Impact)
Priority: **CRITICAL** — affects 60% of user sessions

- [ ] `app/(tabs)/index.tsx` — Discover screen (~1200 lines, split into 3 passes)
  - Pass 1: Hero section + header
  - Pass 2: Event sections (EventCard, etc.)
  - Pass 3: Community sections & modals
- [ ] `app/(tabs)/calendar.tsx` — Calendar screen
- [ ] `app/(tabs)/communities.tsx` — Communities browse
- [ ] `app/(tabs)/perks.tsx` — Perks listing
- [ ] `app/(tabs)/profile.tsx` — User profile tab
- [ ] `app/allevents.tsx` — All events grid
- [ ] `app/search/index.tsx` — Search screen
- [ ] `app/map.tsx` — Map screen

**Subtotal: 8 files, ~3,000 lines**

### Phase 4: Detail Screens (High Engagement)
Priority: **HIGH** — conversion funnels

- [ ] `app/event/[id].tsx` — Event detail (~2600 lines, split into 5 passes)
- [ ] `app/community/[id].tsx` — Community detail
- [ ] `app/artist/[id].tsx` — Artist profile
- [ ] `app/venue/[id].tsx` — Venue detail
- [ ] `app/business/[id].tsx` — Business profile
- [ ] `app/movies/[id].tsx` — Movie detail
- [ ] `app/activities/[id].tsx` — Activity detail

**Subtotal: 7 files, ~2,500 lines**

### Phase 5: User Profile & Settings (Account)
Priority: **MEDIUM** — account management

- [ ] `app/profile/edit.tsx` — Profile editor
- [ ] `app/profile/qr.tsx` — QR card
- [ ] `app/profile/public.tsx` — Public profile
- [ ] `app/user/[id].tsx` — User profile view
- [ ] `app/settings/index.tsx` — Settings page
- [ ] `app/profile/components/ProfileHero.tsx`
- [ ] `app/profile/components/ProfileStats.tsx`
- [ ] `app/profile/components/ProfileMap.tsx`
- [ ] And 5+ other sub-components

**Subtotal: 15+ files, ~1,500 lines**

### Phase 6: Membership & Payments (Revenue)
Priority: **MEDIUM-HIGH** — revenue flows

- [ ] `app/membership/upgrade.tsx` — CulturePass+ page
- [ ] `app/payment/wallet.tsx` — Wallet screen
- [ ] `app/payment/methods.tsx` — Payment methods
- [ ] `app/payment/transactions.tsx` — Transaction history
- [ ] `app/tickets/index.tsx` — Tickets list
- [ ] `app/tickets/[id].tsx` — Ticket detail
- [ ] `app/perks/[id].tsx` — Perk detail
- [ ] `components/perks/*` — Perk components (5-8 files)

**Subtotal: 8+ files, ~1,200 lines**

### Phase 7: Onboarding & Auth (User Acquisition)
Priority: **MEDIUM** — LTV critical path

- [ ] `app/(onboarding)/login.tsx` — Login
- [ ] `app/(onboarding)/signup.tsx` — Signup
- [ ] `app/(onboarding)/forgot-password.tsx` — Password recovery
- [ ] `app/(onboarding)/location.tsx` — Location step
- [ ] `app/(onboarding)/communities.tsx` — Communities step
- [ ] `app/(onboarding)/interests.tsx` — Interests step

**Subtotal: 6 files, ~1,000 lines**

### Phase 8: Layout & Navigation (Global)
Priority: **LOW** — once per app session

- [ ] `app/_layout.tsx` — Root layout
- [ ] `app/(tabs)/_layout.tsx` — Tab bar layout
- [ ] `app/(onboarding)/_layout.tsx` — Onboarding layout

**Subtotal: 3 files, ~300 lines**

---

## 🚀 Recommended Daily Targets

| Day | Scope | Impact |
|-----|-------|--------|
| Day 1 | Phase 3 (Part 1) — Discover screen + supporting components | 15-20% app coverage |
| Day 2 | Phase 3 (Part 2) — Remaining main screens (Calendar, Communities, Perks, Profile) | 40% app coverage |
| Day 3 | Phase 4 — All detail screens (event/[id], community/[id], etc.) | 70% app coverage |
| Day 4 | Phase 5-6 — Profile, settings, membership, payments | 85% app coverage |
| Day 5 | Phase 7-8 — Onboarding, auth, layouts + validation | 95% app coverage + QA |

---

## ✅ Validation Steps

After refactoring each file:

1. **TypeScript Check:**
   ```bash
   npm run typecheck
   ```
   - Must have 0 errors (check with: `npm run typecheck 2>&1 | grep error | wc -l`)

2. **Linting Check:**
   ```bash
   npm run lint
   ```
   - No new errors introduced

3. **Visual Test:**
   - Dark mode: Verify colors look correct
   - Light mode: Verify contrast ratios
   - Mobile web: Check responsive layout
   - iOS simulator: Check native rendering
   - Android simulator: Check native rendering

4. **Component Test:**
   - Navigate to refactored screen
   - Verify buttons, links, text colors
   - Verify card backgrounds, borders
   - Check shadows and elevations

---

## 📊 Refactoring Metrics

Track progress with:

```bash
# Count remaining hardcoded colors
grep -r "backgroundColor.*['\"]#[0-9A-Fa-f]" app/ components/ --include="*.tsx" | wc -l

# Count remaining Color. references
grep -r "Colors\." app/ components/ --include="*.tsx" | grep -v "Colors\." | wc -l

# Files still needing refactoring
find app components -name "*.tsx" -exec grep -l "Colors\." {} \; | wc -l
```

---

## 🎯 Success Criteria

✅ **Phase 1-2 Complete (DONE)**
- Core UI components fully tokenized
- Discovery components fully tokenized

✅ **Phase 3-4 Complete**
- All main screens use `useColors()` + tokens
- All detail screens use tokens
- No hardcoded hex colors in screens
- All button sizes use `ButtonTokens`
- All card sizes use `CardTokens`

✅ **Phase 5-8 Complete**
- 95%+ of codebase refactored
- Zero hardcoded colors in app/ and components/
- Theme toggle works (dark → light)
- Contrast ratios WCAG AA verified
- All tests pass: TypeScript, ESLint, smoke tests

---

## 🔗 Related Documentation

- [docs/DESIGN_TOKENS.md](../docs/DESIGN_TOKENS.md) — Full token reference (14 sections)
- [docs/REFACTORING_PLAN.md](../docs/REFACTORING_PLAN.md) — Strategic plan (10 phases)
- [CLAUDE.md](../CLAUDE.md) — AI agent guide
- [AGENTS.md](../AGENTS.md) — System overview

---

**Status:** Ready for parallel refactoring — use these templates to speed up the process across the team.

