import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

/**
 * pulse://invite — placeholder for future invite flow.
 */
export default function InviteScreen() {
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900">
      <View className="p-6">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Invite
        </Text>
        <Text className="text-gray-600 dark:text-gray-400 mb-6">
          Coming soon. Invite friends to try Pulse!
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="bg-blue-600 py-3 rounded-lg items-center"
        >
          <Text className="text-white font-semibold">Go back</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
