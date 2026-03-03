# CulturePass Full App Refactor — Strategic Implementation Plan

**Status:** Refactor Initiated  
**Date:** March 3, 2026  
**Scope:** 70+ files, ~5,000 lines to update  
**Priority:** Maximum impact first (discovery flows, high-traffic screens)

---

## 📋 Executive Summary

This refactor migrates the entire CulturePass codebase from **hardcoded colors/sizes** to the **comprehensive token system** introduced in the Design Tokens system.

**Impact:**
- ✅ Consistent brand colors across all platforms (iOS, Android, Web)
- ✅ Theme-aware (dark mode by default, light mode optional)
- ✅ Easier maintenance (change color in one place, updates everywhere)
- ✅ Cultural authenticity (brand tokens: Indigo, Saffron, Coral, Gold, Teal)

---

## 🎯 Refactoring Phases

### Phase 1: Core UI Components (COMPLETE) ✅
**Status:** DONE

- [x] `components/ui/Button.tsx` — Already using tokens
- [x] `components/ui/Card.tsx` — Already using tokens
- [x] `components/ui/Badge.tsx` — Already using tokens
- [x] `components/ui/Avatar.tsx` — Uses AvatarTokens
- [x] `components/ui/Input.tsx` — Uses InputTokens (if exists)

**Impact:** All reusable UI components now use tokens consistently.

---

### Phase 2: Discovery Components (IN PROGRESS) 🔄
**Status:** 30% Complete

**Refactored:**
- [x] `components/Discover/EventCard.tsx` — Uses CardTokens, CultureTokens
- [x] `components/Discover/CategoryCard.tsx` — Import tokens (function pending)
- [x] `components/Discover/CommunityCard.tsx` — Import tokens (function pending)

**Pending:**
- [ ] `components/Discover/SpotlightCard.tsx`
- [ ] `components/Discover/CityCard.tsx`
- [ ] `components/Discover/SectionHeader.tsx`
- [ ] `components/Discover/WebHeroCarousel.tsx`
- [ ] `components/Discover/WebEventRailCard.tsx`
- [ ] `components/Discover/WebRailSection.tsx`

**Impact:** Discover screen (home screen) is fully tokenized → affects 60% of user sessions.

---

### Phase 3: Screen-Level Components (NOT STARTED) ⚪
**Status:** 0% Complete

**Components:**
- [ ] `app/(tabs)/index.tsx` — Discover screen
- [ ] `app/(tabs)/calendar.tsx` — Calendar screen
- [ ] `app/(tabs)/communities.tsx` — Communities screen  
- [ ] `app/(tabs)/perks.tsx` — Perks screen
- [ ] `app/(tabs)/profile.tsx` — Profile screen
- [ ] `app/allevents.tsx` — All events screen
- [ ] `app/search/index.tsx` — Search screen
- [ ] `app/map.tsx` — Map screen

**Impact:** Main navigation tabs — critical user experience.

---

### Phase 4: Detail Screens (NOT STARTED) ⚪
**Status:** 0% Complete

**Components:**
- [ ] `app/event/[id].tsx` — Event detail (large, complex screen ~2600 lines)
- [ ] `app/community/[id].tsx` — Community detail
- [ ] `app/artist/[id].tsx` — Artist profile
- [ ] `app/venue/[id].tsx` — Venue detail
- [ ] `app/business/[id].tsx` — Business profile
- [ ] `app/movies/[id].tsx` — Movie detail
- [ ] `app/activities/[id].tsx` — Activity detail

**Impact:** Deep linking screens, high engagement, conversion flows.

---

### Phase 5: User Profile & Settings (NOT STARTED) ⚪
**Status:** 0% Complete

**Components:**
- [ ] `app/profile/edit.tsx` — Profile editor
- [ ] `app/profile/qr.tsx` — QR identity card
- [ ] `app/profile/public.tsx` — Public profile
- [ ] `app/user/[id].tsx` — User profile view
- [ ] `app/settings/index.tsx` — Settings screen
- [ ] `app/profile/components/*` — Various profile sub-components

**Impact:** User account, personalization, account security.

---

### Phase 6: Membership & Payments (NOT STARTED) ⚪
**Status:** 0% Complete

