import {
  Bar,
  CartesianChart,
} from "victory-native";
import { useMemo } from "react";
import { Text, View } from "react-native";
import type { HabitStat } from "@/src/insights/selectors";

interface HabitRateChartProps {
  stats: HabitStat[];
}

export function HabitRateChart({ stats }: HabitRateChartProps) {
  const data = useMemo(
    () =>
      stats.map((h, i) => ({
        index: i,
        label: h.name,
        rate: Math.round(h.completionRate * 100) / 100,
      })),
    [stats]
  );

  if (data.length === 0) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-gray-500 dark:text-gray-400 text-sm">
          No habits to display
        </Text>
      </View>
    );
  }

  return (
    <CartesianChart
      data={data}
      xKey="index"
      yKeys={["rate"]}
      domain={{ y: [0, 1] }}
      axisOptions={{
        tickCount: { x: Math.min(5, data.length), y: 5 },
        formatXLabel: (v) => {
          const i = typeof v === "number" ? v : 0;
          return data[i]?.label?.slice(0, 8) ?? "";
        },
        formatYLabel: (v) => `${Math.round((v as number) * 100)}%`,
      }}
    >
      {({ points }) => (
        <Bar
          points={points.rate}
          color="#3B82F6"
          animate={{ type: "timing", duration: 500 }}
        />
      )}
    </CartesianChart>
  );
}
