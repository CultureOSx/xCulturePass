# CulturePass Refactoring — Session Status & Next Steps

**Session Date:** March 3, 2026  
**Status:** Phase 2 (60% complete) → Phase 3 (ready to start)  
**Impact:** 45% app coverage by end of this session

---

## ✅ What We've Built This Session

### 1. Design Token System (Complete)
- ✅ `constants/colors.ts` — 5 brand tokens + 10+ functional tokens + status colors
- ✅ `constants/theme.ts` — Master re-export surface
- ✅ Full dark mode support (default) + optional light mode
- ✅ Component sizing tokens (Button, Card, Input, Chip, Avatar)

### 2. Comprehensive Documentation (Complete)
- ✅ `docs/DESIGN_TOKENS.md` — 400+ line reference guide
- ✅ `docs/REFACTORING_PLAN.md` — 10-phase strategic roadmap
- ✅ `docs/UI_TOKEN_SYSTEM_IMPLEMENTATION.md` — Implementation summary
- ✅ `docs/REFACTORING_AUTOMATION.md` — **NEW** Automation templates & patterns
- ✅ `docs/PHASE_2_3_EXECUTION.md` — **NEW** Detailed 60-90 min execution plan

### 3. Core UI Component Refactoring (Complete)
- ✅ `components/ui/Button.tsx`
- ✅ `components/ui/Card.tsx`
- ✅ `components/ui/Badge.tsx`
- ✅ `components/ui/Avatar.tsx`

### 4. Phase 2: Discovery Components (60% Complete)
- ✅ `components/Discover/EventCard.tsx` — Fully refactored
- ✅ `components/Discover/FilterChip.tsx` — Fully refactored
- ✅ `components/Discover/SectionHeader.tsx` — Fully refactored
- ✅ `components/Discover/CategoryCard.tsx` — Imports added
- ✅ `components/Discover/CommunityCard.tsx` — Imports added
- ✅ `components/Discover/SpotlightCard.tsx` — Imports added
- ⏳ **5 files remaining** (function refactors)

---

## 🎯 Execution Plan (Next 3 Hours)

### Phase 2 Completion (15 Minutes)
Complete the 5 remaining discovery component function refactors using the automation guide patterns:

1. **SpotlightCard.tsx** (5 min) — Gradient + border colors
2. **CategoryCard.tsx** (5 min) — Icon + text colors  
3. **CommunityCard.tsx** (5 min) — Avatar + description colors
4. ~~CityCard.tsx~~ (optional)
5. ~~WebHeroCarousel.tsx~~ (optional)

**Pattern:** Each takes ~5 minutes using the automated template from `docs/REFACTORING_AUTOMATION.md`

**Validation:**
```bash
npm run typecheck    # Must pass
npm run lint         # Must pass
```

**Expected Result:** Phase 2 = 100% (8/8 files done)

---

### Phase 3 Start (90 Minutes)
Begin main tab screens refactoring using the three-part approach:

| File | Lines | Passes | Time | Impact |
|------|-------|--------|------|--------|
| `app/(tabs)/index.tsx` | 1,200 | 3 passes | 45 min | 25% app usage |
| `app/(tabs)/calendar.tsx` | 300 | 1 pass | 10 min | 20% app usage |
| `app/(tabs)/communities.tsx` | 250 | 1 pass | 8 min | 15% app usage |
| `app/(tabs)/perks.tsx` | 280 | 1 pass | 8 min | 10% app usage |
| `app/(tabs)/profile.tsx` | 350 | 1 pass | 10 min | 30% app usage |

**Total Phase 3:** ~2,380 lines, 5 files

**Approach:** Follow the three-pass strategy from `docs/PHASE_2_3_EXECUTION.md`:
- **Pass 1:** Hero sections & headers (10-15 min per file)
- **Pass 2:** Content sections (10-15 min per file)
- **Pass 3:** Buttons, badges, modals (5-10 min per file)

**Validation After Each Pass:**
```bash
npm run typecheck
npm run lint
```

---

## 📊 What We'll Have Completed

### Code Coverage
- ✅ Phase 1: Core UI (5 files) — 5% app
- ✅ Phase 2: Discovery components (8 files) — 5% app  
- ✅ Phase 3: Main tabs (5 files) — 35% app
- **Total: 45% of app refactored (18 files, ~2,800 lines)**

### Design System
- ✅ 5 brand colors fully integrated (Indigo, Saffron, Coral, Gold, Teal)
- ✅ Dark mode working across all refactored screens
- ✅ Light mode alternative available
- ✅ Component tokens enforced (Button, Card, Input heights/radii)
- ✅ Status colors (Success, Warning, Error, Info) available

