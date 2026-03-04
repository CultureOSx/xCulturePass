# Web Reimagined — Marketplace Grid (No Sidebar)

Date: 2026-03-04  
Status: Approved  
Scope: Web experience for `Discover`, `Calendar`, `Community`, `Perks`, `Profile`

## Product Direction
- Reimagine the web app with a **bold marketplace-grid** visual language.
- Enforce **white background** web experience.
- Use **no sidebar** on desktop web; navigation remains top-oriented.

## Constraints
- Keep existing backend contracts and query keys.
- Preserve route destinations and screen ownership.
- Use `useColors()` + theme tokens only.
- Keep native iOS/Android behavior unchanged.

## Information Architecture

### Global Web Shell
- Sticky top navigation bar with compact actions.
- Unified max-width content container.
- Consistent section spacing and card rhythm.

### Discover
- Hero strip for high-signal featured items.
- Horizontal quick category chips.
- Rails: Near You, Trending/Recommended, Upcoming.
- Communities strip for lightweight browsing.

### Calendar
- Desktop split layout: calendar matrix + upcoming stack.
- Tablet/mobile web collapse to single-column flow.
- Keep event-dot and civic reminder logic intact.

### Community
- Search-first directory layout.
- Horizontal category chip filters.
- Dense but readable list cards.
- Council context remains visible.

### Perks
- Value-first perks cards.
- Clear ordering: value → eligibility → action.
- Keep redemption flows unchanged.

### Profile
- Summary header + stats strip.
- Grouped content cards for saved/joined/tickets/settings.
- Cleaner spacing hierarchy for web readability.

## Visual System
- White first surfaces with subtle border/elevation hierarchy.
- Image-first cards with compact metadata rows.
- Strong section headers and right-aligned "See all" actions.
- Lightweight motion only (hover/press feedback).

## Out of Scope
- No new backend endpoints.
- No major native redesign.
- No feature logic rewrites.

## Success Criteria
- Web tabs feel visually unified and modern.
- No desktop sidebar appears.
- White background baseline across web tabs.
- Typecheck + lint pass with no new errors.
