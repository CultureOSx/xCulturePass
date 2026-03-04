## 2026-03-03 - Accessibility Label Pattern on Pressable
**Learning:** Icon-only navigation buttons in React Native `Pressable` components frequently lack screen-reader context in this codebase. While `Ionicons` are self-evident visually, they present as blank interactive elements to assistive tech.
**Action:** Always add `accessibilityRole="button"` and a descriptive `accessibilityLabel` when implementing or modifying `Pressable` elements that only contain icons, specifically in navigation components like `UserProfileHero`.
