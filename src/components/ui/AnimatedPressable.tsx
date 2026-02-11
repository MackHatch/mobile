import React from "react";
import { Pressable, type PressableProps } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const DURATION = 150;

/**
 * Pressable with subtle scale-down on press for tactile feedback.
 * Use for list items, buttons.
 */
export function AnimatedPressable({
  children,
  style,
  ...props
}: PressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      {...props}
      onPressIn={() => {
        scale.value = withTiming(0.97, { duration: DURATION });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: DURATION });
      }}
    >
      <Animated.View style={[animatedStyle, style as object]}>{children}</Animated.View>
    </Pressable>
  );
}
