# SKILL.md — Recreate CulturePass from Scratch

> A complete blueprint for rebuilding CulturePassAU: architecture decisions, tech choices,
> data models, API design, and implementation order. Written for an AI agent or senior engineer.

---

## What This App Is

CulturePass is a cross-platform lifestyle/community platform for cultural diaspora communities
in Australia. It has five core features:

1. **Discover** — Browse and search cultural events by city, category, and date
2. **Calendar** — Personal event calendar with city-filtered upcoming events
3. **Community** — Join and browse diaspora community groups
4. **Perks** — Exclusive discounts/rewards for cultural businesses
5. **Profile** — User account, membership tier, wallet, tickets, QR identity card

It runs on iOS, Android, and Web from a single React Native codebase.

---

## Tech Stack (exact versions)

| Layer | Technology | Version |
|-------|-----------|---------|
| UI Framework | React Native (via Expo) | 0.81 |
| Expo SDK | Expo | 55 |
| Router | Expo Router | 6 |
| Auth | Firebase Auth | 11.x (JS SDK v9) |
| Database | Cloud Firestore | 11.x (JS SDK v9) |
| Storage | Firebase Storage | 11.x |
| Backend | Firebase Cloud Functions (Node 22) | — |
| Backend Framework | Express | 4.x |
| API Client | Custom typed wrapper around `fetch` | — |
| Server State | TanStack React Query | 5.x |
| Animations | React Native Reanimated | 3.x |
| Payments | Stripe | stripe-js + stripe node |
| Typography | Poppins (Google Fonts via expo-font) | — |
| Icons | Ionicons + SF Symbols (expo-symbols) | — |
| Blur | expo-blur (BlurView) | — |
| Haptics | expo-haptics | — |
| Location | expo-location | — |
| Image | expo-image | — |
| QR | expo-camera (CameraView) | — |
| Secure storage | expo-secure-store | — |

---

## Repository Structure

```
app/                      Expo Router file-based screens
  _layout.tsx             Root layout: fonts, providers, auth guard
  (onboarding)/
    _layout.tsx           Redirect completed-onboarding users to Discovery
    login.tsx             Email sign-in
    signup.tsx            Account creation
    location.tsx          City/state selection (step 1 of 3)
    communities.tsx       Community interest selection (step 2)
    interests.tsx         Cultural interest tags (step 3)
  (tabs)/
    _layout.tsx           Custom floating tab bar (BlurView iOS)
    index.tsx             Discover screen (events + communities)
    calendar.tsx          Calendar with event dots
    communities.tsx       Community browser
    perks.tsx             Perks/rewards browser
    profile.tsx           User profile, wallet, membership
  event/[id].tsx          Event detail + ticket purchase
  community/[id].tsx      Community detail page
  allevents.tsx           Full event list with filters
  search/index.tsx        Search events + communities
  scanner.tsx             QR ticket scanner (organizer tool)
  tickets/
    index.tsx             User's ticket list
    [id].tsx              Individual ticket + QR code
  profile/
    edit.tsx              Edit profile form
    qr.tsx                CulturePass ID card (QR)
  payment/
    wallet.tsx            Wallet balance + top-up
    methods.tsx           Payment methods management
    transactions.tsx      Transaction history
  membership/
    upgrade.tsx           CulturePass+ upgrade screen
  saved/index.tsx         Saved events
  settings/index.tsx      App settings
  legal/
    terms.tsx             Terms of Service
    privacy.tsx           Privacy Policy
    cookies.tsx           Cookie Policy
    guidelines.tsx        Community Guidelines

components/
  ui/
    Button.tsx            Primary UI button (never use raw Pressable)
    Card.tsx              Base card component
    Badge.tsx             Status/category badge
    Input.tsx             Animated text input with icons
  EventCard.tsx           Memoized event list item
  LocationPicker.tsx      State → City two-step modal picker
  HomeLogoButton.tsx      "CP" logo → navigate to Discover
  ErrorBoundary.tsx       React error boundary

constants/
  colors.ts               Cultural brand tokens, light + dark themes, gradients, neons
  theme.ts                Master re-export + component tokens (CultureTokens, ButtonTokens, CardTokens)
  typography.ts           Poppins scale with desktop overrides
  spacing.ts              4-point grid, breakpoints, radius
  locations.ts            Australian states + cities (static fallback)

hooks/
  useColors.ts            Theme-aware color access
  useLayout.ts            Responsive layout values
  useLocations.ts         React Query hook for Firestore locations
  useNearestCity.ts       GPS detect → nearest city from list

contexts/
  OnboardingContext.tsx   User location + preference state
  SavedContext.tsx        Saved events state + persistence
  ContactsContext.tsx     Contacts/connections state

lib/
  api.ts                  Fully-typed API client (namespace pattern)
  auth.tsx                Firebase Auth provider + useAuth() hook
  firebase.ts             Firebase client SDK init (platform-aware)
  query-client.ts         TanStack React Query setup + apiRequest()
  config.ts               Env var reading + validation

shared/
  schema.ts               Shared TypeScript types (EventData, User, Ticket…)

functions/src/            Firebase Cloud Functions
  app.ts                  Express app (90+ routes)
  admin.ts                Firebase Admin SDK singleton
  middleware/
    auth.ts               authenticate, requireAuth, requireRole
    moderation.ts         Content moderation helpers
  services/
    firestore.ts          Typed Firestore services (events, users, profiles, tickets, wallets, notifications)
    locations.ts          Location hierarchy service (Firestore-backed)
    cache.ts              InMemoryTtlCache (swap for Redis later)
    search.ts             Weighted full-text + trigram search
    rollout.ts            Feature flag phased rollout
```

