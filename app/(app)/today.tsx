import { useAuth } from "@/src/providers/AuthProvider";
import {
  getCompletionsForDate,
  getHabits,
  getMoodForDate,
  setCompletion,
  setMood,
  upsertHabitsFromApi,
} from "@/src/db/localData";
import {
  computeCurrentStreak,
  getLastNDaysCompletion,
} from "@/src/habits/streaks";
import { AnimatedCheck } from "@/src/components/ui/AnimatedCheck";
import { AnimatedMoodButton } from "@/src/components/ui/AnimatedMoodButton";
import { StreakCard } from "@/src/components/share/StreakCard";
import { shareStreakCard } from "@/src/share/shareStreakCard";
import { hapticSelect } from "@/src/lib/haptics";
import { useSync } from "@/src/hooks/useSync";
import { apiFetch } from "@/src/lib/api";
import { enqueueOp } from "@/src/sync/outbox";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { parseDateParam } from "@/src/lib/linking";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import ViewShot from "react-native-view-shot";

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const today = new Date();
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (isToday) return "Today";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function getDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(d: Date, delta: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + delta);
  return out;
}

export default function TodayScreen() {
  const { token, user } = useAuth();
  const { sync, isSyncing, lastResult } = useSync();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const initialDate = parseDateParam(date) ?? getDateStr(new Date());
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [habits, setHabits] = useState<Array<{ id: string; name: string; color?: string | null }>>([]);
  const [completions, setCompletions] = useState<Record<string, boolean>>({});
  const [mood, setMoodState] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const parsed = parseDateParam(date);
    if (parsed) setSelectedDate(parsed);
  }, [date]);

  const loadLocal = useCallback(() => {
    const habitRows = getHabits();
    setHabits(habitRows.map((h) => ({ id: h.id, name: h.name, color: h.color })));
    const compRows = getCompletionsForDate(selectedDate);
    const compMap: Record<string, boolean> = {};
    for (const c of compRows) {
      compMap[c.habitId] = c.done === 1;
    }
    setCompletions(compMap);
    const moodRow = getMoodForDate(selectedDate);
    setMoodState(moodRow?.mood ?? null);
  }, [selectedDate]);

  const fetchHabits = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiFetch<{
        habits: Array<{
          id: string;
          name: string;
          color?: string | null;
          isArchived?: boolean;
          updatedAt?: string;
        }>;
      }>("/api/habits?includeArchived=true", { token });
      upsertHabitsFromApi(res.habits);
      loadLocal();
    } catch {
      loadLocal();
    }
  }, [token, loadLocal]);

  useEffect(() => {
    loadLocal();
  }, [loadLocal]);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHabits();
    await sync();
    setRefreshing(false);
    loadLocal();
  }, [fetchHabits, sync, loadLocal]);

  const onPrevDay = useCallback(() => {
    setSelectedDate(getDateStr(addDays(new Date(selectedDate + "T12:00:00"), -1)));
  }, [selectedDate]);

  const onNextDay = useCallback(() => {
    const next = addDays(new Date(selectedDate + "T12:00:00"), 1);
    const today = new Date();
    if (next > today) return;
    setSelectedDate(getDateStr(next));
  }, [selectedDate]);

  const onToggleHabit = useCallback(
    (habitId: string) => {
      hapticSelect();
      const next = !completions[habitId];
      setCompletion(habitId, selectedDate, next);
      enqueueOp("completion.set", { date: selectedDate, habitId, done: next });
      setCompletions((prev) => ({ ...prev, [habitId]: next }));
      sync();
    },
    [selectedDate, completions, sync]
  );

  const onMoodSelect = useCallback(
    (value: number) => {
      hapticSelect();
      setMood(selectedDate, value);
      enqueueOp("mood.set", { date: selectedDate, mood: value });
      setMoodState(value);
      sync();
    },
    [selectedDate, sync]
  );

  const shareCardRef = useRef<ViewShot>(null);
  const [sharingHabit, setSharingHabit] = useState<{
    id: string;
    name: string;
    color?: string | null;
  } | null>(null);

  const onShareStreak = useCallback(
    async (habit: { id: string; name: string; color?: string | null }) => {
      hapticSelect();
      setSharingHabit(habit);
    },
    []
  );

  useEffect(() => {
    if (!sharingHabit) return;
    const timer = setTimeout(async () => {
      const asOfDate = new Date(selectedDate + "T12:00:00");
      const result = await shareStreakCard(shareCardRef, {
        dialogTitle: `Share ${sharingHabit.name} streak`,
        habitId: sharingHabit.id,
        habitName: sharingHabit.name,
      });
      setSharingHabit(null);
      if (!result.success) {
        Alert.alert("Share failed", result.error ?? "Could not share");
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [sharingHabit, selectedDate]);

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-gray-900"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View className="p-6">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {formatDisplayDate(selectedDate)}
        </Text>
        <Text className="text-gray-500 dark:text-gray-400 text-sm mb-4">
          {selectedDate}
        </Text>

        <View className="flex-row items-center gap-2 mb-6">
          <Pressable
            testID="today-date-prev"
            className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg"
            onPress={onPrevDay}
          >
            <Text className="text-gray-900 dark:text-white font-medium">← Prev</Text>
          </Pressable>
          <Pressable
            testID="today-date-next"
            className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg"
            onPress={onNextDay}
          >
            <Text className="text-gray-900 dark:text-white font-medium">Next →</Text>
          </Pressable>
        </View>

        {isSyncing && (
          <View className="flex-row items-center gap-2 mb-4" testID="today-sync-status">
            <ActivityIndicator size="small" />
            <Text className="text-gray-500 dark:text-gray-400 text-sm">Syncing…</Text>
          </View>
        )}
        {lastResult && (lastResult.failed > 0 || lastResult.error) && (
          <View
            className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded mb-4"
            testID="today-sync-status"
          >
            <Text className="text-amber-700 dark:text-amber-400 text-sm">
              {lastResult.error ?? `${lastResult.failed} op(s) failed to sync`}
            </Text>
          </View>
        )}

        <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Habits
        </Text>
        {habits.length === 0 ? (
          <Text className="text-gray-500 dark:text-gray-400 mb-6">
            No habits yet. Add some in the Habits tab.
          </Text>
        ) : (
          <View className="mb-6">
            {habits.map((h, index) => (
              <View
                key={h.id}
                testID={`today-habit-${h.id}`}
                className="flex-row items-center gap-3 py-3 border-b border-gray-200 dark:border-gray-700"
              >
                <Pressable
                  testID={`today-habit-item-${index}`}
                  className="flex-row items-center gap-3 flex-1"
                  onPress={() => onToggleHabit(h.id)}
                  accessibilityState={{ checked: !!completions[h.id] }}
                >
                  <AnimatedCheck
                    checked={!!completions[h.id]}
                    color={h.color || "#3B82F6"}
                    size={24}
                  />
                  {!!completions[h.id] && (
                    <View
                      testID={`today-habit-item-${index}-done`}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: h.color || "#3B82F6",
                        marginRight: 4,
                      }}
                      collapsable={false}
                    />
                  )}
                  <Text className="text-gray-900 dark:text-white flex-1">{h.name}</Text>
                </Pressable>
                <Pressable
                  testID={`share-streak-${h.id}`}
                  onPress={() => onShareStreak(h)}
                  className="p-2"
                  hitSlop={8}
                >
                  <Text className="text-blue-600 dark:text-blue-400 text-sm">Share</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <Modal visible={!!sharingHabit} transparent animationType="fade">
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.6)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {sharingHabit && (
              <ViewShot
                ref={shareCardRef}
                options={{ format: "png", result: "tmpfile" }}
                style={{ width: 375, height: 500 }}
              >
                <StreakCard
                  habitName={sharingHabit.name}
                  streak={computeCurrentStreak(sharingHabit.id, new Date(selectedDate + "T12:00:00"))}
                  last7={getLastNDaysCompletion(sharingHabit.id, 7, new Date(selectedDate + "T12:00:00"))}
                  generatedAt={new Date().toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  habitColor={sharingHabit.color}
                />
              </ViewShot>
            )}
          </View>
        </Modal>

        <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Mood
        </Text>
        <View className="flex-row gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((n) => (
            <AnimatedMoodButton
              key={n}
              value={n}
              selected={mood === n}
              onPress={() => onMoodSelect(n)}
              testID={`today-mood-${n}`}
            />
          ))}
        </View>

        <View className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
          <Text className="text-gray-600 dark:text-gray-400 text-sm">Logged in as</Text>
          <Text className="text-gray-900 dark:text-white font-medium mt-1">
            {user?.name || user?.email || "—"}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