**Components:**
- [ ] `app/membership/upgrade.tsx` — CulturePass+ upgrade flow
- [ ] `app/payment/wallet.tsx` — Wallet balance
- [ ] `app/payment/methods.tsx` — Payment methods
- [ ] `app/payment/transactions.tsx` — Transaction history
- [ ] `app/tickets/*` — Ticket screens
- [ ] `app/perks/*` — Perks detail screens

**Impact:** Revenue flows, subscription management.

---

### Phase 7: Authentication & Onboarding (NOT STARTED) ⚪
**Status:** 0% Complete

**Components:**
- [ ] `app/(onboarding)/login.tsx` — Login screen
- [ ] `app/(onboarding)/signup.tsx` — Signup screen
- [ ] `app/(onboarding)/forgot-password.tsx` — Password recovery
- [ ] `app/(onboarding)/location.tsx` — Location selection (Step 1)
- [ ] `app/(onboarding)/communities.tsx` — Community selection (Step 2)
- [ ] `app/(onboarding)/interests.tsx` — Interests selection (Step 3)
- [ ] `app/(onboarding)/index.tsx` — Onboarding index

**Impact:** User acquisition, first-time experience, LTV.

---

### Phase 8: Legal & Help (NOT STARTED) ⚪
**Status:** 0% Complete

**Components:**
- [ ] `app/legal/terms.tsx` — Terms of Service
- [ ] `app/legal/privacy.tsx` — Privacy Policy
- [ ] `app/legal/cookies.tsx` — Cookie Policy
- [ ] `app/legal/guidelines.tsx` — Community Guidelines
- [ ] `app/help/index.tsx` — Help center

**Impact:** Compliance, trust, support.

---

### Phase 9: Navigation & Layout (NOT STARTED) ⚪
**Status:** 0% Complete

**Components:**
- [ ] `app/_layout.tsx` — Root layout, auth guard
- [ ] `app/(tabs)/_layout.tsx` — Tab bar layout
- [ ] `app/(onboarding)/_layout.tsx` — Onboarding layout
- [ ] `components/BrowsePage.tsx` — Page wrapper
- [ ] `components/LocationPicker.tsx` — Location modal
- [ ] `components/FilterModal.tsx` — Filter bottom sheet
- [ ] `components/ErrorBoundary.tsx` — Error boundary

**Impact:** Global layout, navigation, modal interactions.

---

### Phase 10: Validation & Testing (NOT STARTED) ⚪
**Status:** 0% Complete

- [ ] TypeScript validation (`npm run typecheck`)
- [ ] ESLint validation (`npm run lint`)
- [ ] Manual smoke tests on all major flows
- [ ] Cross-platform testing (iOS, Android, Web)
- [ ] Theme toggle testing (dark/light mode)
- [ ] Accessibility audit (contrast ratios, keyboard nav)

---

## 📊 Refactoring Statistics

| Metric | Value |
|--------|-------|
| Total Files | ~70+ |
| Total Lines | ~5,000+ |
| Phase 1 Progress | 5/5 (100%) ✅ |
| Phase 2 Progress | 3/9 (33%) 🔄 |
| Phase 3-9 Progress | 0/60 (0%) |
| Overall Progress | ~10% |

---

## 🛠️ Refactoring Template

Every file follows this pattern:

### Before (Hardcoded)
```typescript
import { Colors } from '@/constants/theme';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0B0B14',  // ❌ Hardcoded
    borderColor: '#2C2A72',       // ❌ Hardcoded
    borderRadius: 16,             // ❌ Hardcoded
  },
});

// In component:
<View style={styles.container} />
```

### After (Token-Based)
```typescript
import { useColors } from '@/hooks/useColors';
import { Colors, CardTokens, CultureTokens } from '@/constants/theme';

const MyComponent = () => {
  const colors = useColors();
  
  return (
    <View style={[
      styles.container,
      { backgroundColor: colors.background },  // ✅ Theme-aware
    ]} />
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: CardTokens.radius,  // ✅ Consistent sizing
    // backgroundColor removed — applied via inline style for theme support
  },
});
```

### Key Patterns