---

## 🎨 Design Token System

CulturePass uses a **comprehensive, theme-aware UI Token System** for cultural authenticity, consistency, and cross-platform harmony.

### 1. Core Brand Tokens

Five core colors define the CulturePass identity — never hardcode these values:

```typescript
import { CultureTokens } from '@/constants/theme';

CultureTokens.indigo      // #2C2A72 — Culture Indigo (primary brand)
CultureTokens.saffron    // #FF8C42 — Festival Saffron (warm discovery)
CultureTokens.coral      // #FF5E5B — Movement Coral (action energy)
CultureTokens.gold       // #FFC857 — Temple Gold (cultural premium)
CultureTokens.teal       // #2EC4B6 — Ocean Teal (global belonging)
```

**Design Philosophy**: These colors create a "night festival feeling" (dark mode first) instead of a tech-startup vibe.

### 2. Functional Tokens (Category-Specific)

Use brand tokens to color-code content categories across filtering, cards, and UI:

```typescript
CultureTokens.event       // #FF8C42 (Saffron) — Events
CultureTokens.eventSoft   // #FFE1CC — Event background tint

CultureTokens.artist      // #FF5E5B (Coral) — Artists
CultureTokens.artistSoft  // #FFD6D5 — Artist tint

CultureTokens.venue       // #2EC4B6 (Teal) — Venues
CultureTokens.venueSoft   // #D7F5F1 — Venue tint

CultureTokens.movie       // #FFC857 (Gold) — Movies
CultureTokens.movieSoft   // #FFF3CC — Movie tint

CultureTokens.community   // #3A86FF (Blue) — Community
CultureTokens.communitySoft // #DCE8FF — Community tint
```

### 3. Dark Mode Palette (Default)

CulturePass operates in dark mode by default for the night festival aesthetic:

```typescript
--cp-bg-primary:      #0B0B14  // Deep Space — page backgrounds
--cp-bg-secondary:    #1B0F2E  // Midnight Plum — secondary surfaces
--cp-bg-surface:      #22203A  // Rich Purple — card backgrounds
--cp-bg-elevated:     #2C2A72  // Culture Indigo — active/interactive surfaces

--cp-text-primary:    #FFFFFF
--cp-text-secondary:  #C9C9D6
--cp-text-muted:      #8D8D8D
--cp-text-on-accent:  #0B0B14  // Text on colored backgrounds
```

