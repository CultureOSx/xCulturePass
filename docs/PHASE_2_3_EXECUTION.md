# Phase 2-3 Execution Plan (This Week)

**Goal:** Complete Discovery component refactoring (Phase 2) and begin Main Tab screens (Phase 3) for 40-50% app coverage.

**Timeline:** 2 sessions, 6-8 hours total

---

## Phase 2: Discover Components (Remaining 5 Files)

### Status Summary
- ✅ EventCard.tsx — COMPLETE
- ✅ FilterChip.tsx — COMPLETE  
- ✅ SectionHeader.tsx — COMPLETE
- ⏳ SpotlightCard.tsx — Import updates done, function pending
- ⏳ CategoryCard.tsx — Import updates done, function pending
- ⏳ CommunityCard.tsx — Import updates done, function pending
- ⏳ CityCard.tsx — Not started
- ⏳ WebHeroCarousel.tsx — Not started (web only)
- ⏳ WebEventRailCard.tsx — Not started (web only)

**Overall:** 37.5% complete (3/8 fully done)

---

## Execution Order (Next 60-90 Minutes)

### 1️⃣ SpotlightCard.tsx (Highest Priority)
**Why First:** Featured hero card — high visibility, mirrors EventCard pattern

**Pattern:**
```typescript
// Current: StyleSheet definitions with hardcoded colors
const styles = StyleSheet.create({
  gradient: { backgroundColor: Colors.background }, // REMOVE
  border: { borderColor: Colors.borderLight },       // REMOVE
});

// Target: Inline color application
<LinearGradient
  colors={[colors.background, colors.surface]}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
>
```

**Changes Required:**
- Inject `const colors = useColors();` 
- Apply gradient tokens: `gradients.culturepassBrand` or theme-based gradient
- Replace `Colors.border*` with `colors.border*`
- Keep `Colors.shadows.*` as-is (not theme-aware)

**File Path:** `components/Discover/SpotlightCard.tsx`

**Estimated Time:** 5 minutes

---

### 2️⃣ CategoryCard.tsx (Core Discovery Flow)
**Why Second:** Part of category selector grid on Discover home

**Pattern:**
```typescript
// Current
export function CategoryCard({ category, onPress, color }: CategoryCardProps) {
  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={{ backgroundColor: Colors.surface }}>
        <Icon name={category.icon} size={32} color={Colors.primary} />
        <Text style={{ color: Colors.text }}>{category.name}</Text>
      </View>
    </Pressable>
  );
}

// Target
export function CategoryCard({ category, onPress, color }: CategoryCardProps) {
  const colors = useColors();  // ADD
  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={{ backgroundColor: colors.surface }}>  // UPDATE
        <Icon name={category.icon} size={32} color={colors.primary} />  // UPDATE
        <Text style={{ color: colors.text }}>{category.name}</Text>  // UPDATE
      </View>
    </Pressable>
  );
}
```

**File Path:** `components/Discover/CategoryCard.tsx`

**Estimated Time:** 5 minutes

---

### 3️⃣ CommunityCard.tsx (Core Discovery Flow)
**Why Third:** Parallel to CategoryCard, same structure

**Pattern:** Identical to CategoryCard (function injection + color refs)

**File Path:** `components/Discover/CommunityCard.tsx`

**Estimated Time:** 5 minutes

---

### 4️⃣ CityCard.tsx (Location Selection)
**Why Fourth:** Used in map, location picker, smaller file

**Changes:**
- Inject `const colors = useColors();`
- Replace `Colors.background` → `colors.background`
- Replace `Colors.text` → `colors.text`
- Check for hardcoded location pins/markers (may need `CultureTokens.*` instead)

**File Path:** `components/Discover/CityCard.tsx` (check if exists or `components/LocationPicker.tsx`)

**Estimated Time:** 5 minutes

---

### 5️⃣ WebHeroCarousel.tsx (Web-Only)
**Why Last:** Web variant, lower priority for native users (but good UX)

**Changes:**
- Same pattern as SpotlightCard
- Verify web-specific CSS doesn't conflict with theme

**File Path:** `components/web/WebHeroCarousel.tsx`

**Estimated Time:** 3 minutes

---

### ✅ Phase 2 Validation
After completing all 5 files:

```bash
# Verify all imports are clean
grep -r "import.*Colors" components/Discover --include="*.tsx" | grep -v useColors

# Verify all colors use hooks
grep -r "Colors\." components/Discover --include="*.tsx" | grep -v "Colors\." | wc -l  # Should be ~0

# Type check
npm run typecheck  # Expected: 0 errors

# Lint check
npm run lint       # Expected: 0 new errors
```

---

## Phase 3: Main Tab Screens (Beginning Next)

### Files to Refactor

| Priority | File | Lines | Est. Time | Impact |
|----------|------|-------|-----------|--------|
| 1 | `app/(tabs)/index.tsx` | 1,200 | 15 min × 3 = 45 min | 25% app usage |
| 2 | `app/(tabs)/calendar.tsx` | 300 | 10 min | 20% app usage |
| 3 | `app/(tabs)/communities.tsx` | 250 | 8 min | 15% app usage |
| 4 | `app/(tabs)/perks.tsx` | 280 | 8 min | 10% app usage |
| 5 | `app/(tabs)/profile.tsx` | 350 | 10 min | 30% app usage |

**Total Phase 3:** ~2,380 lines, ~80 minutes (1.3 hours)

**Combined Phase 2+3:** ~2,680 lines, ~170 minutes (2.8 hours) = **~45% app coverage**

---

## Strategy for Large Files (event/[id].tsx, Discover)

### Rule: Never Refactor >500 Line File in One Pass

**For Discover Screen (app/(tabs)/index.tsx at ~1,200 lines):**

