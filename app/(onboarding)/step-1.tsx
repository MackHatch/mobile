import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Pressable, Text, View } from "react-native";
import { hapticSelect } from "@/src/lib/haptics";

export default function OnboardingStep1() {
  const router = useRouter();

  const onContinue = () => {
    hapticSelect();
    router.push("/(onboarding)/step-2");
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900" edges={["top", "bottom"]}>
      <View className="flex-1 px-8 pt-16 pb-8">
        <Text className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Pulse
        </Text>
        <Text className="text-lg text-gray-600 dark:text-gray-400 mb-12">
          Build habits. Track your mood. Stay consistent.
        </Text>

        <View className="mb-12">
          <Bullet text="Log habits daily and build lasting streaks" />
          <Bullet text="Track your mood to spot patterns" />
          <Bullet text="Get reminders and insights to stay on track" />
        </View>

        <View className="mt-auto">
          <Pressable
            testID="ob-continue-1"
            onPress={onContinue}
            className="bg-blue-600 py-4 rounded-xl items-center active:opacity-90"
          >
            <Text className="text-white font-semibold text-lg">Continue</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View className="flex-row items-center mb-4">
      <View className="w-2 h-2 rounded-full bg-blue-600 mr-3" />
      <Text className="text-gray-700 dark:text-gray-300 text-base flex-1">{text}</Text>
    </View>
  );
}