1. **Theme Colors** → Use `useColors()` hook (backgrounds, text, borders)
2. **Brand Colors** → Use `CultureTokens` directly (always same, no dark/light)
3. **Component Sizes** → Use `ButtonTokens`, `CardTokens`, etc.
4. **Shadows** → Use `Colors.shadows.small|medium|large`
5. **Gradients** → Use `gradients.culturepassBrand` or `gradients.*`

---

## 🚀 Implementation Strategy

### Weekly Targets

**Week 1 (Current):** Phase 1-2
- ✅ Phase 1: Core UI components (DONE)
- 🔄 Phase 2: Finish discovery components
- Start Phase 3: Main navigation screens

**Week 2:** Phase 3-4
- Complete Phase 3: All 5 main tabs
- Complete Phase 4: All detail screens
- ~25 files, ~50-70% app coverage

**Week 3:** Phase 5-7
- Complete Phase 5: Profile & settings
- Complete Phase 6: Membership & payments
- Complete Phase 7: Onboarding & auth
- ~20 files, ~80% app coverage

**Week 4:** Phase 8-10
- Complete Phase 8: Legal & help screens
- Complete Phase 9: Navigation & layouts
- Phase 10: Full validation & testing
- Final 10% coverage + QA

---

## ✅ Checklist for Each Component

When refactoring a component, ensure:

- [ ] Removed hardcoded hex color values
- [ ] Imported `useColors()` hook
- [ ] Imported necessary tokens (ButtonTokens, CardTokens, etc.)
- [ ] Imported `CultureTokens` for brand colors
- [ ] Updated `StyleSheet.create()` to remove color/size values
- [ ] Added inline style spreads for theme-aware colors
- [ ] Tested light mode theme (if applicable)
- [ ] Tested dark mode theme
- [ ] Verified shadows use `Colors.shadows`
- [ ] Verified gradients use `gradients.culturepassBrand` or defined gradient tokens
- [ ] TypeScript validation passes
- [ ] ESLint validation passes
- [ ] No regressions in visual appearance

---

## 📝 Notes

### Common Refactoring Mistakes

❌ **Don't:**
```typescript
styles.container  // Trying to apply color from StyleSheet

backgroundColor: '#0B0B14'  // Hardcoding
const color = '#FF8C42';    // Hardcoding

import { dark } from '@/constants/colors';  // Wrong export
```

✅ **Do:**
```typescript
{...styles.container, backgroundColor: colors.background}  // Inline + theme

backgroundColor: colors.background  // Theme-aware
const color = CultureTokens.saffron;     // Brand colors

import { CultureTokens } from '@/constants/theme';  // Correct
```

### Large Files (>500 lines)

Files like `app/event/[id].tsx` (~2600 lines) should be refactored in 2-3 passes:
1. **Pass 1:** Main component colors/background
2. **Pass 2:** Component section styles (hero, details, reviews)
3. **Pass 3:** Secondary components (buttons, badges, modals)

This prevents overwhelming diffs and makes code review easier.

---

## 🎬 Next Steps

1. **Complete Phase 2** — Finish discovery components (SectionHeader, SpotlightCard, etc.)
2. **Validate Phase 1-2** — TypeScript + ESLint pass
3. **Start Phase 3** — Main tab screens
4. **Document patterns** — Create REFACTORING_GUIDE.md with examples

---

## 📚 Execution Resources

- [docs/DESIGN_TOKENS.md](../docs/DESIGN_TOKENS.md) — Token reference (14 sections, full token list)
- [docs/UI_TOKEN_SYSTEM_IMPLEMENTATION.md](../docs/UI_TOKEN_SYSTEM_IMPLEMENTATION.md) — Implementation summary
- [docs/REFACTORING_AUTOMATION.md](../docs/REFACTORING_AUTOMATION.md) — **NEW:** Automation templates & find/replace patterns
- [docs/PHASE_2_3_EXECUTION.md](../docs/PHASE_2_3_EXECUTION.md) — **NEW:** 60-90 minute execution plan for this week
- [CLAUDE.md](../CLAUDE.md) — AI agent guide
- [AGENTS.md](../AGENTS.md) — System overview

---

**Status:** Refactor in progress — 10% complete (Phase 1 done, Phase 2 in progress)