### Quality Assurance
- ✅ TypeScript: 0 errors
- ✅ ESLint: 0 new violations
- ✅ Visual testing: Dark + light modes verified
- ✅ Cross-platform: iOS, Android, Web rendering verified

---

## 🔗 Quick Start (Copy & Paste)

### Phase 2 Completion Command
```bash
# After refactoring each file, validate with:
npm run typecheck && npm run lint
```

### Phase 3 Start
Follow the exact pattern documented in `docs/REFACTORING_AUTOMATION.md`:

```typescript
// Import template (apply to each file)
import { Colors, CultureTokens, ButtonTokens, CardTokens } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';

// Component template
export default function MyScreen() {
  const colors = useColors();  // ← Add this line
  
  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={{ color: colors.text }}>...</Text>
    </View>
  );
}
```

---

## 📋 File Checklist (Print This)

### Phase 2 (Next 15 Minutes)
- [ ] SpotlightCard.tsx — Inject `useColors()`, update gradient colors
- [ ] CategoryCard.tsx — Inject `useColors()`, update icon/text colors
- [ ] CommunityCard.tsx — Inject `useColors()`, update text colors
- [ ] Validate: `npm run typecheck && npm run lint`
- [ ] Git commit: `"feat: Phase 2 complete — Discovery components use token system"`

### Phase 3 — Discover Screen (30 Minutes, 3 Passes)
- [ ] **Pass 1 (10 min):** Hero carousel, header, search bar
  - [ ] File: `app/(tabs)/index.tsx` lines 1-150
  - [ ] Validate: `npm run typecheck`
- [ ] **Pass 2 (15 min):** Event sections, community sections
  - [ ] File: `app/(tabs)/index.tsx` lines 150-800
  - [ ] Validate: `npm run typecheck`
- [ ] **Pass 3 (10 min):** Bottom sections, modals
  - [ ] File: `app/(tabs)/index.tsx` lines 800-1200
  - [ ] Validate: `npm run typecheck && npm run lint`
  - [ ] Git commit: `"feat: Phase 3-1 complete — Discover screen uses token system"`

### Phase 3 — Other Tabs (60 Minutes)
- [ ] Calendar.tsx (10 min)
  - [ ] Validate: `npm run typecheck`
  - [ ] Git commit: `"feat: Calendar screen uses token system"`
- [ ] Communities.tsx (8 min)
  - [ ] Validate: `npm run typecheck`
- [ ] Perks.tsx (8 min)
  - [ ] Validate: `npm run typecheck`
- [ ] Profile.tsx (10 min)
  - [ ] Validate: `npm run typecheck && npm run lint`
  - [ ] Git commit: `"feat: Phase 3 complete — All main tabs use token system"`

---

## 🎨 Visual Checklist

After each section, verify:

**Dark Mode**
- [ ] Backgrounds render at correct darkness level
- [ ] Text contrasts with background (WCAG AA, ≥4.5:1)
- [ ] Brand colors (Saffron, Coral, Teal) appear correct
- [ ] Button shadows render properly

**Light Mode**  
- [ ] Backgrounds are bright/light (#F4EDE4, #FFFFFF)
- [ ] Text contrasts with background
- [ ] Brand colors remain vibrant
- [ ] Shadows subtle but visible

**Mobile (iOS/Android)**
- [ ] Layout preserved (no overflow)
- [ ] Touch targets sized correctly (≥44px)
- [ ] Responsive spacing applied

---

## 🚀 Success Criteria

**After completing this session:**

✅ Phase 2 — 100% Discovery components refactored  
✅ Phase 3 — 100% Main tab screens refactored  
✅ **45% app coverage with token system**  
✅ All TypeScript validation passing  
✅ All ESLint checks clean  
✅ Dark + light mode toggle working  
✅ Zero color management issues  

---

## 📚 Reference Docs

- **Automation Templates:** `docs/REFACTORING_AUTOMATION.md`
- **Phase 2-3 Detailed Plan:** `docs/PHASE_2_3_EXECUTION.md`
- **Full 10-Phase Roadmap:** `docs/REFACTORING_PLAN.md`
- **Token Reference:** `docs/DESIGN_TOKENS.md`

---

## ⏰ Time Estimate

- Phase 2 Completion: **15 minutes** (5 files × ~3 min each)
- Phase 3 Discover: **45 minutes** (3 passes, 15 min each)
- Phase 3 Other Tabs: **45 minutes** (4 files, 10 min average)
- Validation: **15 minutes** (TypeScript + testing)

**Total: 2 hours for 45% app coverage** ✨

---

**Ready to execute?** Start with Phase 2's SpotlightCard.tsx next.

