import { useAuth } from "@/src/providers/AuthProvider";
import {
  archiveHabit,
  createHabit,
  getHabits,
  updateHabit,
  type HabitRow,
} from "@/src/habits/habitRepo";
import { useSync } from "@/src/hooks/useSync";
import { apiFetch } from "@/src/lib/api";
import { hapticSuccess, hapticWarning } from "@/src/lib/haptics";
import { AnimatedPressable } from "@/src/components/ui/AnimatedPressable";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

const COLOR_PRESETS = [
  { value: "#3B82F6", label: "Blue" },
  { value: "#10B981", label: "Green" },
  { value: "#8B5CF6", label: "Purple" },
  { value: "#F59E0B", label: "Amber" },
  { value: "#EC4899", label: "Pink" },
];

function HabitFormModal({
  visible,
  onClose,
  onSave,
  initialName = "",
  initialColor,
  mode,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, color?: string) => void;
  initialName?: string;
  initialColor?: string | null;
  mode: "add" | "edit";
}) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor ?? COLOR_PRESETS[0].value);

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setColor(initialColor ?? COLOR_PRESETS[0].value);
    }
  }, [visible, initialName, initialColor]);

  const handleSave = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed, color);
    setName("");
    setColor(COLOR_PRESETS[0].value);
    onClose();
  }, [name, color, onSave, onClose]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 justify-end bg-black/50">
        <View className="rounded-t-2xl bg-white dark:bg-gray-900 p-6 min-h-[300px]">
          <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {mode === "add" ? "Add habit" : "Edit habit"}
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Habit name"
            placeholderTextColor="#9CA3AF"
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white mb-4"
            autoFocus
          />
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Color
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-6">
            {COLOR_PRESETS.map((c) => (
              <Pressable
                key={c.value}
                onPress={() => setColor(c.value)}
                className="w-10 h-10 rounded-full border-2"
                style={{
                  backgroundColor: c.value,
                  borderColor: color === c.value ? "#1F2937" : "transparent",
                }}
              />
            ))}
          </View>
          <View className="flex-row gap-3">
            <Pressable
              onPress={onClose}
              className="flex-1 py-3 rounded-lg bg-gray-200 dark:bg-gray-700 items-center"
            >
              <Text className="text-gray-900 dark:text-white font-medium">
                Cancel
              </Text>
            </Pressable>
            <Pressable
              testID="habit-save"
              onPress={handleSave}
              className="flex-1 py-3 rounded-lg bg-blue-600 items-center"
            >
              <Text className="text-white font-medium">Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function HabitsScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const { sync } = useSync();
  const [habits, setHabits] = useState<HabitRow[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitRow | null>(null);

  const loadLocal = useCallback(() => {
    setHabits(getHabits(false));
  }, []);

  const fetchHabitsFromApi = useCallback(async () => {
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
      }>(`/api/habits?includeArchived=true`, { token });
      const { upsertHabitsFromApi } = await import("@/src/habits/habitRepo");
      upsertHabitsFromApi(res.habits);
      loadLocal();
    } catch {
      loadLocal();
    }
  }, [token, loadLocal]);

  useFocusEffect(
    useCallback(() => {
      loadLocal();
      fetchHabitsFromApi();
    }, [loadLocal, fetchHabitsFromApi])
  );

  const handleAddSave = useCallback(
    (name: string, color?: string) => {
      hapticSuccess();
      const id = crypto.randomUUID();
      createHabit(id, name, color);
      loadLocal();
      sync();
      setAddModalVisible(false);
    },
    [loadLocal, sync]
  );

  const handleEditSave = useCallback(
    (name: string, color?: string) => {
      if (!editingHabit) return;
      hapticSuccess();
      updateHabit(editingHabit.id, { name, color });
      loadLocal();
      sync();
      setEditModalVisible(false);
      setEditingHabit(null);
    },
    [editingHabit, loadLocal, sync]
  );

  const handleArchive = useCallback(
    (habit: HabitRow) => {
      hapticWarning();
      archiveHabit(habit.id);
      loadLocal();
      sync();
    },
    [loadLocal, sync]
  );

  const openEdit = useCallback((habit: HabitRow) => {
    setEditingHabit(habit);
    setEditModalVisible(true);
  }, []);

  const openHabitDetail = useCallback(
    (habit: HabitRow) => {
      router.push(`/habits/${habit.id}`);
    },
    [router]
  );

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      <ScrollView className="flex-1 p-6">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">
            Habits
          </Text>
          <Pressable
            testID="habits-add"
            onPress={() => setAddModalVisible(true)}
            className="bg-blue-600 px-4 py-2 rounded-lg"
          >
            <Text className="text-white font-semibold">Add habit</Text>
          </Pressable>
        </View>

        {habits.length === 0 ? (
          <Text className="text-gray-500 dark:text-gray-400">
            No habits yet. Tap "Add habit" to create one.
          </Text>
        ) : (
          <View>
            {habits.map((h) => (
              <View
                key={h.id}
                testID={`habit-item-${h.id}`}
                className="flex-row items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700"
              >
                <AnimatedPressable
                  className="flex-1 flex-row items-center gap-3"
                  onPress={() => openHabitDetail(h)}
                >
                  <View
                    className="w-4 h-4 rounded-full"
                    style={{
                      backgroundColor: h.color || COLOR_PRESETS[0].value,
                    }}
                  />
                  <Text className="text-gray-900 dark:text-white text-lg flex-1">
                    {h.name}
                  </Text>
                </AnimatedPressable>
                <View className="flex-row gap-2">
                  <AnimatedPressable
                    onPress={() => openEdit(h)}
                    className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700"
                  >
                    <Text className="text-gray-700 dark:text-gray-300 text-sm">
                      Edit
                    </Text>
                  </AnimatedPressable>
                  <AnimatedPressable
                    testID={`habit-archive-${h.id}`}
                    onPress={() => handleArchive(h)}
                    className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700"
                  >
                    <Text className="text-gray-700 dark:text-gray-300 text-sm">
                      Archive
                    </Text>
                  </AnimatedPressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <HabitFormModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onSave={handleAddSave}
        mode="add"
      />

      <HabitFormModal
        visible={editModalVisible}
        onClose={() => {
          setEditModalVisible(false);
          setEditingHabit(null);
        }}
        onSave={handleEditSave}
        initialName={editingHabit?.name ?? ""}
        initialColor={editingHabit?.color}
        mode="edit"
      />
    </View>
  );
}