### 4. Light Mode Palette (Optional)

```typescript
--cp-bg-primary-light:   #F4EDE4  // Warm beige background
--cp-bg-secondary-light: #FFFFFF  // White surfaces
--cp-bg-surface-light:   #FFF8F0  // Off-white cards
--cp-bg-elevated-light:  #E6D3B3  // Tan active surfaces

--cp-text-primary-light:   #1B0F2E
--cp-text-secondary-light: #4A4A4A
--cp-text-muted-light:     #8D8D8D
```

### 5. Status Tokens

```typescript
CultureTokens.success    // #2EC4B6 (Teal) — Successful actions, confirmed
CultureTokens.warning    // #FFC857 (Gold) — Warnings, pending states
CultureTokens.error      // #FF5E5B (Coral) — Errors, cancellations
CultureTokens.info       // #3A86FF (Blue) — Information, notifications
```

### 6. Component Tokens

Consistent sizing across all UI components — never hardcode component sizes:

```typescript
import { ButtonTokens, CardTokens, InputTokens, ChipTokens, AvatarTokens } from '@/constants/theme';

// Button sizes (minimum 44px for Apple accessibility)
ButtonTokens.height       // sm: 36, md: 44, lg: 52
ButtonTokens.radius       // 12

// Card styling
CardTokens.radius         // 16
CardTokens.padding        // 14 (standard), 18 (large)
CardTokens.imageHeight    // mobile: 120, tablet: 140, desktop: 160

// Input sizing
InputTokens.height        // 48
InputTokens.radius        // 12

// Chips (filter pills)
ChipTokens.height         // 36
ChipTokens.radius         // 50 (pill-shaped)

// Avatars
AvatarTokens.size        // xs: 24, sm: 32, md: 40, lg: 56, xl: 72, xxl: 96
AvatarTokens.radius      // 9999 (always circular)
```

### 7. Signature Gradient

Use for hero banners, onboarding screens, and flagship CTAs:

```typescript
import { gradients } from '@/constants/theme';

gradients.culturepassBrand  // [#2C2A72, #FF8C42, #FF5E5B]
// Indigo → Saffron → Coral (135° angle)
```

### 8. Usage Rules (Critical)

**✓ Always:**
```typescript
// Correct — use hook for theme colors
import { useColors } from '@/hooks/useColors';
const colors = useColors();
<View style={{ backgroundColor: colors.background }} />

// Correct — use tokens for brand colors
<Text style={{ color: CultureTokens.indigo }}>Brand Text</Text>

// Correct — use component tokens for sizing
<View style={{ borderRadius: CardTokens.radius }} />
```

**❌ Never:**
```typescript
// Wrong — hardcoded colors
<View style={{ backgroundColor: '#0B0B14' }} />

// Wrong — hardcoded sizes
<Button style={{ height: 44 }} />

// Wrong — mixed theme imports
import { dark } from '@/constants/colors';
```

### 9. Import Pattern

All tokens are re-exported through a single surface:

```typescript
// ✓ Always import from theme.ts
import {
  Colors,
  CultureTokens,
  ButtonTokens,
  CardTokens,
  InputTokens,
  ChipTokens,
  AvatarTokens,
  gradients,
} from '@/constants/theme';

// ✓ Use hook for theme-aware access
import { useColors } from '@/hooks/useColors';
```

### 10. Reference Documentation

Full design token documentation with contrast ratios, usage examples, and implementation roadmap:
→ **[docs/DESIGN_TOKENS.md](./docs/DESIGN_TOKENS.md)**

---

## Data Models (Firestore)

