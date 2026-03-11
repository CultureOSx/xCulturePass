/**
 * usePushNotifications — registers the device for push notifications
 * and handles incoming notification responses.
 *
 * Usage (call once near the root of the authenticated app):
 *   usePushNotifications();
 *
 * What it does:
 *   1. Requests notification permissions (iOS prompts; Android 13+ prompts)
 *   2. Gets the Expo push token (FCM on Android, APNs on iOS)
 *   3. Posts the token to the backend for targeting
 *   4. Handles notification taps — deep-links into the relevant screen
 *
 * Requirements:
 *   - expo-notifications in package.json
 *   - "expo-notifications" plugin in app.json
 *   - For Firebase Cloud Messaging: google-services.json (Android) + GoogleService-Info.plist (iOS)
 */

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface NotificationData {
  screen?: string;
  eventId?: string;
  communityId?: string;
  userId?: string;
  url?: string;
}

// ---------------------------------------------------------------------------
// Token registration (async, fire-and-forget from component)
// ---------------------------------------------------------------------------
async function registerPushToken(userId: string): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    // Dynamic import — expo-notifications may not be installed in all environments
    const Notifications = await import('expo-notifications').catch(() => null);
    if (!Notifications) return;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
    });

    // Register with backend
    await api.raw('POST', 'api/notifications/register-token', {
      userId,
      token: tokenData.data,
      platform: Platform.OS,
    }).catch(() => {
      // Non-critical — don't crash if token registration fails
    });
  } catch {
    // Silently ignore — push notifications are non-critical
  }
}

// ---------------------------------------------------------------------------
// Deep link handler for notification taps
// ---------------------------------------------------------------------------
function handleNotificationResponse(data: NotificationData) {
  try {
    if (data.screen === 'event' && data.eventId) {
      router.push({ pathname: '/event/[id]', params: { id: data.eventId } });
    } else if (data.screen === 'community' && data.communityId) {
      router.push({ pathname: '/community/[id]', params: { id: data.communityId } });
    } else if (data.screen === 'profile' && data.userId) {
      router.push({ pathname: '/profile/[id]', params: { id: data.userId } });
    } else if (data.screen === 'notifications') {
      router.push('/notifications');
    } else if (data.screen === 'tickets') {
      router.push('/tickets');
    } else if (data.screen === 'perks') {
      router.push('/(tabs)/perks');
    } else if (data.url) {
      // Only allow internal routes for security
      const url = data.url;
      if (url.startsWith('/') && !url.startsWith('//') && !url.includes('://')) {
        router.push(url as Parameters<typeof router.push>[0]);
      }
    }
  } catch {
    // Navigation errors are non-critical
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function usePushNotifications() {
  const { userId, isAuthenticated } = useAuth();
  const notificationListener = useRef<ReturnType<typeof setTimeout> | null>(null);
  const responseListener = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !userId || Platform.OS === 'web') return;

    // Register token
    registerPushToken(userId);

    // Set up notification handlers
    let cleanupFns: (() => void)[] = [];

    import('expo-notifications').then((Notifications) => {
      // Configure how notifications look when app is in foreground
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: true,
          shouldShowAlert: true,
        }),
      });

      // Handle notification tap (app in background or closed)
      const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as NotificationData;
        handleNotificationResponse(data);
      });

      cleanupFns.push(() => responseSub.remove());
    }).catch(() => {});

    return () => {
      cleanupFns.forEach((fn) => fn());
    };
  }, [userId, isAuthenticated]);
}
