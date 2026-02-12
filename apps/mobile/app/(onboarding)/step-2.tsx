import { useAuth } from "@/src/providers/AuthProvider";
import { useSync } from "@/src/hooks/useSync";
import { createHabit } from "@/src/habits/createHabit";
import { STARTER_HABITS } from "@/src/onboarding/starterHabits";
import { hapticSelect } from "@/src/lib/haptics";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OnboardingStep2() {
  const router = useRouter();
  const { token } = useAuth();
  const { sync } = useSync();
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const toggle = useCallback((key: string) => {
    hapticSelect();
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const onContinue = useCallback(async () => {
    const keys = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (keys.length === 0) {
      Alert.alert("Select at least one", "Pick 1–3 habits to get started.");
      return;
    }
    hapticSelect();

    const habitsToCreate = STARTER_HABITS.filter((h) => keys.includes(h.key));
    for (const h of habitsToCreate) {
      const id = crypto.randomUUID();
      createHabit(id, h.label, h.color);
    }
    if (token) await sync();

    router.push("/(onboarding)/step-3");
  }, [selected, token, sync, router]);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900" edges={["top", "bottom"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 32, paddingTop: 64, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Pick starter habits
        </Text>
        <Text className="text-gray-600 dark:text-gray-400 mb-8">
          Choose 1–3 habits to track. You can add more later.
        </Text>

        <View className="mb-8">
          {STARTER_HABITS.map((h) => (
            <Pressable
              key={h.key}
              testID={`ob-habit-${h.key}`}
              onPress={() => toggle(h.key)}
              className={`flex-row items-center py-4 border-b border-gray-200 dark:border-gray-700 ${
                selected[h.key] ? "opacity-100" : "opacity-80"
              }`}
            >
              <View
                className="w-5 h-5 rounded border-2 mr-3 items-center justify-center"
                style={{
                  borderColor: h.color,
                  backgroundColor: selected[h.key] ? h.color : "transparent",
                }}
              >
                {selected[h.key] && (
                  <Text className="text-white text-xs font-bold">✓</Text>
                )}
              </View>
              <Text className="text-gray-900 dark:text-white text-lg flex-1">
                {h.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          testID="ob-continue-2"
          onPress={onContinue}
          className="bg-blue-600 py-4 rounded-xl items-center active:opacity-90"
        >
          <Text className="text-white font-semibold text-lg">Continue</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
