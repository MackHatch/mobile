import { useAuth } from "@/src/providers/AuthProvider";
import {
  ensurePushPermissions,
  getExpoPushToken,
  registerPushToken,
  setReminderPrefs,
} from "@/src/lib/push";
import { setOnboardingCompleted } from "@/src/lib/prefs";
import { hapticSelect } from "@/src/lib/haptics";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function getTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "America/New_York";
  } catch {
    return "America/New_York";
  }
}

export default function OnboardingStep3() {
  const router = useRouter();
  const { token } = useAuth();
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleToggleReminders = useCallback(
    async (enabled: boolean) => {
      if (!enabled) {
        setRemindersEnabled(false);
        return;
      }
      setLoading(true);
      const status = await ensurePushPermissions();
      setLoading(false);
      if (status === "denied") {
        Alert.alert(
          "Permission needed",
          "Enable notifications in your device settings to receive daily reminders."
        );
        return;
      }
      const pushToken = await getExpoPushToken();
      if (!pushToken || !token) {
        setRemindersEnabled(false);
        return;
      }
      try {
        await registerPushToken(pushToken, token);
        await setReminderPrefs(
          { enabled: true, timeLocal: "20:00", timezone: getTimezone() },
          token
        );
        setRemindersEnabled(true);
      } catch {
        setRemindersEnabled(false);
      }
    },
    [token]
  );

  const onFinish = useCallback(async () => {
    hapticSelect();
    await setOnboardingCompleted(true);
    router.replace("/(app)/today");
  }, [router]);

  const onSkip = useCallback(async () => {
    hapticSelect();
    await setOnboardingCompleted(true);
    router.replace("/(app)/today");
  }, [router]);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900" edges={["top", "bottom"]}>
      <View className="flex-1 px-8 pt-16 pb-8">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Daily reminders
        </Text>
        <Text className="text-gray-600 dark:text-gray-400 mb-8">
          Get a gentle nudge to log your habits. You can change this anytime in Settings.
        </Text>

        <View className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 mb-8">
          <View className="flex-row items-center justify-between">
            <Text className="text-gray-900 dark:text-white font-medium">
              Enable reminders
            </Text>
            <Switch
              testID="ob-enable-reminders"
              value={remindersEnabled}
              onValueChange={handleToggleReminders}
              disabled={loading}
              trackColor={{ false: "#d1d5db", true: "#2563eb" }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View className="mt-auto gap-3">
          <Pressable
            testID="ob-finish"
            onPress={onFinish}
            className="bg-blue-600 py-4 rounded-xl items-center active:opacity-90"
          >
            <Text className="text-white font-semibold text-lg">Finish</Text>
          </Pressable>
          <Pressable
            testID="ob-skip"
            onPress={onSkip}
            className="py-4 rounded-xl items-center active:opacity-90"
          >
            <Text className="text-gray-600 dark:text-gray-400 font-medium">
              Not now
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
