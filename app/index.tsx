import { useAuth } from "@/src/providers/AuthProvider";
import { getOnboardingCompleted } from "@/src/lib/prefs";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

type BootstrapStatus = "loading" | "auth" | "onboarding" | "app";

export default function Index() {
  const { token, isLoading } = useAuth();
  const [status, setStatus] = useState<BootstrapStatus>("loading");

  useEffect(() => {
    (async () => {
      if (isLoading) return;

      if (!token) {
        setStatus("auth");
        return;
      }

      const onboardingDone = await getOnboardingCompleted();
      setStatus(onboardingDone ? "app" : "onboarding");
    })();
  }, [token, isLoading]);

  if (isLoading || status === "loading") {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (status === "auth") {
    return <Redirect href="/(auth)/login" />;
  }

  if (status === "onboarding") {
    return <Redirect href="/(onboarding)/step-1" />;
  }

  return <Redirect href="/(app)/today" />;
}