### `users/{uid}`
```typescript
{
  uid: string;
  username: string;
  displayName: string;
  email: string;
  city: string;           // matches locations list
  country: string;        // "Australia"
  role: 'user' | 'organizer' | 'moderator' | 'admin';
  membership: {
    tier: 'free' | 'plus' | 'elite';
    isActive: boolean;
    expiresAt: string | null;  // ISO
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  };
  interests: string[];
  communities: string[];
  isSydneyVerified: boolean;
  culturePassId: string;  // CP-USR-XXXX
  avatarUrl?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}
```

### `events/{eventId}`
```typescript
{
  id: string;
  cpid: string;           // CP-EVT-XXXX
  title: string;
  description: string;
  venue: string;
  address?: string;
  date: string;           // YYYY-MM-DD
  time: string;           // HH:MM
  endTime?: string;
  city: string;
  country: string;
  imageUrl: string;
  cultureTag: string[];   // ['Chinese', 'Indian', 'African', ...]
  tags: string[];
  category: string;       // 'festival' | 'concert' | 'food' | ...
  priceCents: number;     // 0 = free
  tiers: EventTier[];
  isFree: boolean;
  isFeatured: boolean;
  organizerId: string;
  capacity: number;
  attending: number;      // FieldValue.increment on ticket purchase
  publishedAt?: string;
  deletedAt?: string;     // soft delete
  geoHash?: string;
  createdAt: string;
  updatedAt: string;
}
```

### `tickets/{ticketId}`
```typescript
{
  id: string;
  cpTicketId: string;     // CP-TKT-XXXX
  eventId: string;
  userId: string;
  tierName: string;
  quantity: number;
  totalPriceCents: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'used';
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  qrCode: string;         // unique random token
  cashbackCents?: number;
  cashbackCreditedAt?: string;
  rewardPointsEarned?: number;
  rewardPointsAwardedAt?: string;
  history: { at: string; status: string; note?: string }[];
  createdAt: string;
  updatedAt: string;
}
```

### `profiles/{profileId}`
```typescript
{
  id: string;
  entityType: 'community' | 'business' | 'venue' | 'artist';
  name: string;
  description: string;
  imageUrl?: string;
  city: string;
  country: string;
  ownerId: string;
  verified: boolean;
  rating?: number;
  memberCount?: number;
  tags?: string[];
  website?: string;
  contactEmail?: string;
  createdAt: string;
  updatedAt: string;
}
```

### `locations/{countryCode}`
```typescript
{
  name: string;            // "Australia"
  countryCode: string;     // "AU"
  acknowledgement: string; // Acknowledgement of Country text
  states: {
    name: string;          // "New South Wales"
    code: string;          // "NSW"
    emoji: string;         // "🏙️"
    cities: string[];      // ["Sydney", "Parramatta", ...]
  }[];
  updatedAt: string;
}
```

---

## Design Token System

CulturePass uses a **comprehensive UI Token System** for consistency, theming, and cultural authenticity.

### Core Brand Tokens

```css
--cp-brand-primary: #2C2A72;   /* Culture Indigo */
--cp-brand-secondary: #FF8C42; /* Festival Saffron */
--cp-brand-accent: #FF5E5B;    /* Movement Coral */
--cp-brand-highlight: #FFC857; /* Temple Gold */
--cp-brand-global: #2EC4B6;    /* Ocean Teal */
```

### Dark Mode (Default)

```css
--cp-bg-primary: #0B0B14;      /* Deep Space */
--cp-bg-secondary: #1B0F2E;    /* Midnight Plum */
--cp-bg-surface: #22203A;      /* Cards */
--cp-bg-elevated: #2C2A72;     /* Active surfaces */
--cp-text-primary: #FFFFFF;
--cp-text-secondary: #C9C9D6;
--cp-text-muted: #8D8D8D;
```

### Functional Tokens (Category-Specific)

| Category | Color | Soft Variant |
|----------|-------|--------------|
| **Events** | `#FF8C42` (Saffron) | `#FFE1CC` |
| **Artists** | `#FF5E5B` (Coral) | `#FFD6D5` |
| **Venues** | `#2EC4B6` (Teal) | `#D7F5F1` |
| **Movies** | `#FFC857` (Gold) | `#FFF3CC` |
| **Community** | `#3A86FF` (Blue) | `#DCE8FF` |

