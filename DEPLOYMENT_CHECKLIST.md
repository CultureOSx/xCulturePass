# CulturePass Deployment Checklist & Step-by-Step Instructions

**Date Created:** March 3, 2026  
**Status:** ✅ **READY FOR DEPLOYMENT**

---

## 📋 Project Health Assessment

### ✅ Code Quality
- **TypeScript**: ✅ 0 type errors
- **Linting**: ✅ Clean
- **iOS/Android**: ✅ Properly configured (app.json + info.plist + AndroidManifest.xml)
- **Web**: ✅ All pages working (Discover, Calendar, Communities, Perks, Profile, Login, Signup)

### ✅ Source Code Locations
| Source | Location | Status |
|--------|----------|--------|
| **React Native** (iOS/Android) | `/app/` (Expo Router) | ✅ Ready |
| **Web** (Expo Web unified) | `/app/` + shared components | ✅ Ready |
| **Cloud Functions** | `/functions/src/` | ✅ Built |
| **Assets** | `/assets/` | ✅ Present |
| **Shared Types** | `/shared/schema.ts` | ✅ Present |

### ✅ Build Artifacts
| Component | Output | Status |
|-----------|--------|--------|
| **Web Static Export** | `dist/` | ✅ Expo export output |
| **Functions Compiled** | `functions/lib/` | ✅ TypeScript compiled |
| **.env Configuration** | `.env` | ✅ Holds active credentials |

### ✅ Firebase Configuration
- **Project ID**: `culturepass-60df3`
- **.firebaserc**: ✅ Updated to use correct project ID
- **Firestore Rules**: ✅ In place (`firestore.rules`)
- **Storage Rules**: ✅ In place (`storage.rules`)
- **Cloud Functions**: ✅ Ready to deploy

---

## 🚀 Pre-Deployment Checklist (Complete These First)

### Step 1: Verify .env Configuration
```bash
cd /Users/wedoboring/Documents/CultureOS/CulturePass

# Check that .env has all required Firebase credentials:
cat .env | grep EXPO_PUBLIC_FIREBASE_

# Should show:
# EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyA38YmkzxfEYi6TAUGYfo7bxfPW3Ogi9XQ
# EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=culturepass-60df3.firebaseapp.com
# EXPO_PUBLIC_FIREBASE_PROJECT_ID=culturepass-60df3
# [... other vars ...]
```

✅ **Status**: VERIFIED

### Step 2: Verify Firebase CLI Login
```bash
firebase whoami
# Should show authenticated user email
```

### Step 3: Perform Final Build Test (Optional)
```bash
# Test web build
npm run build-web

# Test functions build
cd functions && npm run build && cd ..

# Test type checking
npm run typecheck
```

---

## 📱 Part 1: Deploy Web App (Expo Web) to Firebase Hosting

### Prerequisites
- ✅ Web app built (`npm run build-web` completed)
- ✅ `.firebaserc` configured with correct project ID
- ✅ Firebase CLI authenticated (`firebase whoami`)

### Step 1: Build Web App (If Not Already Built)
```bash
cd /Users/wedoboring/Documents/CultureOS/CulturePass

# This exports Expo web bundle to dist/
npm run build-web

# Expected output:
# ✓ Compiled successfully
# ✓ Generating static pages (13/13)
# Route (app)                              Size
# ┌ ○ /                                    1.9 kB
# ├ ○ /calendar                            1.68 kB
# ├ ○ /communities                         932 B
# ├ ○ /perks                               2.75 kB
# └ ...
```

### Step 2: Deploy to Firebase Hosting
```bash
cd /Users/wedoboring/Documents/CultureOS/CulturePass

# Deploy only hosting (fastest for web-only deploys)
firebase deploy --only hosting

# Expected output:
# ✔ Deploy complete!
#
# Project Console: https://console.firebase.google.com/project/culturepass-60df3
# Hosting URL: https://culturepass-60df3.web.app
```

### Step 3: Verify Deployment
```bash
# Visit in browser:
# https://culturepass-60df3.web.app/

# Check specific routes:
# https://culturepass-60df3.web.app/calendar
# https://culturepass-60df3.web.app/communities
# https://culturepass-60df3.web.app/perks
# https://culturepass-60df3.web.app/profile
```

---

## ⚙️ Part 2: Deploy Cloud Functions to Firebase

