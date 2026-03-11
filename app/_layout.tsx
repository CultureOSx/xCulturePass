import "react-native-reanimated"; // <-- CRUCIAL FIX: Must be at the very top
import { Buffer } from "buffer";

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack, useSegments, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Sentry from '@sentry/react-native';
import { PostHogProvider } from 'posthog-react-native';
import posthogClient, { identifyUser, resetUser } from '@/lib/analytics';
import React, { useCallback, useEffect, useRef } from "react";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  tracesSampleRate: 1.0,
  debug: false,
});
import {
  Platform,
  View,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient, queryPersister } from "@/lib/query-client";
import { AuthProvider, useAuth } from "@/lib/auth";
import {
  OnboardingProvider,
  useOnboarding,
} from "@/contexts/OnboardingContext";
import { SavedProvider } from "@/contexts/SavedContext";
import { ContactsProvider } from "@/contexts/ContactsContext";
import { useColors } from "@/hooks/useColors";
import { usePushNotifications } from "@/hooks/usePushNotifications";

import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { WebTopBar } from "@/components/web/WebTopBar";

global.Buffer = Buffer;

// Prevent splash auto-hide safely
SplashScreen.preventAutoHideAsync().catch(() => {});

// ---------------------------------------------------------------------------
// DataSync — bridges auth user state into OnboardingContext without making
// AuthProvider depend on OnboardingContext (breaks potential circular deps).
// Lives inside both OnboardingProvider AND AuthProvider.
// ---------------------------------------------------------------------------
function DataSync() {
  const { user } = useAuth();
  const {
    setCity,
    setCountry,
    setInterests,
    setCommunities,
    setSubscriptionTier,
    state,
    resetOnboarding,
    completeOnboarding,
  } = useOnboarding();
  // Track the previous user id so we can detect logout (authenticated → null)
  // without incorrectly resetting onboarding on the initial cold-start null state.
  const prevUserIdRef = useRef<string | null>(null);

  // Register for push notifications when user is authenticated
  usePushNotifications();

  useEffect(() => {
    async function syncOnboarding() {
      if (user) {
        prevUserIdRef.current = user.id;
        // Sync user's stored city/country into onboarding state so Discover
        // page location filters work automatically after login.
        const city = user.city;
        const country = user.country;
        const interests = user.interests ?? [];
        const communities = user.communities ?? [];
        const tier = user.subscriptionTier ?? 'free';
        if (city && city !== state.city) setCity(city);
        if (country && country !== state.country) setCountry(country);
        if (JSON.stringify(interests) !== JSON.stringify(state.interests)) {
          setInterests(interests);
        }
        if (JSON.stringify(communities) !== JSON.stringify(state.communities)) {
          setCommunities(communities);
        }
        if (tier !== state.subscriptionTier) {
          setSubscriptionTier(tier);
        }
        // Fallback: If user profile is complete but onboarding is not, complete onboarding
        if (!state.isComplete && city && country && interests.length > 0) {
          await completeOnboarding();
        }

        // Analytics Tracking
        identifyUser(user.id, {
          email: user.email,
          city: user.city,
          country: user.country,
          subscriptionTier: user.subscriptionTier,
        });

      } else if (prevUserIdRef.current !== null) {
        // User was authenticated and has now signed out — clear onboarding state.
        prevUserIdRef.current = null;
        resetUser();
        resetOnboarding();
      }
    }
    syncOnboarding();
    // Only re-run when the auth user's identity or profile fields change.
    // The setter functions (setCity, setCommunities, etc.) and resetOnboarding
    // are stable refs from OnboardingContext and don't need to be in the dep array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    user?.id,
    user?.city,
    user?.country,
    user?.interests,
    user?.communities,
    user?.subscriptionTier,
    state.isComplete,
  ]);  

  return null;
}

// ---------------------------------------------------------------------------
// AuthGuard — Global Route Protector
// Handles phase 2 auth-guard redirect rules and prevents unauthenticated
// users from bypassing login to access privileged areas.
// ---------------------------------------------------------------------------
function AuthGuard() {
  const { user, isRestoring } = useAuth();
  const segments = useSegments() as string[];
  const router = useRouter();

  useEffect(() => {
    if (isRestoring) return;

    // Define strictly protected root-level screens
    const protectedRoutes = [
      'profile',
      'tickets',
      'payment',
      'saved',
      'settings',
      'membership',
      'submit',
      'scanner',
    ];

    // Some (tabs) are fully open to guests (index, communities, map). 
    // Others (like profile, perks, calendar) require login.
    const isProtected = 
      protectedRoutes.includes(segments[0] as string) || 
      (segments[0] === '(tabs)' && (segments[1] === 'profile' || segments[1] === 'perks' || segments[1] === 'calendar' || segments[1] === 'dashboard'));

    const inOnboardingGroup = segments[0] === '(onboarding)';

    if (!user && isProtected) {
      // Guests hitting a locked screen → route to login
      router.replace('/(onboarding)/login');
    } else if (user && inOnboardingGroup && segments[1] === 'login') {
      // Authenticated users explicitly navigating to login → skip to tabs
      router.replace('/(tabs)');
    }
  }, [user, segments, isRestoring, router]);

  return null;
}