### Status Tokens

```css
--cp-success: #2EC4B6;    /* Teal */
--cp-warning: #FFC857;    /* Gold */
--cp-error: #FF5E5B;      /* Coral */
--cp-info: #3A86FF;       /* Blue */
```

### Signature Gradient (Hero Banners, CTAs, Onboarding)

```css
linear-gradient(135deg, #2C2A72, #FF8C42, #FF5E5B)
```

### Usage

```typescript
import { CultureTokens, ButtonTokens, CardTokens } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';

// Brand-aware colors
const color = CultureTokens.saffron;  // Always #FF8C42

// Theme-aware colors (dark/light mode)
const colors = useColors();
const bg = colors.background;         // #0B0B14 (dark) or #F4EDE4 (light)

// Component sizing
const btnHeight = ButtonTokens.height.md;    // 44
const cardRadius = CardTokens.radius;        // 16
```

**Never hardcode colors.** See [docs/DESIGN_TOKENS.md](./docs/DESIGN_TOKENS.md) for full token system.

---

## API Design

### Namespace Pattern (lib/api.ts)
```typescript
const api = {
  auth: { me, register, updateProfile, deleteAccount },
  events: { list, get, create, update, delete, search, seed },
  tickets: { list, get, create, checkIn },
  communities: { list, get, create, update, join, leave },
  profiles: { list, get, create, update },
  membership: { get, subscribe, cancel, memberCount },
  wallet: { get, deposit, withdraw },
  payment: { methods, transactions, addMethod },
  perks: { list, redeem },
  notifications: { list, markRead, markAllRead },
  locations: { list, seed, addState, updateState, removeState, addCity, removeCity },
  discover: { feed },
  search: { query },
  saved: { list, save, unsave },
};
```

### Route Patterns (functions/src/app.ts)
- `GET /api/events` — public, paginated, filterable by city/country/category/date
- `GET /api/events/:id` — public event detail
- `POST /api/events` — requires `authenticate + requireRole('organizer')`
- `GET /api/auth/me` — requires `authenticate`
- `POST /api/stripe/webhook` — raw body, Stripe signature verified
- `GET /api/locations` — public, auto-seeds Firestore on first call
- `POST /api/admin/seed` — requires `SEED_SECRET` header

### Auth Middleware
```typescript
// Verifies Firebase ID token in Authorization: Bearer <token>
authenticate: (req, res, next) => { ... }
requireAuth: same as authenticate but 401 on missing token
requireRole('admin'): authenticate + check role claim
```

---

## Authentication Flow

```
1. User enters email + password
2. Firebase Auth: signInWithEmailAndPassword()
3. onAuthStateChanged fires → get ID token
4. Token stored module-level in lib/query-client.ts
5. Every apiRequest() call adds: Authorization: Bearer <token>
6. Backend verifyIdToken() → req.user = { uid, email, role }
7. Token auto-refreshed every 50 minutes
8. On sign-out: clear token, clear React Query cache, route to /(tabs) (Discovery)
```

---

## Stripe Payment Flow

```
Ticket Purchase:
1. POST /api/events/:id/checkout → creates Stripe Checkout Session
2. App opens session URL in WebBrowser
3. User pays on Stripe-hosted page
4. Stripe webhook fires: checkout.session.completed
5. Webhook verifies signature, marks idempotency in Firestore
6. Ticket status → confirmed, event attending ++
7. Cashback credited to wallet (if CulturePass+ member)
8. Reward points awarded

Subscription:
1. POST /api/membership/subscribe → Stripe Checkout (subscription mode)
2. Webhook: checkout.session.completed (mode=subscription) → tier → 'plus'
3. Firebase custom claims updated: { tier: 'plus' }
4. Client re-fetches auth token to pick up new claims
```

---

## Location Architecture

