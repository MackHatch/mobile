import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

const CARD_WIDTH = 375;
const CARD_HEIGHT = 500;

export interface StreakCardProps {
  habitName: string;
  streak: number;
  last7: boolean[];
  generatedAt: string;
  habitColor?: string | null;
}

export function StreakCard({
  habitName,
  streak,
  last7,
  generatedAt,
  habitColor,
}: StreakCardProps) {
  const accentColor = habitColor || "#3B82F6";

  return (
    <View style={[styles.container, { width: CARD_WIDTH, height: CARD_HEIGHT }]}>
      <LinearGradient
        colors={["#6366F1", "#8B5CF6", "#A855F7"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        <Text style={styles.appName}>Pulse</Text>
        <Text style={styles.habitName}>{habitName}</Text>
        <Text style={styles.streakText}>
          {streak === 0
            ? "Start your streak!"
            : `${streak}-day streak`}
        </Text>

        <View style={styles.grid}>
          {last7.map((done, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: done ? accentColor : "rgba(255,255,255,0.3)" },
              ]}
            />
          ))}
        </View>
        <Text style={styles.gridLabel}>Last 7 days</Text>

        <Text style={styles.generatedAt}>{generatedAt}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: "hidden",
  },
  content: {
    flex: 1,
    padding: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  appName: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 2,
    marginBottom: 8,
  },
  habitName: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 12,
  },
  streakText: {
    fontSize: 22,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 32,
  },
  grid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  gridLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 24,
  },
  generatedAt: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
  },
});
