import { Stack, Redirect } from "expo-router";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { ActivityIndicator, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export default function OnboardingLayout() {
  const colors = useColors();
  const { state, isLoading } = useOnboarding();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.textInverse} />
      </View>
    );
  }

  // Already completed onboarding (authenticated + location set) → go straight to Discovery
  if (state.isComplete) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="login" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="location" />
      <Stack.Screen name="communities" />
      <Stack.Screen name="culture-match" />
      <Stack.Screen name="interests" />
    </Stack>
  );
}