```
Static fallback (constants/locations.ts)
    ↓ used as placeholderData in React Query
    ↓ used as seed data for Firestore

Firestore (locations/AU document)
    ↓ GET /api/locations fetches + caches 30 min server-side
    ↓ useLocations() hook fetches + caches 1 hour client-side
    ↓ LocationPicker.tsx renders state → city two-step modal

GPS Detection (hooks/useNearestCity.ts)
    ↓ expo-location.requestForegroundPermissionsAsync()
    ↓ getCurrentPositionAsync (Accuracy.Balanced)
    ↓ reverseGeocodeAsync → { city, region, subregion }
    ↓ region → state code (REGION_TO_CODE map)
    ↓ fuzzy match city against citiesByState[stateCode]
    ↓ fallback to STATE_CAPITALS[stateCode]
    ↓ updateLocation('Australia', matchedCity)
```

---

## Build & Deploy Steps

### 1. Firebase Setup
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login and init
firebase login
firebase init

# Create .env from template
cp .env.example .env
# Fill in all EXPO_PUBLIC_FIREBASE_* values

# Deploy Firestore security rules
firebase deploy --only firestore:rules

# Deploy Cloud Functions
cd functions && npm install && npm run build && cd ..
firebase deploy --only functions

# Deploy web hosting
npx expo export --platform web
firebase deploy --only hosting
```

### 2. Expo / EAS Setup
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Create project (get UUID)
eas init
# Copy UUID into app.json → extra.eas.projectId

# Configure build profiles in eas.json (already done)
# Fill in Apple/Google credentials in eas.json → submit.production

# Build for iOS
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production

# Submit
eas submit --platform ios
eas submit --platform android
```

### 3. Environment Variables Required
```bash
# In .env (Expo/frontend)
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_API_URL=https://us-central1-PROJECT_ID.cloudfunctions.net/api/

# In functions/.env (Cloud Functions — never in Expo bundle)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY_ID=price_...
STRIPE_PRICE_YEARLY_ID=price_...
SEED_SECRET=any-random-string
```

---

## Implementation Order (for recreation)

### Phase 1 — Foundation (Days 1–3)
1. `npx create-expo-app --template blank-typescript`
2. Install all dependencies (see package.json)
3. Configure Expo Router (`app/_layout.tsx`)
4. Set up Firebase client SDK (`lib/firebase.ts`)
5. Create auth provider (`lib/auth.tsx`)
6. Create React Query client (`lib/query-client.ts`)
7. Create typed API client (`lib/api.ts`) — namespace skeleton
8. Create design system constants (`constants/colors.ts`, `spacing.ts`, `typography.ts`, `theme.ts`)
9. Load Poppins fonts in root layout
10. Create `useColors()` and `useLayout()` hooks

### Phase 2 — Auth + Onboarding (Days 4–6)
11. Firebase Auth project setup + Firestore rules
12. Login screen (`app/(onboarding)/login.tsx`)
13. Signup screen (`app/(onboarding)/signup.tsx`)
14. Location screen (`app/(onboarding)/location.tsx`)
15. Communities interest screen
16. Onboarding context (`contexts/OnboardingContext.tsx`)
17. Auth guard in root layout

### Phase 3 — Backend (Days 7–12)
18. Express app skeleton (`functions/src/app.ts`)
19. Firebase Admin SDK init (`functions/src/admin.ts`)
20. Auth middleware (`functions/src/middleware/auth.ts`)
21. Firestore typed services (`functions/src/services/firestore.ts`)
22. Events CRUD routes + search
23. Users routes
24. Location service + routes (`functions/src/services/locations.ts`)
25. Communities/profiles routes
26. Deploy to Cloud Functions emulator for local dev

### Phase 4 — Core Screens (Days 13–20)
27. Tab layout with custom floating tab bar (`app/(tabs)/_layout.tsx`)
28. Discover screen — events grid + hero carousel
29. Calendar screen — month view + event dots
30. Communities screen — profile list + search
31. Perks screen — perks list + redeem
32. Profile screen — user data + stats
33. Event detail screen (`app/event/[id].tsx`)
34. LocationPicker component (State → City two-step)

