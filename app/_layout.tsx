import "react-native-reanimated"; // <-- CRUCIAL FIX: Must be at the very top
import { Buffer } from "buffer";

import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useCallback, useEffect, useRef } from "react";
import {
  Platform,
  View,
  StyleSheet,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { AuthProvider, useAuth } from "@/lib/auth";
import {
  OnboardingProvider,
  useOnboarding,
} from "@/contexts/OnboardingContext";
import { SavedProvider } from "@/contexts/SavedContext";
import { ContactsProvider } from "@/contexts/ContactsContext";
import { Colors } from "@/constants/theme";
import { usePushNotifications } from "@/hooks/usePushNotifications";

import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

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
    state,
    resetOnboarding,
  } = useOnboarding();
  // Track the previous user id so we can detect logout (authenticated → null)
  // without incorrectly resetting onboarding on the initial cold-start null state.
  const prevUserIdRef = useRef<string | null>(null);

  // Register for push notifications when user is authenticated
  usePushNotifications();

  useEffect(() => {
    if (user) {
      prevUserIdRef.current = user.id;
      // Sync user's stored city/country into onboarding state so Discover
      // page location filters work automatically after login.
      const city = user.city;
      const country = user.country;
      const interests = user.interests ?? [];
      const communities = user.communities ?? [];
      if (city && city !== state.city) setCity(city);
      if (country && country !== state.country) setCountry(country);
      if (JSON.stringify(interests) !== JSON.stringify(state.interests)) {
        setInterests(interests);
      }
      if (JSON.stringify(communities) !== JSON.stringify(state.communities)) {
        setCommunities(communities);
      }
    } else if (prevUserIdRef.current !== null) {
      // User was authenticated and has now signed out — clear onboarding state.
      prevUserIdRef.current = null;
      resetOnboarding();
    }
  }, [
    resetOnboarding,
    setCity,
    setCommunities,
    setCountry,
    setInterests,
    state.city,
    state.communities,
    state.country,
    state.interests,
    user,
  ]);

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
  return (
    <View
      style={[
        webStyles.outerContainer,
        {
          backgroundColor: Colors.light.background,
        },
      ]}
    >
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
export default function RootLayout() {
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
        <QueryClientProvider client={queryClient}>
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
        </QueryClientProvider>
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