// ---------------------------------------------------------------------------
// Stack navigator — all screens registered here so Expo Router can deep-link
// ---------------------------------------------------------------------------
function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerShadowVisible: false,
        // Empty string removes the "Back" label next to the iOS chevron
        headerBackTitle: "",
        animation: Platform.OS === "ios" ? "default" : "slide_from_right",
      }}
    >
      <Stack.Screen name="landing" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />

      <Stack.Screen name="event/[id]" />
      <Stack.Screen name="community/[id]" />
      <Stack.Screen name="council/select" />
      <Stack.Screen name="council/claim" />
      <Stack.Screen name="business/[id]" />
      <Stack.Screen name="artist/[id]" />
      <Stack.Screen name="venue/[id]" />
      <Stack.Screen name="user/[id]" />

      <Stack.Screen name="profile/[id]" />
      <Stack.Screen name="profile/edit" />
      <Stack.Screen name="profile/public" />
      <Stack.Screen name="profile/qr" />

      <Stack.Screen name="movies/index" />
      <Stack.Screen name="movies/[id]" />
      <Stack.Screen name="restaurants/index" />
      <Stack.Screen name="restaurants/[id]" />
      <Stack.Screen name="activities/index" />
      <Stack.Screen name="activities/[id]" />
      <Stack.Screen name="shopping/index" />
      <Stack.Screen name="shopping/[id]" />
      <Stack.Screen name="communities/index" />

      <Stack.Screen name="payment/methods" />
      <Stack.Screen name="payment/transactions" />
      <Stack.Screen name="payment/wallet" />
      <Stack.Screen name="payment/success" />
      <Stack.Screen name="payment/cancel" />

      <Stack.Screen name="tickets/index" />
      <Stack.Screen name="tickets/[id]" />
      <Stack.Screen name="tickets/print/[id]" />
      <Stack.Screen name="perks/index" />
      <Stack.Screen name="perks/[id]" />
      <Stack.Screen name="notifications/index" />

      <Stack.Screen name="contacts/index" />
      <Stack.Screen name="contacts/[cpid]" />
      <Stack.Screen name="scanner" />

      <Stack.Screen name="search/index" />
      <Stack.Screen name="saved/index" />
      <Stack.Screen name="submit/index" />
      <Stack.Screen name="allevents" />
      <Stack.Screen name="map" />
      <Stack.Screen name="membership/upgrade" />

      <Stack.Screen name="settings/index" />
      <Stack.Screen name="settings/location" />
      <Stack.Screen name="settings/about" />
      <Stack.Screen name="settings/help" />
      <Stack.Screen name="settings/notifications" />
      <Stack.Screen name="settings/privacy" />
      <Stack.Screen name="dashboard" />

      <Stack.Screen name="help/index" />
      <Stack.Screen name="legal/terms" />
      <Stack.Screen name="legal/privacy" />
      <Stack.Screen name="legal/cookies" />
      <Stack.Screen name="legal/guidelines" />

      <Stack.Screen name="admin/users" />
      <Stack.Screen name="admin/council-management" />
      <Stack.Screen name="admin/notifications" />
      <Stack.Screen name="admin/audit-logs" />
      <Stack.Screen name="admin/council-claims" />
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Responsive web shell — centres content on wide screens, phone frame on small
// ---------------------------------------------------------------------------
function WebShell({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  return (
    <View
      style={[
        webStyles.outerContainer,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      {/* Top bar wrapper for web, uses surface for contrast, shadow, and border */}
      {Platform.OS === 'web' && isDesktop ? (
          <WebTopBar />
      ) : (
        <View style={{
          width: "100%",
          backgroundColor: colors.surface,
          borderBottomWidth: 2,
          borderBottomColor: colors.border,
          padding: 16,
          shadowColor: colors.primary,
          shadowOpacity: 0.10,
          shadowRadius: 10,
          elevation: 3,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
        }}>
          {/* Native top bar content here */}
        </View>
      )}
      <View style={{ flex: 1, width: "100%" }}>{children}</View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Root layout — provider order matters:
//   OnboardingProvider  (outermost — no deps)
//   └── AuthProvider    (can now use useOnboarding via DataSync child)
//       └── DataSync    (syncs auth user → onboarding state)
//       └── SavedProvider / ContactsProvider / ...
// ---------------------------------------------------------------------------
function RootLayoutContent() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular: Inter_400Regular,
    Poppins_500Medium: Inter_500Medium,
    Poppins_600SemiBold: Inter_600SemiBold,
    Poppins_700Bold: Inter_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  const isWeb = Platform.OS === "web";

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <PostHogProvider 
          client={posthogClient ?? undefined}
          apiKey={posthogClient ? undefined : 'disabled'}
          options={posthogClient ? undefined : { disabled: true }}
        >
          <PersistQueryClientProvider 
            client={queryClient}
            persistOptions={{ persister: queryPersister }}
          >
          {/*
           * OnboardingProvider MUST wrap AuthProvider.
           * AuthProvider itself no longer calls useOnboarding() — DataSync
           * handles the cross-context sync as a child component.
           */}
          <OnboardingProvider>
            <AuthProvider>
              <SavedProvider>
                <ContactsProvider>
                  <GestureHandlerRootView
                    style={{ flex: 1 }}
                    onLayout={onLayoutRootView}
                  >
                    {/* Syncs auth user city/country → OnboardingContext */}
                    <DataSync />
                    <AuthGuard />
                    {isWeb ? (
                      <WebShell>
                        <RootLayoutNav />
                      </WebShell>
                    ) : (
                      <KeyboardProvider>
                        <RootLayoutNav />
                      </KeyboardProvider>
                    )}
                  </GestureHandlerRootView>
                </ContactsProvider>
              </SavedProvider>
            </AuthProvider>
          </OnboardingProvider>
        </PersistQueryClientProvider>
        </PostHogProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const webStyles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    alignItems: "stretch",
    justifyContent: "flex-start",
    paddingHorizontal: 0,
    overflow: "hidden",
  },
});

export default Sentry.wrap(RootLayoutContent);
