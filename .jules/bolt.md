
## 2025-03-03 - Added React.memo() to Discover list items
**Learning:** Found that multiple small recurring UI components (`CityCard`, `CommunityCard`, `SpotlightCard`, `CategoryCard`, `EventCard`, `SectionHeader`) used extensively in high-traffic screens like `app/(tabs)/index.tsx` inside `FlatList` and loops, lacked `React.memo()`. This causes a huge amount of unnecessary re-renders across the whole list whenever a parent updates or filters change.
**Action:** Wrapped each card/header component in `React.memo()` at export so they only update when their props (data) actually change, significantly improving scrolling and rendering performance on large lists.
