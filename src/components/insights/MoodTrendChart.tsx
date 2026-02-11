import { CartesianChart, Line } from "victory-native";
import { useMemo } from "react";
import { Text, View } from "react-native";
import type { MoodPoint } from "@/src/insights/selectors";

interface MoodTrendChartProps {
  moodSeries: MoodPoint[];
}

export function MoodTrendChart({ moodSeries }: MoodTrendChartProps) {
  const data = useMemo(
    () =>
      moodSeries
        .filter((p) => p.mood > 0)
        .map((p, i) => ({
          index: i,
          date: p.date,
          mood: p.mood,
        })),
    [moodSeries]
  );

  if (data.length === 0) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-gray-500 dark:text-gray-400 text-sm">
          No mood data for this period
        </Text>
      </View>
    );
  }

  const dateByIndex = useMemo(
    () => Object.fromEntries(data.map((d, i) => [i, d.date])),
    [data]
  );

  return (
    <CartesianChart
      data={data}
      xKey="index"
      yKeys={["mood"]}
      domain={{ y: [1, 5] }}
      axisOptions={{
        tickCount: { x: Math.min(7, data.length), y: 5 },
        formatXLabel: (v) => {
          const i = typeof v === "number" ? v : 0;
          const d = dateByIndex[i];
          return d ? d.slice(5) : "";
        },
        formatYLabel: (v) => String(Math.round(v as number)),
      }}
    >
      {({ points }) => (
        <Line
          points={points.mood}
          color="#8B5CF6"
          strokeWidth={2}
          curveType="natural"
          animate={{ type: "timing", duration: 500 }}
        />
      )}
    </CartesianChart>
  );
}
