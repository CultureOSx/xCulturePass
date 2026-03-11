import { PostHog } from 'posthog-react-native';

const posthogClient = process.env.EXPO_PUBLIC_POSTHOG_API_KEY ? new PostHog(process.env.EXPO_PUBLIC_POSTHOG_API_KEY, {
  host: process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  enableSessionReplay: true,
  sessionReplayConfig: {
    maskAllTextInputs: true,
    maskAllImages: false,
    captureLog: true,
    captureNetworkTelemetry: true,
  },
}) : null;

export const captureEvent = (eventName: string, properties?: Record<string, any>) => {
  if (posthogClient) {
    posthogClient.capture(eventName, properties);
  } else if (__DEV__) {
    console.log('[Analytics Event]:', eventName, properties);
  }
};

export const identifyUser = (distinctId: string, properties?: Record<string, any>) => {
  if (posthogClient) {
    posthogClient.identify(distinctId, properties);
  } else if (__DEV__) {
    console.log('[Analytics Identify]:', distinctId, properties);
  }
};

export const resetUser = () => {
  if (posthogClient) {
    posthogClient.reset();
  }
};

export default posthogClient;