### Prerequisites
- ✅ Cloud Functions built (`cd functions && npm run build`)
- ✅ Firebase CLI authenticated
- ✅ `.env` file has any environment variables needed by functions

### Step 1: Verify Functions Build
```bash
cd /Users/wedoboring/Documents/CulturePass/functions

# Check compiled output exists
ls -la lib/functions/src/

# Should contain index.js and other compiled files
```

### Step 2: Deploy Functions
```bash
cd /Users/wedoboring/Documents/CultureOS/CulturePass

# Deploy only Cloud Functions (fastest for function-only deploys)
firebase deploy --only functions

# Expected output:
# ✔ functions[api]: Successful create operation.
# Function URL: https://us-central1-culturepass-60df3.cloudfunctions.net/api/
#
# Deployment complete!
```

### Step 3: Verify Functions Deployment
```bash
# Check function exists in Firebase Console
firebase functions:list

# Test an API endpoint:
curl https://us-central1-culturepass-60df3.cloudfunctions.net/api/health 2>/dev/null | jq .

# Or visit in browser:
# https://us-central1-culturepass-60df3.cloudfunctions.net/api/
```

---

## 🌍 Part 3: Deploy ALL (Functions + Hosting) in One Command

### Quick Deploy (Recommended)
```bash
cd /Users/wedoboring/Documents/CultureOS/CulturePass

# ONE COMMAND: Build + Deploy everything
npm run deploy-all

# This runs:
# 1. cd functions && npm run build && cd ..
# 2. npm run build-web
# 3. firebase deploy --only functions,hosting
```

### Expected Output
```
✔ functions[api]: Successful create operation.
Function URL: https://us-central1-culturepass-60df3.cloudfunctions.net/api/

✔ Deploy complete!

Project Console: https://console.firebase.google.com/project/culturepass-60df3
Hosting URL: https://culturepass-60df3.web.app
Function URL: https://us-central1-culturepass-60df3.cloudfunctions.net/api/
```

---

## 📱 Part 4: Build iOS App with EAS (Apple App Store)

### Prerequisites
- ✅ EAS CLI installed: `npm install -g eas-cli`
- ✅ EAS authenticated: `eas login`
- ✅ Apple Developer account
- ✅ app.json configured with iOS settings
- ✅ eas.json configured with submission credentials

### Step 1: Update Version Number
```bash
cd /Users/wedoboring/Documents/CultureOS/CulturePass

# Edit app.json
# Change: "version": "1.0.0" to "1.0.1" (or your release number)
# Change: "ios": { "buildNumber": "1" } to "buildNumber": "2"
```

### Step 2: Build iOS App
```bash
cd /Users/wedoboring/Documents/CultureOS/CulturePass

# Build for production
eas build --platform ios --profile production

# This will:
# - Ask if you want to build on EAS
# - Create a .ipa file
# - Take ~10-15 minutes
# - Show build ID when complete

# Expected output:
# ✔ Build finished.
# Build URL: https://expo.dev/accounts/@YOUR_USERNAME/builds/...
# Download URL: https://...
```

### Step 3: Submit to App Store
```bash
# Option A: Auto-submit (if credentials in eas.json)
eas submit --platform ios --latest

# Option B: Manual review & submit later
eas submit --platform ios --id=$(eas build:list --limit 1 --json | jq -r '.[0].id')
```

### Step 4: Monitor App Store Review
- Go to: https://appstoreconnect.apple.com/
- Sign in with Apple Developer account
- Navigate to: Apps → CulturePass → Builds
- Check review status (typically 24-48 hours)

---

## 🤖 Part 5: Build Android App with EAS (Google Play)

### Prerequisites
- ✅ EAS CLI installed
- ✅ EAS authenticated
- ✅ Google Play Developer account
- ✅ app.json configured with Android settings
- ✅ eas.json configured with submission credentials

### Step 1: Update Version Number
```bash
cd /Users/wedoboring/Documents/CultureOS/CulturePass

# Edit app.json
# Change: "version": "1.0.0" to "1.0.1"
# Change: "android": { "versionCode": 1 } to "versionCode": 2
```

### Step 2: Build Android App
```bash
cd /Users/wedoboring/Documents/CultureOS/CulturePass

# Build for production
eas build --platform android --profile production

# This will:
# - Build an APK/AAB
# - Take ~10-15 minutes
# - Output build URL

# Expected output:
# ✔ Build finished.
# Build URL: https://expo.dev/accounts/@YOUR_USERNAME/builds/...
# Download URL: https://...
```