### Phase 5 — Payments (Days 21–25)
35. Stripe account + products setup
36. Checkout session route (Cloud Functions)
37. Stripe webhook handler + idempotency
38. Ticket system (creation, QR codes, check-in)
39. Wallet system (balance, transactions, cashback)
40. CulturePass+ membership upgrade screen

### Phase 6 — Polish + Production (Days 26–30)
41. GPS location detection (`hooks/useNearestCity.ts`)
42. QR scanner for organizers (`app/scanner.tsx`)
43. Search screen
44. Saved events
45. Settings screen
46. Legal screens (Terms, Privacy, Cookies, Guidelines)
47. HomeLogoButton on all non-Discover screens
48. Apple HIG: BlurView headers, SF Symbols, haptics
49. Scroll-reactive animated Discover header
50. Dark mode testing + fixes

### Phase 7 — Pre-Launch (Days 31–35)
51. Seed Firestore with real event data (`/api/admin/seed`)
52. TypeScript: `npm run typecheck` → 0 errors
53. Lint: `npm run lint` → 0 warnings
54. Functions build: `npm run functions:build` → 0 errors
55. App Store metadata (`docs/APP_STORE_LISTING.md`)
56. EAS production builds (iOS + Android)
57. Firebase Hosting deploy (web)
58. Submit to App Store + Google Play

---

## Critical Gotchas

1. **`useColors()` everywhere** — Never hardcode hex. All color must be theme-aware.
2. **`Colors.shadow.small` spreads** — Cannot use object spread in `StyleSheet.create()`. Apply shadow inline.
3. **`Array<T>` banned** — Use `T[]` form. ESLint rule enforced.
4. **`any` type banned** — Use `Record<string, unknown>` + explicit casts. ESLint rule enforced.
5. **`useAuth()` in modules** — Cannot call hooks outside React. Use module-level `_accessToken` in `query-client.ts`.
6. **Expo Router file naming** — `(group)` for layout groups, `[param]` for dynamic routes. No spaces in directory names.
7. **Firebase Admin vs Client SDK** — Admin SDK (`firebase-admin`) only in Cloud Functions. Client SDK in Expo app. Never mix.
8. **Stripe webhook raw body** — Must use `express.raw()` middleware (not `express.json()`) for the webhook route.
9. **Firestore `FieldValue.increment()`** — Import from `firebase-admin/firestore`, not from client SDK.
10. **SF Symbols type casting** — `expo-symbols` uses strict `SFSymbols7_0` type. Use `(symbolName) as never` to bypass.
11. **expo-location plugin in app.json** — Required for iOS permission config. Add to `plugins` array.
12. **`ParamsDictionary` in Express** — Installed `@types/express-serve-static-core` types `req.params` as `string | string[]`. Use `Request<{ paramName: string }>` generic for explicit route params.
13. **Firestore region** — Use `australia-southeast1` for data residency. Cloud Functions default to `us-central1`.
14. **EAS project UUID** — Required for EAS CLI v16+. Add to `app.json → extra.eas.projectId`.

---

## Known Future Work

| Feature | Priority | Notes |
|---------|----------|-------|
| Google/Apple Sign-In (native) | High | Buttons exist, auth flow not wired. Requires native build setup. |
| Push Notifications (FCM) | High | `expo-notifications` + FCM token registration needed |
| Offline mutation queue | Medium | AsyncStorage queue → sync on reconnect |
| Geolocation filtering | Medium | geoHash stored in events, not queried. Requires Firestore geo queries. |
| Analytics | Medium | PostHog or Firebase Analytics |
| Error monitoring | Medium | Sentry integration |
| Payment methods UI | Low | In-memory only. Needs Stripe PaymentMethod API integration. |
| Admin dashboard | Low | Web-only admin panel for organizers |
