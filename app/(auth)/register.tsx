import { useAuth } from "@/src/providers/AuthProvider";
import { ApiError } from "@/src/lib/errors";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "At least 8 characters"),
  name: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", name: "" },
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      await signUp(data.email, data.password, data.name);
      router.replace("/");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Registration failed";
      setError(msg);
    }
  };

  return (
    <View className="flex-1 bg-white dark:bg-gray-900 p-6 justify-center">
      <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Sign up</Text>

      {error && (
        <View className="bg-red-50 dark:bg-red-900/20 p-3 rounded mb-4">
          <Text className="text-red-600 dark:text-red-400">{error}</Text>
        </View>
      )}

      <View className="mb-4">
        <Text className="text-gray-700 dark:text-gray-300 mb-2">Name (optional)</Text>
        <TextInput
          testID="register-name"
          className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-gray-900 dark:text-white"
          placeholder="Your name"
          placeholderTextColor="#9ca3af"
          onChangeText={(t) => setValue("name", t)}
          onBlur={() => register("name")}
        />
      </View>

      <View className="mb-4">
        <Text className="text-gray-700 dark:text-gray-300 mb-2">Email</Text>
        <TextInput
          testID="register-email"
          className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-gray-900 dark:text-white"
          placeholder="you@example.com"
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={(t) => setValue("email", t)}
          onBlur={() => register("email")}
        />
        {errors.email && (
          <Text className="text-red-500 mt-1">{errors.email.message}</Text>
        )}
      </View>

      <View className="mb-4">
        <Text className="text-gray-700 dark:text-gray-300 mb-2">Password</Text>
        <TextInput
          testID="register-password"
          className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-gray-900 dark:text-white"
          placeholder="••••••••"
          placeholderTextColor="#9ca3af"
          secureTextEntry
          onChangeText={(t) => setValue("password", t)}
          onBlur={() => register("password")}
        />
        {errors.password && (
          <Text className="text-red-500 mt-1">{errors.password.message}</Text>
        )}
      </View>

      <TouchableOpacity
        testID="register-submit"
        className="bg-blue-600 rounded-lg p-3 mb-4"
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
      >
        <Text className="text-white font-semibold text-center">
          {isSubmitting ? "Creating account…" : "Sign up"}
        </Text>
      </TouchableOpacity>

      <Link href="/(auth)/login" asChild>
        <TouchableOpacity>
          <Text className="text-blue-600 dark:text-blue-400 text-center">
            Already have an account? Sign in
          </Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}
