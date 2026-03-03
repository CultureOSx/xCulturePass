# CulturePass AU — CLAUDE.md

Project guide for AI agents and engineers. Read this before touching code.

---

## Project Overview

Cross-platform lifestyle/community platform for cultural diaspora communities (AU, NZ, UAE, UK, CA).
**Stack**: Expo 54 + React Native 0.84 + Expo Router 5 + Firebase (Auth + Firestore + Cloud Functions + Storage).
**Current date context**: Refer to `currentDate` in system prompt for today's date.

---

## Architecture

```
app/                    Expo Router screens (96 routes)
  (onboarding)/         Login, signup, location, interests, culture-match
  (tabs)/               5-tab layout: Discover, Calendar, Community, Perks, Profile
  event/[id].tsx        Event detail
  profile/, tickets/    User profile, ticket management
  admin/, dashboard/    Admin + organizer panels

components/
  ui/                   Button, Card, Badge, Input, Avatar, Checkbox, Skeleton, SocialButton
  Discover/             EventCard, WebHeroCarousel, WebRailSection, SpotlightCard, CityCard
  web/WebSidebar.tsx    Left sidebar navigation (desktop web, 240px)
  perks/, scanner/      Feature-specific component bundles
  ErrorBoundary.tsx     Wrap every screen with async data in this

constants/
  theme.ts              SINGLE IMPORT POINT — re-exports colors, spacing, typography, elevation
  colors.ts             CultureTokens, light/dark themes, shadows, glass, gradients, neon
  typography.ts         Poppins scale + desktop overrides
  spacing.ts            4-point grid, Breakpoints, Layout

hooks/
  useColors.ts          Theme-aware color access (dark = default on native, light = web)
  useLayout.ts          Responsive layout values: isDesktop, numColumns, hPad, sidebarWidth, columnWidth()
  useRole.ts            Role checking: isOrganizer, isAdmin, hasMinRole()
  useProfile.ts         User profile loading with React Query

lib/
  api.ts                Typed API client — ONLY way to call the backend
  auth.tsx              Firebase Auth provider + useAuth() hook
  firebase.ts           Firebase SDK init (platform-aware: AsyncStorage on native, localStorage on web)
  query-client.ts       TanStack React Query setup + apiRequest()

contexts/
  OnboardingContext     city, country, interests, isComplete — synced from auth user on login
  SavedContext          saved events, joined communities (local + API)
  ContactsContext       user contacts directory

shared/schema.ts        Shared TypeScript types (EventData, User, Ticket, Profile…)
shared/schema/          Individual schema files per domain (event.ts, user.ts, ticket.ts…)

functions/src/
  app.ts                90+ Express API routes
  admin.ts              Firebase Admin SDK singleton
  middleware/auth.ts    Firebase ID token verification + role guards
  middleware/moderation.ts  Content moderation (bad words, suspicious links)
  services/
    firestore.ts        Typed Firestore data service (usersService, eventsService…)
    search.ts           Weighted full-text + trigram search
    cache.ts            In-memory TTL cache (60s default)
    rollout.ts          Feature flag phased rollout
```

---

## Web Layout Architecture

### Desktop (≥ 1024px)
- **Left sidebar**: `components/web/WebSidebar.tsx` (240px fixed, collapsible)
- **No top bar**: The old 64px top nav bar is GONE — sidebar replaces it
- **Top inset**: `0` on all web layouts (no fixed nav at top)
- Content occupies `flex: 1` to the right of the sidebar

### Tablet (768–1023px) / Mobile Web
- **Bottom tab bar**: same as native mobile
- **Top inset**: `0` (safe area handled by `useSafeAreaInsets()`)

### Mobile Native (iOS / Android)
- **Bottom tab bar**: 84px with SF Symbols (iOS) / Ionicons (Android), glassmorphism blur on iOS
- **Top inset**: `useSafeAreaInsets().top` for notch/island handling

### Layout Hook
```typescript
const { isDesktop, isTablet, isMobile, numColumns, hPad, sidebarWidth, columnWidth, contentWidth } = useLayout();
```

**sidebarWidth**: 240 on desktop web, 0 elsewhere. Use when computing absolute widths.

**CRITICAL**: Never hardcode `topInset = Platform.OS === 'web' ? 67 : insets.top`.
Use: `const topInset = Platform.OS === 'web' ? 0 : insets.top;`

---

## Essential Rules