**Pass 1 (10 min) — Hero & Header:**
```typescript
// Lines 1-150: Imports, header, hero carousel, search bar
// Changes: useColors hook, gradient hero, search input colors
// Affected: Hero carousel colors, search input bg/text
```

**Pass 2 (15 min) — Content Sections:**
```typescript
// Lines 150-800: Event cards, community cards, section headers
// Changes: EventCard already refactored, verify container colors
// Affected: Section backgrounds, separator colors
```

**Pass 3 (15 min) — Bottom Sections & Modals:**
```typescript
// Lines 800-1200: Featured communities, ads, modals
// Changes: Modal backgrounds, button colors
// Affected: All buttons use ButtonTokens, all modals use colors hook
```

**Each Pass:**
- Validate with `npm run typecheck`
- Check linting with `npm run lint`
- Test visual appearance (dark + light modes)

---

## Parallel Refactoring Opportunity

### For Team Coordination:
If multiple people are working:

**Person A (Right Now):**
- Phase 2: SpotlightCard.tsx, CategoryCard.tsx, CommunityCard.tsx
- ~15 min → validates pattern

**Person B (Overlap):**
- Phase 2: CityCard.tsx, WebHeroCarousel.tsx
- ~8 min → wraps up discovery components

**Person A (Next):**
- Phase 3 Pass 1: Discover screen hero section
- 10 min → quick win

**Person B (Next):**
- Phase 3 Pass 1 Parallel: Calendar.tsx (independent)
- 10 min → no dependencies

---

## Common Errors to Avoid

❌ **DON'T:**
```typescript
// Wrong: Importing Colors but not using hook
import { Colors } from '@/constants/theme';
export function MyComponent() {
  return <View style={{ backgroundColor: Colors.background }} />;  // Static!
}
```

✅ **DO:**
```typescript
// Right: Import + hook together
import { Colors } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';

export function MyComponent() {
  const colors = useColors();
  return <View style={{ backgroundColor: colors.background }} />;  // Dynamic!
}
```

❌ **DON'T:**
```typescript
// Wrong: StyleSheet can't hold theme colors
const styles = StyleSheet.create({
  container: { backgroundColor: colors.background }  // colors is undefined here!
});
```

✅ **DO:**
```typescript
// Right: Apply colors inline when using hooks
const styles = StyleSheet.create({
  container: { flex: 1 }  // Static properties only
});

export function MyComponent() {
  const colors = useColors();
  return <View style={[styles.container, { backgroundColor: colors.background }]} />;
}
```

---

## Success Checklist

After Completing Phase 2-3 (40% App Coverage):

### Code Quality
- [ ] TypeScript: 0 errors
- [ ] ESLint: 0 new errors
- [ ] All ref imports verified (useColors where needed)
- [ ] All StyleSheet colors moved inline
- [ ] All hardcoded hex colors replaced with tokens (except comments)

### Component Testing
- [ ] EventCard renders correctly (colors apply per theme)
- [ ] FilterChip shows active/inactive states with theme colors
- [ ] Discover screen loads without errors
- [ ] Calendar screen navigation works
- [ ] Communities screen list renders
- [ ] Perks grid displays
- [ ] Profile shows user info

### Visual Verification
- [ ] Dark mode: All colors readable (contrast ≥4.5:1 for AA)
- [ ] Light mode: All colors distinct
- [ ] Mobile (375px): Layout preserved
- [ ] Tablet (768px): Responsive scaling correct
- [ ] Desktop (1200px): Web layout styled properly

### Cross-Platform
- [ ] iOS simulator dark mode ✅
- [ ] iOS simulator light mode ✅
- [ ] Android emulator dark mode ✅
- [ ] Android emulator light mode ✅
- [ ] Web browser dark mode ✅
- [ ] Web browser light mode ✅

---

## Handoff Documentation

**When Handing Off to Next Person/Team:**

Create a file `PHASE_2_3_COMPLETION_REPORT.md` with:

```markdown
# Phase 2-3 Completion Report

**Date:** [Date completed]
**Files Refactored:** 13 (5 Phase 2 + 8 Phase 3)
**Lines Refactored:** ~2,680
**Test Coverage:** 98% (2 critical paths tested)

## Completed Files

### Phase 2 Discovery Components
- ✅ SpotlightCard.tsx
- ✅ CategoryCard.tsx
- ✅ CommunityCard.tsx
- ✅ CityCard.tsx
- ✅ WebHeroCarousel.tsx

### Phase 3 Main Tabs
- ✅ app/(tabs)/index.tsx (Discover)
- ✅ app/(tabs)/calendar.tsx
- ✅ app/(tabs)/communities.tsx
- ✅ app/(tabs)/perks.tsx
- ✅ app/(tabs)/profile.tsx

## Test Results

\`\`\`
npm run typecheck: PASS ✅
npm run lint: PASS ✅
Dark mode visual: PASS ✅
Light mode visual: PASS ✅
Mobile (iOS/Android): PASS ✅
Web: PASS ✅
\`\`\`

## Next Phase

Proceed to Phase 4: Detail Screens
- app/event/[id].tsx (split into 5 passes: 2,600 lines)
- app/community/[id].tsx
- Other detail screens...

See docs/REFACTORING_PLAN.md for full roadmap.
```

---

## Related Docs

- [docs/REFACTORING_PLAN.md](./REFACTORING_PLAN.md) — Complete 10-phase strategy
- [docs/REFACTORING_AUTOMATION.md](./REFACTORING_AUTOMATION.md) — Templates & find/replace commands
- [docs/DESIGN_TOKENS.md](./DESIGN_TOKENS.md) — Full token reference
- [CLAUDE.md](../CLAUDE.md) — AI agent execution guide

---

**Ready to Execute?** Start with SpotlightCard.tsx next.

