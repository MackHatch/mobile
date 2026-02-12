import { useAuth } from "@/src/providers/AuthProvider";
import { Redirect } from "expo-router";
import { Stack } from "expo-router";

export default function OnboardingLayout() {
  const { token, isLoading } = useAuth();

  if (!isLoading && !token) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="step-1" />
      <Stack.Screen name="step-2" />
      <Stack.Screen name="step-3" />
    </Stack>
  );
}