### NEVER Do
- Call `useAuth()`, `useColors()`, or any hook outside a React component — they are hooks, not utilities.
- Use `any` type — always type properly; use `Record<string, unknown>` + explicit casts or type narrowing.
- Hardcode hex colors, spacing numbers, or font sizes in components — use `useColors()`, `Spacing`, `TextStyles`, `CardTokens`, etc.
- Write `<Pressable><Text>button</Text></Pressable>` — always use `<Button>` from `components/ui`.
- Import from individual `constants/*.ts` files in screens — always import from `constants/theme` (the master re-export).
- Add duplicate routes to `functions/src/app.ts` — check the file first for existing patterns before adding a new route.
- Hardcode `topInset = Platform.OS === 'web' ? 67 : insets.top` — this was the old top-bar value. Web top inset is `0`.
- Use raw `fetch()` for API calls — always use `api.*` from `lib/api.ts`.
- Directly import Firebase SDK in screens — use the typed helpers in `lib/api.ts` and `lib/auth.tsx`.
- Create ad-hoc StyleSheet objects inside render functions — use `StyleSheet.create()` at module level.
- Use `console.log` in production code — use `if (__DEV__)` guards.
- Commit API keys, Stripe keys, or `.env` files — use `EXPO_PUBLIC_*` vars baked in at build time.
- Use `AsyncStorage` directly for auth tokens — `lib/query-client.ts` `setAccessToken()` handles this.

### ALWAYS Do
- Use `api.*` from `lib/api.ts` for all backend calls.
- Use `useLayout()` for all responsive values (padding, columns, breakpoints, sidebarWidth).
- Use `useColors()` for theme-aware colors — never hardcode hex in JSX.
- Wrap new screens with async data in `<ErrorBoundary>`.
- Handle 401 errors with `ApiError.isUnauthorized()` — redirect to login.
- Use `useQuery` / `useMutation` from TanStack React Query for all server state.
- Use `useSafeAreaInsets()` for native bottom/top insets; web top inset is always `0`.
- Use `Haptics.*` (from `expo-haptics`) for tactile feedback on interactive elements (iOS/Android only).
- Use `Image` from `expo-image` (not `react-native`) for all image rendering — it has better caching.
- Test on all three platforms: iOS, Android, web — use `Platform.OS` guards when behaviour differs.
- Use `Platform.select()` or `.native.tsx` / `.web.tsx` file suffixes for large platform divergences.
- Check `isOrganizer` / `isAdmin` from `useRole()` before rendering sensitive UI.
- Add `accessibilityLabel` and `accessibilityRole` to all interactive elements.
- Run `npm run typecheck` and `npm run lint` before committing.

---

## Design Token System

### Core Brand Tokens
```typescript
import { CultureTokens } from '@/constants/theme';

CultureTokens.indigo   // #2C2A72 — Culture Indigo (primary brand CTA)
CultureTokens.saffron  // #FF8C42 — Festival Saffron (warm discovery)
CultureTokens.coral    // #FF5E5B — Movement Coral (action energy)
CultureTokens.gold     // #FFC857 — Temple Gold (cultural premium)
CultureTokens.teal     // #2EC4B6 — Ocean Teal (global belonging)
```

### Functional Category Tokens
```typescript
CultureTokens.event      // Saffron — event listing
CultureTokens.artist     // Coral — artist profiles
CultureTokens.venue      // Teal — venues
CultureTokens.movie      // Gold — movies
CultureTokens.community  // Bright Blue — communities
```

### Component Tokens
```typescript
import { ButtonTokens, CardTokens, InputTokens, ChipTokens, AvatarTokens, TabBarTokens } from '@/constants/theme';

ButtonTokens.height.md    // 52 (Apple minimum touch target)
ButtonTokens.radius       // 16
CardTokens.radius         // 16
CardTokens.padding        // 16
InputTokens.height        // 48
AvatarTokens.size.md      // 40
TabBarTokens.heightMobile // 84 (includes safe area)
```

### Theme Colors
```typescript
import { useColors } from '@/hooks/useColors';

const colors = useColors();
// colors.background, colors.surface, colors.surfaceElevated
// colors.text, colors.textSecondary, colors.textTertiary
// colors.primary, colors.secondary, colors.accent, colors.gold
// colors.success, colors.warning, colors.error, colors.info
// colors.border, colors.borderLight, colors.divider
// colors.primaryGlow  // subtle background tint of primary color
```

Dark mode is the **default experience** (night festival aesthetic) on native.
Web uses light mode (`useColors()` always returns `light` theme on web).

