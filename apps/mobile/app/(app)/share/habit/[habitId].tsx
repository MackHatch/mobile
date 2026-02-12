import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

/**
 * pulse://share/habit/:habitId — redirects to habit detail with share modal.
 */
export default function ShareHabitRedirect() {
  const { habitId } = useLocalSearchParams<{ habitId: string }>();
  const router = useRouter();

  useEffect(() => {
    if (habitId) {
      router.replace(`/habits/${habitId}?share=1`);
    } else {
      router.replace("/(app)/habits");
    }
  }, [habitId, router]);

  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
      <ActivityIndicator size="large" />
    </View>
  );
}
