# CulturePass AU — CLAUDE.md

Project guide for AI agents and engineers. Read this before touching code.

## Project Overview

Cross-platform lifestyle/community platform for cultural diaspora communities (AU, NZ, UAE, UK, CA).
**Stack**: Expo 54 + React Native 0.81 + Expo Router 6 + Firebase (Auth + Firestore + Cloud Functions + Storage).

---

## Architecture

```
app/               Expo Router screens (54+)
  (onboarding)/    Login, signup, location setup
  (tabs)/          5-tab layout: Discover, Calendar, Community, Perks, Profile
  event/[id].tsx   Event detail (large screen — ~2600 lines)
components/
  ui/              Button, Card, Badge — always use these, never raw Pressable+Text
  EventCard.tsx    Memoized event list item
  ErrorBoundary.tsx
constants/
  colors.ts        Cultural brand tokens, light + dark themes, shadows, glass, gradients, neon
  theme.ts         Master re-export + component tokens (CultureTokens, ButtonTokens, CardTokens…)
  typography.ts    Poppins scale with desktop overrides
  spacing.ts       4-point grid, breakpoints, radius
hooks/
  useColors.ts     Theme-aware color access
  useLayout.ts     Responsive layout values (isDesktop, numColumns, hPad…)
lib/
  api.ts           Typed API client — use this for all API calls
  auth.tsx         Firebase Auth provider + useAuth() hook
  firebase.ts      Firebase client SDK init (platform-aware persistence)
  query-client.ts  TanStack React Query setup + apiRequest()
contexts/          OnboardingContext, SavedContext, ContactsContext
shared/schema.ts   Shared TypeScript types (EventData, User, Ticket…)
functions/src/     Firebase Cloud Functions (Express app)
  app.ts           90+ API routes
  admin.ts         Firebase Admin SDK singleton
  middleware/      auth.ts (Firebase ID token), moderation.ts
  services/
    firestore.ts   Typed Firestore data service (eventsService, usersService…)
    search.ts      Weighted full-text + trigram search
    cache.ts       In-memory TTL cache
    rollout.ts     Feature flag phased rollout
```

---

## Essential Rules

### Never Do
- Call `useAuth()` outside a React component — use `setAccessToken` / module-level token store instead.
- Use `any` casts — always type properly; use `Record<string, unknown>` + explicit casts.
- Hardcode colors, spacing, or font sizes — use `useColors()`, `Spacing`, `TextStyles`.
- Write raw `Pressable` + `Text` buttons — use `<Button>` from `components/ui`.
- Import from individual `constants/` files in screens — import from `constants/theme`.
- Add duplicate routes to `app.ts` — check line 699+ for existing patterns.

### Always Do
- Use `api.*` from `lib/api.ts` for data fetching, not raw `fetch()`.
- Use `useLayout()` for responsive values (padding, columns, breakpoints).
- Use `useColors()` for theme-aware colors (never hardcode hex in components).
- Wrap new screens in `<ErrorBoundary>` if they have async data.
- Use `ApiError` from `lib/api.ts` to handle errors with status codes.

---

## Design Token System

CulturePass uses a comprehensive **UI Token System** for consistency, theming, and cultural authenticity.

### Core Brand Tokens

```typescript
import { CultureTokens } from '@/constants/theme';

CultureTokens.indigo      // #2C2A72 — Culture Indigo (primary brand)
CultureTokens.saffron    // #FF8C42 — Festival Saffron (warm discovery)
CultureTokens.coral      // #FF5E5B — Movement Coral (action energy)
CultureTokens.gold       // #FFC857 — Temple Gold (cultural premium)
CultureTokens.teal       // #2EC4B6 — Ocean Teal (global belonging)
```

### Functional Tokens (Category-Specific)

```typescript
CultureTokens.event       // Events — Saffron
CultureTokens.artist      // Artists — Coral
CultureTokens.venue       // Venues — Teal
CultureTokens.movie       // Movies — Gold
CultureTokens.community   // Community — Bright Blue
```

### Component Tokens

```typescript
import { ButtonTokens, CardTokens, InputTokens, ChipTokens, AvatarTokens } from '@/constants/theme';

ButtonTokens.height       // sm: 36, md: 44 (Apple minimum), lg: 52
CardTokens.radius         // 16 (standard card border radius)
InputTokens.height        // 48
AvatarTokens.size.md      // 40
```

### Theme-Aware Colors

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

Dark mode is the default experience, providing a "night festival feeling". Light mode is available as an alternative.

### Signature Gradient

```typescript
import { gradients } from '@/constants/theme';

// Use for hero banners, CTAs, onboarding screens
gradients.culturepassBrand  // [Indigo, Saffron, Coral]
```

**Full documentation:** See [docs/DESIGN_TOKENS.md](./docs/DESIGN_TOKENS.md)

---

## Environment Variables

Copy `.env.example` → `.env` and fill in:

```bash
# Firebase (client SDK — baked into bundle at build time)
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=

# API base URL (prod Cloud Functions URL)
EXPO_PUBLIC_API_URL=https://us-central1-YOUR_PROJECT.cloudfunctions.net/api/

# Stripe (Cloud Functions side only — never in Expo bundle)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
# Create these in Stripe Dashboard → Products → Pricing
STRIPE_PRICE_MONTHLY_ID=price_...
STRIPE_PRICE_YEARLY_ID=price_...
```

For EAS builds, mirror these in `eas.json` under `build.*.env`.

---

## Local Development

```bash
# Install
npm install
cd functions && npm install && cd ..

# Start Expo (native + web)
npx expo start

# Start Cloud Functions emulator
firebase emulators:start --only functions,firestore,auth,storage

# Type check
npm run typecheck

# Lint
npm run lint
```

Set `EXPO_PUBLIC_API_URL=http://localhost:5001/YOUR_PROJECT/us-central1/api/` when using the emulator.

---

## Testing

```bash
npm run test:unit          # Service + middleware unit tests
npm run test:integration   # API route integration tests (requires running server)
npm run test:e2e:smoke     # Critical path smoke tests
npm run qa:all             # All of the above
```

---

## Building & Deploying

### iOS (App Store)

```bash
# 1. Bump version in app.json (version + ios.buildNumber)
# 2. Build with EAS
eas build --platform ios --profile production

# 3. Submit to App Store Connect
eas submit --platform ios
```

Requires: Apple Developer account, `eas.json` production profile configured.

### Android (Google Play)

```bash
# 1. Bump version in app.json (version + android.versionCode)
eas build --platform android --profile production
eas submit --platform android
```

### Web (Firebase Hosting)

```bash
# Build the Expo web export
npx expo export --platform web

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

Web output goes to `dist/` — Firebase Hosting serves it at your `.web.app` domain.

### Cloud Functions

```bash
cd functions
npm run build           # TypeScript compile → lib/

cd ..
firebase deploy --only functions
```

Functions deploy to `us-central1` by default (`firebase.json`).

**Always deploy functions before the app** when adding new endpoints.

---

## Firestore Data Model

```
users/{uid}
  username, displayName, email, city, country
  role: 'user' | 'organizer' | 'moderator' | 'admin'
  membership: { tier, expiresAt }
  isSydneyVerified, interests[], culturePassId
  createdAt, updatedAt

events/{eventId}
  title, description, venue, date, time, city, country
  imageUrl, cultureTag[], tags[], category
  priceCents, tiers[], isFree, isFeatured
  organizerId, capacity, attending
  deletedAt (soft delete), publishedAt
  cpid (CP-EVT-xxx), geoHash

tickets/{ticketId}
  eventId, userId, status, paymentStatus
  qrCode, cpTicketId, priceCents
  history[]: { action, timestamp, actorId }

profiles/{profileId}
  entityType: 'community' | 'business' | 'venue' | 'artist'
  name, description, imageUrl, city, country
  ownerId, verified, rating
```

### Firestore Security Rules
See `firestore.rules`. Key rules:
- Users can read/write their own `users/{uid}` doc.
- Events: anyone can read published; only organizer/admin can write.
- Tickets: owner can read; Cloud Functions write via Admin SDK (bypasses rules).

---

## Design System Quick Reference

```ts
import { useColors }  from '@/hooks/useColors';      // theme colors
import { useLayout }  from '@/hooks/useLayout';       // responsive layout
import { Colors, TextStyles, Spacing,
         ButtonTokens, CardTokens }  from '@/constants/theme';

import { Button, Card, Badge } from '@/components/ui';
```

**Color roles**: `primary` CTA · `secondary` purple · `accent` orange · `gold` premium
**Gradients**: `gradients.aurora` hero · `gradients.primary` brand · `gradients.sunset` warm
**Neon** (use sparingly): `neon.blue` · `neon.purple` · `neon.teal` for focused/active states

---

## Known Gaps (Production Readiness Checklist)

- [x] Stripe real payment flow — subscription checkout, webhook handler, cancel all wired to Firestore (`functions/src/app.ts`)
- [x] Profiles/communities routes migrated from in-memory → `profilesService` (Firestore)
- [x] Custom Firebase claims via `authAdmin.setCustomUserClaims` — tier synced on subscribe/cancel
- [x] `api.membership.*` namespace in `lib/api.ts` — `subscribe`, `get`, `cancel`, `memberCount`
- [ ] Migrate remaining in-memory Maps (wallets, notifications, perks, tickets) → Firestore
- [ ] Google / Apple social sign-in (buttons exist; auth flow not wired)
- [ ] Push notifications (FCM token registration)
- [ ] Offline mutation queue (AsyncStorage → sync on reconnect)
- [ ] Geolocation filtering (geoHash stored, not queried)
- [ ] Analytics (PostHog / Firebase Analytics)
- [ ] Error monitoring (Sentry)