### Gradients
```typescript
import { gradients } from '@/constants/theme';

gradients.culturepassBrand  // [Indigo, Saffron, Coral] — hero banners, CTAs
gradients.primary           // [Indigo, Blue] — tab bar active pill
gradients.aurora            // light blue/purple — backgrounds
gradients.sunset            // warm orange/coral — event cards
gradients.midnight          // deep indigo — dark backgrounds
```

### Neon (Use Sparingly)
```typescript
import { neon } from '@/constants/theme';

neon.blue, neon.purple, neon.teal  // focused/active states only
```

**Full token docs**: `docs/DESIGN_TOKENS.md`

---

## Responsive Layout Patterns

### Breakpoints
```typescript
import { Breakpoints } from '@/constants/theme';

Breakpoints.tablet   // 768px — tablet cutoff
Breakpoints.desktop  // 1024px — desktop cutoff (sidebar appears)
Breakpoints.wide     // 1280px — wide screen
```

### Grid Pattern (Screens)
```typescript
const { numColumns, hPad, columnWidth, isDesktop, sidebarWidth } = useLayout();

// Event grid
<View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: hPad, gap: 14 }}>
  {events.map(event => (
    <View key={event.id} style={{ width: columnWidth() }}>
      <EventCard event={event} />
    </View>
  ))}
</View>
```

### Web Top Inset Pattern (Correct)
```typescript
// In any screen component:
const insets = useSafeAreaInsets();
const topInset = Platform.OS === 'web' ? 0 : insets.top;  // ← Always 0 on web
```

---

## Routing & Navigation

### File-Based Routes (Expo Router)
All routes are defined by file paths. New screens must be registered in `app/_layout.tsx`'s Stack.

### Navigating
```typescript
import { router } from 'expo-router';

router.push('/event/abc123');
router.replace('/(onboarding)/location');
router.back();

// Typed push with params:
router.push({ pathname: '/profile/[id]', params: { id: profile.id } });
```

### Route Guards
- `AuthGuard` component wraps protected screens
- `useRole()` provides `isOrganizer`, `isAdmin`, `hasMinRole(role)`
- Redirects to `/(onboarding)/login?redirectTo=/protected-route` on 401

---

## API Patterns

### Data Fetching (React Query)
```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';

// Query
const { data: events, isLoading, error } = useQuery({
  queryKey: ['/api/events', city, country],
  queryFn: () => api.events.list({ city, country, pageSize: 50 }),
});

// Mutation
const { mutate: purchaseTicket } = useMutation({
  mutationFn: (data: PurchaseData) => api.tickets.purchase(data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/tickets'] }),
  onError: (err) => {
    if (err instanceof ApiError && err.isUnauthorized()) router.push('/login');
  },
});
```

### Error Handling
```typescript
import { ApiError } from '@/lib/api';

try {
  await api.events.create(data);
} catch (err) {
  if (err instanceof ApiError) {
    if (err.isUnauthorized()) return router.push('/(onboarding)/login');
    if (err.isNotFound()) return setError('Event not found.');
    if (err.status === 429) return setError('Too many requests. Please slow down.');
    setError(err.message);
  }
}
```

### Cache Invalidation
```typescript
import { queryClient } from '@/lib/query-client';

// After mutation, invalidate affected queries:
queryClient.invalidateQueries({ queryKey: ['/api/events'] });
queryClient.invalidateQueries({ queryKey: [`/api/tickets/${userId}`] });
```

---

## Authentication

### useAuth() Hook
```typescript
const { isAuthenticated, userId, user, accessToken, logout, hasRole } = useAuth();

// Check role:
if (!hasRole('organizer', 'admin')) return null;

// User shape:
user.id, user.username, user.email, user.role
user.city, user.country, user.subscriptionTier
user.isSydneyVerified, user.interests, user.communities
```

### Auth Flow
1. Firebase Auth (`firebase/auth`) handles login/signup/OAuth
2. `onAuthStateChanged` → fires on every auth state change
3. `api.auth.me()` → fetches full user profile from Cloud Functions
4. Token stored in query-client module store via `setAccessToken()`
5. `DataSync` component syncs `city`/`country` → `OnboardingContext`

