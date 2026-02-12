import React from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const SPRING_CONFIG = { damping: 12, stiffness: 200 };
const DURATION = 180;

/**
 * Animated checkbox with scale pop and checkmark fade.
 * checked: whether the box shows as completed.
 */
export function AnimatedCheck({
  checked,
  color = "#3B82F6",
  size = 24,
}: {
  checked: boolean;
  color?: string;
  size?: number;
}) {
  const scale = useSharedValue(checked ? 1 : 0.95);
  const opacity = useSharedValue(checked ? 1 : 0);

  React.useEffect(() => {
    if (checked) {
      scale.value = withSpring(1, SPRING_CONFIG);
      opacity.value = withTiming(1, { duration: DURATION });
    } else {
      scale.value = withTiming(0.95, { duration: DURATION });
      opacity.value = withTiming(0, { duration: DURATION });
    }
  }, [checked]);

  const boxStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        boxStyle,
        {
          width: size,
          height: size,
          borderRadius: size / 6,
          borderWidth: 2,
          borderColor: checked ? color : "#9CA3AF",
          backgroundColor: checked ? color : "transparent",
          alignItems: "center",
          justifyContent: "center",
        },
      ]}
    >
      <Animated.Text
        style={[
          checkStyle,
          {
            color: "#fff",
            fontWeight: "700",
            fontSize: size * 0.6,
          },
        ]}
      >
        ✓
      </Animated.Text>
    </Animated.View>
  );
}
