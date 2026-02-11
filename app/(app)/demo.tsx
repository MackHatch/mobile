/**
 * Dev-only Demo screen for quick reviewer demos.
 * Hidden behind __DEV__; reachable from Settings.
 */
import { useAuth } from "@/src/providers/AuthProvider";
import { getHabits } from "@/src/habits/habitRepo";
import { buildDeepLink, openUrl } from "@/src/lib/linking";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { apiFetch } from "@/src/lib/api";

export default function DemoScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  const handleOpenTodayLink = useCallback(() => {
    openUrl(buildDeepLink("today", { date: todayStr }));
  }, [todayStr]);

  const handleOpenHabitLink = useCallback(() => {
    const habits = getHabits(false);
    const habitId = habits[0]?.id ?? "00000000-0000-0000-0000-000000000001";
    openUrl(buildDeepLink(`habits/${habitId}`));
  }, []);

  const handleShareFirst = useCallback(() => {
    const habits = getHabits(false);
    if (habits.length === 0) {
      router.push("/(app)/habits");
      return;
    }
    router.push(`/share/habit/${habits[0].id}`);
  }, [router]);

  const handleSendTestPush = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiFetch<{ sent: number }>("/api/push/send-test", {
        method: "POST",
        token,
      });
      alert(`Test push sent to ${res.sent} device(s)`);
    } catch {
      alert("Failed to send test push (enable reminders first)");
    } finally {
      setLoading(false);
    }
  }, [token]);

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900">
      <View testID="demo-screen" className="p-6">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Demo
        </Text>
        <Text className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          Quick actions for reviewer demos
        </Text>

        <View className="gap-3">
          <Pressable
            testID="demo-open-today-link"
            onPress={handleOpenTodayLink}
            className="bg-blue-600 py-3 rounded-lg items-center"
          >
            <Text className="text-white font-medium">Open today deep link</Text>
          </Pressable>

          <Pressable
            onPress={handleOpenHabitLink}
            className="bg-blue-600 py-3 rounded-lg items-center"
          >
            <Text className="text-white font-medium">Open habit deep link</Text>
          </Pressable>

          <Pressable
            testID="demo-share-first"
            onPress={handleShareFirst}
            className="bg-purple-600 py-3 rounded-lg items-center"
          >
            <Text className="text-white font-medium">Trigger share card (first habit)</Text>
          </Pressable>

          <Pressable
            onPress={handleSendTestPush}
            disabled={loading}
            className="bg-amber-600 py-3 rounded-lg items-center"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-medium">Send test push</Text>
            )}
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