### Step 3: Submit to Google Play
```bash
# Auto-submit to Google Play
eas submit --platform android --latest

# Or specify build ID
eas submit --platform android --id=$(eas build:list --limit 1 --platform android --json | jq -r '.[0].id')
```

### Step 4: Monitor Google Play Review
- Go to: https://play.google.com/console/
- Sign in with Google Account
- Navigate to: CulturePass → Releases → Production
- Check review status (typically 4-24 hours)

---

## 🔄 Part 6: Deploy Web App Again After Mobile Updates (Optional)

If you've made changes to the web app while preparing mobile builds:

```bash
cd /Users/wedoboring/Documents/CultureOS/CulturePass

# Rebuild web only (faster)
npm run build-web

# Deploy web only
firebase deploy --only hosting
```

---

## 🐛 Troubleshooting

### Issue: "Invalid project id: YOUR_FIREBASE_PROJECT_ID"
**Solution**: 
```bash
# Make sure .firebaserc has correct project ID
cat .firebaserc
# Should show: "default": "culturepass-60df3"

# If not, run:
firebase use culturepass-60df3
```

### Issue: "firebase: command not found"
**Solution**:
```bash
# Install Firebase CLI globally
npm install -g firebase-tools@latest

# Or use locally
npx firebase-tools@latest deploy --only hosting
```

### Issue: Web deployments fail with "public directory doesn't exist"
**Solution**:
```bash
# Make sure web build was successful
npm run build-web

# Check output exists
ls dist/index.html
```

### Issue: Functions deployment fails with "Out of memory"
**Solution**:
```bash
# Build functions locally first
cd functions && npm run build && cd ..

# Then deploy
firebase deploy --only functions
```

---

## 📊 Deployment Summary

| Component | Status | URL | Command |
|-----------|--------|-----|---------|
| **Web (Hosting)** | ✅ Ready | https://culturepass-60df3.web.app | `npm run deploy-web` |
| **Functions** | ✅ Ready | https://us-central1-culturepass-60df3.cloudfunctions.net/api/ | `firebase deploy --only functions` |
| **iOS (App Store)** | ✅ Ready | App Store | `eas build --platform ios` |
| **Android (Play)** | ✅ Ready | Google Play | `eas build --platform android` |

---

## 🎯 Quick Start: Deploy Everything

```bash
cd /Users/wedoboring/Documents/CultureOS/CulturePass

# ONE COMMAND: Deploy web + functions
npm run deploy-all

# Wait for confirmation, then check:
# ✓ Web: https://culturepass-60df3.web.app/
# ✓ API: https://us-central1-culturepass-60df3.cloudfunctions.net/api/health
```

---

## ✅ Post-Deployment Verification

### Web App Smoke Test
- [ ] Visit https://culturepass-60df3.web.app/
- [ ] Check Discover page loads events
- [ ] Check Calendar renders with month view
- [ ] Check Communities list loads
- [ ] Check Perks shows discounts
- [ ] Check Login/Signup pages work
- [ ] Check Profile page (if authenticated)

### Cloud Functions Smoke Test
```bash
# Test health endpoint
curl https://us-central1-culturepass-60df3.cloudfunctions.net/api/health

# Expected: { "status": "ok" }
```

### Mobile Apps Smoke Test (After Release)
- [ ] iOS: Download from App Store sandbox, test login
- [ ] Android: Download from Google Play internal testing, test login
- [ ] Both: Verify events load, calendar works, communities display

---

## 📞 Support & Resources

- **Firebase Console**: https://console.firebase.google.com/project/culturepass-60df3
- **EAS Dashboard**: https://expo.dev/accounts/@YOUR_USERNAME
- **App Store Connect**: https://appstoreconnect.apple.com/
- **Google Play Console**: https://play.google.com/console/
- **Firebase Documentation**: https://firebase.google.com/docs
- **Expo Documentation**: https://docs.expo.dev/

---

## 🔐 Security Reminders

- ✅ Never commit `.env` with real credentials to git (already in .gitignore)
- ✅ Firebase rules are restrictive (only auth users can read/write)
- ✅ API endpoints require authentication tokens
- ✅ Sensitive environment variables stored in EAS secrets, not in code
- ✅ Web app uses HTTPS everywhere (Firebase Hosting enforces this)

---

**Last Updated**: March 3, 2026  
**Next Steps**: Run `npm run deploy-all` to deploy web + functions to Firebase