### Social Sign-In
- **Web**: Firebase `signInWithPopup(auth, new GoogleAuthProvider())`
- **iOS/Android**: `@react-native-google-signin/google-signin` → Firebase credential
- **Apple (iOS only)**: `expo-apple-authentication` → `OAuthProvider('apple.com')` credential
- Configure `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in `.env` for native Google Sign-In

---

## State Management

| Concern | Solution |
|---------|----------|
| Server data | TanStack React Query (`useQuery`, `useMutation`) |
| Auth state | `AuthProvider` + `useAuth()` |
| Onboarding state | `OnboardingContext` (city, country, interests, isComplete) |
| Saved items | `SavedContext` (savedEvents, joinedCommunities) |
| Contacts | `ContactsContext` |
| UI state | `useState` / `useReducer` local to component |

---

## iOS-Specific Guidelines

- Always test on physical iOS device for: haptics, BlurView, SF Symbols, safe area insets
- Use `SymbolView` from `expo-symbols` for SF Symbols (iOS 16+); fall back to Ionicons
- `expo-haptics`: `selectionAsync()` for selection, `notificationAsync(Success/Error/Warning)` for feedback
- Minimum iOS target: 16.0 (set in `app.json` → `ios.minimumOsVersion`)
- BlurView intensity: 60–90 for frosted glass effect; wrap in `try/catch` on simulator
- Use `KeyboardAvoidingView` with `behavior="padding"` on iOS
- Apple Sign-In is **required** by App Store guidelines if you offer other social sign-in
- Push notifications: register FCM token via `expo-notifications` after login
- App Transport Security (ATS): all HTTP calls must go to HTTPS in production

---

## Android-Specific Guidelines

- Minimum SDK: 26 (Android 8.0), target SDK: 35 (set in `app.json`)
- `KeyboardAvoidingView` behavior: `"height"` on Android (not `"padding"`)
- `BlurView` not supported — use semi-transparent `rgba()` backgrounds instead
- Haptics: same `expo-haptics` API works on Android
- Google Sign-In: configure SHA-1 fingerprint in Firebase console for debug + release keystore
- `react-native-maps`: requires Google Maps API key (`EXPO_PUBLIC_GOOGLE_MAPS_KEY`)
- Status bar: use `expo-status-bar` with `style="light"` for dark backgrounds
- Edge-to-edge display: handle bottom navigation bar with `useSafeAreaInsets().bottom`

---

## Performance Guidelines

- **memoize** expensive computations: `useMemo(() => sortedEvents, [events, sortKey])`
- **memoize** callbacks passed to child components: `useCallback(() => handler, [deps])`
- **Lazy load** heavy screens with `React.lazy()` + `<Suspense>` on web
- **Image caching**: always use `expo-image` (not `react-native` `Image`) — it handles disk cache
- **List virtualization**: use `FlatList` with `keyExtractor` and `getItemLayout` for long lists
- **Avoid inline styles**: define `StyleSheet.create()` outside the component
- **React Compiler** is enabled (`babel-plugin-react-compiler`) — avoid manual `useMemo`/`useCallback` unless profiling shows a need
- **Bundle splitting**: `Platform.OS` guards tree-shake platform-specific code
- **Query stale time**: default is 0 (always refetch on mount) — set `staleTime: 60_000` for stable data

---

## Security Guidelines

- **Never** put `STRIPE_SECRET_KEY` or other server secrets in `EXPO_PUBLIC_*` vars — they're bundled
- **Input validation**: use `zod` for all user-controlled input before sending to API
- **XSS**: avoid `dangerouslySetInnerHTML` — use React Native `Text` which is XSS-safe
- **Deep links**: validate `redirectTo` params — only allow internal routes (`/` prefix, no `://`)
- **Image uploads**: validate MIME type + size on both client and server (Sharp processes server-side)
- **Rate limiting**: API has 90 req/min global, 12 req/min for targeted notifications
- **Firestore rules**: `firestore.rules` enforces ownership — never bypass via Admin SDK on client
- **Token storage**: Firebase ID tokens only stored in memory + `AsyncStorage` — not `SecureStore` (short-lived, auto-refresh)
- **Role checks**: always use server-side role guards (`requireRole()` middleware) — client UI checks are for UX only

---

## Testing

```bash
npm run test:unit          # Service + middleware unit tests
npm run test:integration   # API route integration tests (requires running server)
npm run test:e2e:smoke     # Critical path smoke tests
npm run qa:all             # All of the above + package.json validation
npm run typecheck          # TypeScript type check (no emits)
npm run lint               # ESLint check
npm run lint:fix           # ESLint auto-fix
```

### Testing Patterns
- Unit tests live in `__tests__/` subdirectories or `*.test.ts` siblings
- Use `@testing-library/react-native` for component tests
- Mock `lib/api.ts` at the module level for unit tests
- Integration tests run against the local Firebase emulator
- Don't test implementation details — test user-visible behavior

---

## Environment Variables

