import {
  computeHabitStats,
  computeKpis,
  computeMoodSeries,
  getDateRange,
} from "@/src/insights/selectors";
import { HabitRateChart } from "@/src/components/insights/HabitRateChart";
import { MoodTrendChart } from "@/src/components/insights/MoodTrendChart";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

type RangeOption = 7 | 30;

export default function InsightsScreen() {
  const [rangeDays, setRangeDays] = useState<RangeOption>(7);

  const { from, to, dates, days } = useMemo(
    () => getDateRange(rangeDays, new Date()),
    [rangeDays]
  );

  const habitStats = useMemo(() => computeHabitStats(from, to), [from, to]);
  const moodSeries = useMemo(() => computeMoodSeries(from, to), [from, to]);
  const kpis = useMemo(
    () => computeKpis(habitStats, moodSeries, days),
    [habitStats, moodSeries, days]
  );

  const rangeLabel = `${from} – ${to}`;

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900">
      <View className="p-6">
        <View className="flex-row gap-2 mb-6" testID="insights-range">
          <Pressable
            onPress={() => setRangeDays(7)}
            className={`px-4 py-2 rounded-lg ${
              rangeDays === 7 ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
            }`}
          >
            <Text
              className={
                rangeDays === 7
                  ? "text-white font-semibold"
                  : "text-gray-700 dark:text-gray-300"
              }
            >
              7 days
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setRangeDays(30)}
            className={`px-4 py-2 rounded-lg ${
              rangeDays === 30 ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
            }`}
          >
            <Text
              className={
                rangeDays === 30
                  ? "text-white font-semibold"
                  : "text-gray-700 dark:text-gray-300"
              }
            >
              30 days
            </Text>
          </Pressable>
        </View>

        <Text className="text-gray-500 dark:text-gray-400 text-sm mb-4">
          {rangeLabel}
        </Text>

        <View
          className="flex-row flex-wrap gap-3 mb-6"
          testID="insights-kpis"
        >
          <Animated.View
            entering={FadeInUp.duration(200).delay(0)}
            className="flex-1 min-w-[100px] bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl"
          >
            <Text className="text-gray-600 dark:text-gray-400 text-xs mb-1">
              Completion
            </Text>
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">
              {Math.round(kpis.completionPercent)}%
            </Text>
          </Animated.View>
          <Animated.View
            entering={FadeInUp.duration(200).delay(50)}
            className="flex-1 min-w-[100px] bg-purple-50 dark:bg-purple-900/30 p-4 rounded-xl"
          >
            <Text className="text-gray-600 dark:text-gray-400 text-xs mb-1">
              Avg Mood
            </Text>
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">
              {kpis.avgMood != null ? kpis.avgMood.toFixed(1) : "—"}
            </Text>
          </Animated.View>
          <Animated.View
            entering={FadeInUp.duration(200).delay(100)}
            className="flex-1 min-w-[100px] bg-amber-50 dark:bg-amber-900/30 p-4 rounded-xl"
          >
            <Text className="text-gray-600 dark:text-gray-400 text-xs mb-1">
              Best Streak
            </Text>
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">
              {kpis.bestStreak} days
            </Text>
          </Animated.View>
        </View>

        <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Habit completion rate
        </Text>
        <View
          className="h-48 mb-6 bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden"
          testID="insights-chart-habits"
        >
          <HabitRateChart stats={habitStats} />
        </View>

        <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Mood trend
        </Text>
        <View
          className="h-48 bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden"
          testID="insights-chart-mood"
        >
          <MoodTrendChart moodSeries={moodSeries} />
        </View>
      </View>
    </ScrollView>
  );
}
