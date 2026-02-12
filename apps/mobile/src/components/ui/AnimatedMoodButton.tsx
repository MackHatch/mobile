import React, { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const SPRING = { damping: 12, stiffness: 200 };

/**
 * Mood 1–5 button with selected "pop" (scale + opacity).
 */
export function AnimatedMoodButton({
  value,
  selected,
  onPress,
  testID,
}: {
  value: number;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const scale = useSharedValue(selected ? 1.05 : 1);
  const opacity = useSharedValue(selected ? 1 : 0.85);

  useEffect(() => {
    scale.value = withSpring(selected ? 1.05 : 1, SPRING);
    opacity.value = withSpring(selected ? 1 : 0.85, SPRING);
  }, [selected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Pressable onPress={onPress} className="flex-1" testID={testID}>
      <Animated.View style={animatedStyle}>
        <View
          className={`py-3 rounded-lg items-center ${
            selected ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
          }`}
        >
          <Text
            className={
              selected ? "text-white font-semibold" : "text-gray-600 dark:text-gray-300"
            }
          >
            {value}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}
