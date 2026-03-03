import { Redirect } from 'expo-router';

// Legacy /landing route — sends users directly to Discovery.
export default function LandingRedirect() {
  return <Redirect href="/(tabs)" />;
}