```bash
# Firebase (client SDK — baked into bundle at build time via EXPO_PUBLIC_*)
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=

# API base URL
EXPO_PUBLIC_API_URL=https://us-central1-YOUR_PROJECT.cloudfunctions.net/api/

# Social Auth
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=     # Google Sign-In web client ID (for native OAuth)
EXPO_PUBLIC_GOOGLE_MAPS_KEY=          # Google Maps API key (Android)

# Stripe (Cloud Functions ONLY — never in Expo bundle)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY_ID=price_...
STRIPE_PRICE_YEARLY_ID=price_...
```

Mirror all `EXPO_PUBLIC_*` vars in `eas.json` under `build.*.env` for EAS builds.

---

## Local Development

```bash
# Install
npm install
cd functions && npm install && cd ..

# Start Expo (native + web)
npx expo start

# Start web only
npx expo start --web

# Start Cloud Functions emulator
firebase emulators:start --only functions,firestore,auth,storage

# Type check (no output files)
npm run typecheck

# Lint
npm run lint
```

Set `EXPO_PUBLIC_API_URL=http://localhost:5001/YOUR_PROJECT/us-central1/api/` when using the emulator.

---

## Building & Deploying

### iOS (App Store)
```bash
# 1. Bump version in app.json (version + ios.buildNumber)
eas build --platform ios --profile production
eas submit --platform ios
```

### Android (Google Play)
```bash
# 1. Bump version in app.json (version + android.versionCode)
eas build --platform android --profile production
eas submit --platform android
```

### Web (Firebase Hosting)
```bash
npm run build-web   # expo export --platform web → dist/
npm run deploy-web  # build-web + firebase deploy --only hosting
```

### Cloud Functions
```bash
cd functions && npm run build  # TypeScript → lib/
cd .. && firebase deploy --only functions
```

**Deploy order**: functions FIRST, then app — never the reverse when adding new endpoints.

---

## Firestore Data Model

```
users/{uid}
  username, displayName, email, city, country
  role: 'user' | 'organizer' | 'moderator' | 'admin' | 'cityAdmin' | 'platformAdmin'
  membership: { tier, expiresAt }
  stripeCustomerId, stripeSubscriptionId
  isSydneyVerified, interests[], culturePassId
  createdAt, updatedAt

events/{eventId}
  title, description, venue, address, date, time, city, country
  imageUrl, cultureTag[], tags[], category
  priceCents, tiers[], isFree, isFeatured
  organizerId, capacity, attending
  status: 'draft' | 'published' | 'cancelled'
  deletedAt (soft delete), publishedAt
  cpid (CP-EVT-xxx), geoHash

tickets/{ticketId}
  eventId, userId, status, paymentStatus
  qrCode, cpTicketId, priceCents
  cashbackCents, rewardPoints
  history[]: { action, timestamp, actorId }

profiles/{profileId}
  entityType: 'community' | 'business' | 'venue' | 'artist' | 'organisation'
  name, description, imageUrl, city, country
  ownerId, isVerified, rating
  socialLinks: { website, instagram, facebook, twitter }
```

### Security Rules
See `firestore.rules`:
- Users can read/write their own `users/{uid}` doc
- Events: anyone can read published; only organizer/admin can write
- Tickets: owner can read; Cloud Functions (Admin SDK) write — bypasses client rules
- Profiles: public read; owner + admin write

---

## Known Gaps (Production Readiness Checklist)

- [x] Stripe real payment flow — subscription checkout, webhook handler, cancel → Firestore
- [x] Profiles/communities routes → `profilesService` (Firestore)
- [x] Custom Firebase claims — tier synced on subscribe/cancel
- [x] `api.membership.*` — subscribe, get, cancel, memberCount
- [x] WebSidebar integrated into desktop tab layout
- [x] Google Sign-In wired on iOS/Android (native Google SDK + Firebase credential)
- [x] Apple Sign-In wired on iOS (expo-apple-authentication + Firebase OAuthProvider)
- [x] Social sign-in on signup screen (Google + Apple)
- [ ] Migrate remaining in-memory Maps (wallets, notifications, perks, tickets) → Firestore
- [ ] Push notifications (FCM token registration + notification handler)
- [ ] Offline mutation queue (AsyncStorage → sync on reconnect)
- [ ] Geolocation filtering (geoHash stored, not queried yet)
- [ ] Analytics (PostHog / Firebase Analytics)
- [ ] Error monitoring (Sentry)
- [ ] Deep link testing (Universal Links on iOS, App Links on Android)
- [ ] App Store screenshots and metadata
- [ ] WCAG accessibility audit
