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
  const { token, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  const handleJumpToToday = useCallback(() => {
    router.replace("/(app)/today");
    setStatus("Jumped to Today");
  }, [router]);

  const handleOpenTodayLink = useCallback(() => {
    openUrl(buildDeepLink("today", { date: todayStr }));
    setStatus(`Opened deep link: pulse://today?date=${todayStr}`);
  }, [todayStr]);

  const handleOpenHabitLink = useCallback(() => {
    const habits = getHabits(false);
    const habitId = habits[0]?.id ?? "00000000-0000-0000-0000-000000000001";
    openUrl(buildDeepLink(`habits/${habitId}`));
    setStatus(`Opened deep link: pulse://habits/${habitId}`);
  }, []);

  const handleShareFirst = useCallback(() => {
    const habits = getHabits(false);
    if (habits.length === 0) {
      setStatus("No habits — add one first");
      router.push("/(app)/habits");
      return;
    }
    router.push(`/share/habit/${habits[0].id}`);
    setStatus("Share card opened");
  }, [router]);

  const handleSendTestPush = useCallback(async () => {
    if (!token) {
      setStatus("Sign in first");
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const res = await apiFetch<{ sent: number }>("/api/push/send-test", {
        method: "POST",
        token,
      });
      setStatus(res.sent > 0 ? `Test push sent to ${res.sent} device(s)` : "No push tokens (enable reminders first)");
    } catch {
      setStatus("Failed to send test push");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const handleSwitchToDemo = useCallback(async () => {
    setStatus(null);
    await signOut();
    router.replace("/(auth)/login");
  }, [signOut, router]);

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900">
      <View testID="demo-screen" className="p-6">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Demo
        </Text>
        <Text className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          Quick actions for reviewer demos
        </Text>

        {status && (
          <View className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 mb-4">
            <Text className="text-gray-700 dark:text-gray-300 text-sm">{status}</Text>
          </View>
        )}

        <View className="gap-3">
          {token ? (
            <>
              <Pressable
                testID="demo-jump-today"
                onPress={handleJumpToToday}
                className="bg-blue-600 py-3 rounded-lg items-center"
              >
                <Text className="text-white font-medium">Jump to Today</Text>
              </Pressable>

              <Pressable
                testID="demo-open-today-link"
                onPress={handleOpenTodayLink}
                className="bg-blue-600 py-3 rounded-lg items-center"
              >
                <Text className="text-white font-medium">Open deep link (today)</Text>
              </Pressable>

              <Pressable
                onPress={handleOpenHabitLink}
                className="bg-blue-600 py-3 rounded-lg items-center"
              >
                <Text className="text-white font-medium">Open deep link (habit)</Text>
              </Pressable>

              <Pressable
                testID="demo-share-first"
                onPress={handleShareFirst}
                className="bg-purple-600 py-3 rounded-lg items-center"
              >
                <Text className="text-white font-medium">Trigger share card</Text>
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

              <Pressable
                onPress={handleSwitchToDemo}
                className="py-3 rounded-lg items-center border border-gray-300 dark:border-gray-600"
              >
                <Text className="text-gray-700 dark:text-gray-300 font-medium">Switch to demo user</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}
