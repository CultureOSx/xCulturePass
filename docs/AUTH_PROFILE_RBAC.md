# Auth, Profile, CRUD, and RBAC Architecture

## 1) Sign up / Sign in flow

- Client auth is handled by Firebase Auth (`createUserWithEmailAndPassword`, `signInWithEmailAndPassword`, social providers).
- `AuthProvider` listens to `onAuthStateChanged` and syncs ID token into `lib/query-client.ts`.
- On every authenticated session, `AuthProvider` calls `api.auth.me()` and now auto-bootstraps profile via `api.auth.register()` if profile fields are missing.
- This guarantees a Firestore user profile exists after signup/signin.

## 2) Backend identity/profile endpoints

- `GET /api/auth/me` → token-backed user profile payload.
- `POST /api/auth/register` → idempotent profile bootstrap/creation.
- `GET /api/users/me` → current user profile for frontend profile screens.
- `GET /api/users/:id`, `PUT /api/users/:id` → read/update user profile (owner/admin).
- `DELETE /api/account/:userId` → account deletion (owner/admin).

## 3) Profile CRUD

### User profile
- Create: `POST /api/auth/register`
- Read: `GET /api/users/me`, `GET /api/users/:id`
- Update: `PUT /api/users/:id`
- Delete: `DELETE /api/account/:userId`

### Directory profile (`profiles` collection)
- Create: `POST /api/profiles`
- Read: `GET /api/profiles`, `GET /api/profiles/:id`
- Update: `PUT /api/profiles/:id`
- Delete: `DELETE /api/profiles/:id`

## 4) Role-based access control (RBAC)

- Backend role source: Firebase custom claims (`role`, `tier`, location claims).
- Middleware:
  - `authenticate` parses token into `req.user`
  - `requireAuth` enforces signed-in access
  - `requireRole(...)` enforces role-based access
  - `isOwnerOrAdmin` enforces ownership or elevated roles
- Frontend role helper: `hooks/useRole.ts` (organizer/admin/min-role checks).

## 5) How profile is associated across pages

- Profile tab: reads current user via `api.users.me()`.
- Profile edit: reads current user via `api.users.me()`, updates via `PUT /api/users/:id`, invalidates dependent caches.
- Public profile route currently reads current user identity for account-owned public view.
- Other feature pages (tickets, wallet, scanner, saved, contacts, submit) gate behavior through `useAuth`, `AuthGuard`, and `useRole`.

## 6) Query/caching associations

When profile updates happen, these keys must be invalidated:
- `['/api/users/me', ...]`
- `['api/auth/me']`
- `['/api/users', userId]`
- Any page-level profile query keys depending on user identity.

## 7) Security constraints

- Frontend checks are UX only; backend middleware is authoritative.
- Account/profile write/delete routes enforce owner/admin checks.
- Elevated routes use `requireRole` server-side (admin/organizer/cityAdmin/moderator/platformAdmin as required).
