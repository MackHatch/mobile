import { useAuth } from "@/src/providers/AuthProvider";
import {
  computeCurrentStreak,
  getLastNDaysCompletion,
} from "@/src/habits/streaks";
import { getHabitById } from "@/src/habits/habitRepo";
import { StreakCard } from "@/src/components/share/StreakCard";
import { shareStreakCard } from "@/src/share/shareStreakCard";
import { hapticSelect } from "@/src/lib/haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import ViewShot from "react-native-view-shot";

const COLOR_PRESETS = [
  { value: "#3B82F6", label: "Blue" },
  { value: "#10B981", label: "Green" },
  { value: "#8B5CF6", label: "Purple" },
  { value: "#F59E0B", label: "Amber" },
  { value: "#EC4899", label: "Pink" },
];

function getDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function HabitDetailScreen() {
  const { habitId, share } = useLocalSearchParams<{ habitId: string; share?: string }>();
  const router = useRouter();
  const habit = habitId ? getHabitById(habitId) : undefined;
  const todayStr = getDateStr(new Date());
  const asOfDate = new Date(todayStr + "T12:00:00");
  const [sharing, setSharing] = useState(share === "1");
  const shareCardRef = useRef<ViewShot>(null);

  const streak = habit ? computeCurrentStreak(habit.id, asOfDate) : 0;
  const last7 = habit ? getLastNDaysCompletion(habit.id, 7, asOfDate) : [];

  const onShare = useCallback(async () => {
    if (!habit) return;
    hapticSelect();
    setSharing(true);
  }, [habit]);

  useEffect(() => {
    if (!sharing || !habit) return;
    const timer = setTimeout(async () => {
      const result = await shareStreakCard(shareCardRef, {
        dialogTitle: `Share ${habit.name} streak`,
        habitId: habit.id,
        habitName: habit.name,
      });
      setSharing(false);
      if (!result.success) {
        Alert.alert("Share failed", result.error ?? "Could not share");
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [sharing, habit]);

  useEffect(() => {
    if (habitId && !habit) {
      router.replace("/(app)/habits");
    }
  }, [habitId, habit, router]);

  if (!habit) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <Text className="text-gray-500 dark:text-gray-400">Habit not found</Text>
      </View>
    );
  }

  const accentColor = habit.color || COLOR_PRESETS[0].value;

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900">
      <View className="p-6">
        <View className="flex-row items-center gap-3 mb-6">
          <View
            className="w-6 h-6 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">
            {habit.name}
          </Text>
        </View>

        <View className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 mb-6">
          <Text className="text-gray-600 dark:text-gray-400 text-sm mb-1">
            Current streak
          </Text>
          <Text className="text-3xl font-bold text-gray-900 dark:text-white">
            {streak} days
          </Text>
        </View>

        <View className="mb-6">
          <Text className="text-gray-600 dark:text-gray-400 text-sm mb-2">
            Last 7 days
          </Text>
          <View className="flex-row gap-2">
            {last7.map((done, i) => (
              <View
                key={i}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{
                  backgroundColor: done ? accentColor : "rgba(156, 163, 175, 0.3)",
                }}
              >
                <Text className="text-white font-medium">
                  {done ? "✓" : "—"}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Pressable
          testID="habit-detail-share"
          onPress={onShare}
          className="bg-blue-600 py-3 rounded-lg items-center"
        >
          <Text className="text-white font-semibold">Share streak</Text>
        </Pressable>
      </View>

      <Modal visible={sharing} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {sharing && (
            <ViewShot
              ref={shareCardRef}
              options={{ format: "png", result: "tmpfile" }}
              style={{ width: 375, height: 500 }}
            >
              <StreakCard
                habitName={habit.name}
                streak={streak}
                last7={last7}
                generatedAt={new Date().toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                habitColor={habit.color}
              />
            </ViewShot>
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}
