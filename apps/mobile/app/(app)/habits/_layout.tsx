import { Stack } from "expo-router";

export default function HabitsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Habits", headerShown: true }} />
      <Stack.Screen name="[habitId]" options={{ title: "Habit" }} />
    </Stack>
  );
}
