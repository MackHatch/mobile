import { useAuth } from "@/src/providers/AuthProvider";
import {
  useGoogleAuth,
  signInWithApple,
  getGoogleIdToken,
  hasGoogleClientIdConfigured,
} from "@/src/auth/oauth";
import { ApiError } from "@/src/lib/errors";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});

type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const { signIn, signInWithOAuth } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);
  const processedResponseRef = useRef(false);

  const { request, response, promptAsync } = useGoogleAuth();

  useEffect(() => {
    if (!response || response.type !== "success" || processedResponseRef.current) return;
    const idToken = getGoogleIdToken(response);
    if (!idToken) return;
    processedResponseRef.current = true;
    setOauthLoading(null);
    signInWithOAuth("google", idToken)
      .then(() => router.replace("/"))
      .catch((e) => {
        setError(e instanceof ApiError ? e.message : "Google sign-in failed");
        processedResponseRef.current = false;
      });
  }, [response, signInWithOAuth, router]);

  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const DEMO_EMAIL = "demo@pulse.com";
  const DEMO_PASSWORD = "DemoPass123!";

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      await signIn(data.email, data.password);
      router.replace("/");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Login failed";
      setError(msg);
    }
  };

  const onDemoPress = async () => {
    setError(null);
    setValue("email", DEMO_EMAIL);
    setValue("password", DEMO_PASSWORD);
    await new Promise((r) => setTimeout(r, 50));
    try {
      await signIn(DEMO_EMAIL, DEMO_PASSWORD);
      router.replace("/");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Login failed";
      setError(msg);
    }
  };

  const onGooglePress = async () => {
    setError(null);
    if (!request) return;
    processedResponseRef.current = false;
    setOauthLoading("google");
    try {
      const result = await promptAsync();
      if (result.type !== "success") {
        setOauthLoading(null);
        if (result.type === "cancel" || result.type === "dismiss") return;
        setError("Google sign-in was cancelled");
      }
    } catch (e) {
      setOauthLoading(null);
      setError("Google sign-in failed");
    }
  };

  const onApplePress = async () => {
    setError(null);
    setOauthLoading("apple");
    try {
      const idToken = await signInWithApple();
      setOauthLoading(null);
      if (!idToken) {
        setError("Apple Sign In is not available");
        return;
      }
      await signInWithOAuth("apple", idToken);
      router.replace("/");
    } catch (e) {
      setOauthLoading(null);
      setError(e instanceof ApiError ? e.message : "Apple sign-in failed");
    }
  };

  const showGoogleButton = hasGoogleClientIdConfigured();

  return (
    <View className="flex-1 bg-white dark:bg-gray-900 p-6 justify-center">
      <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Sign in</Text>

      {error && (
        <View className="bg-red-50 dark:bg-red-900/20 p-3 rounded mb-4">
          <Text className="text-red-600 dark:text-red-400">{error}</Text>
        </View>
      )}

      {showGoogleButton && (
        <TouchableOpacity
          testID="login-google"
          className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-3 mb-4 flex-row items-center justify-center"
          onPress={onGooglePress}
          disabled={!request || oauthLoading !== null}
        >
          {oauthLoading === "google" ? (
            <ActivityIndicator size="small" color="#1f2937" />
          ) : (
            <Text className="text-gray-800 dark:text-gray-200 font-medium">
              Continue with Google
            </Text>
          )}
        </TouchableOpacity>
      )}

      {Platform.OS === "ios" && (
        <TouchableOpacity
          testID="login-apple"
          className="bg-black dark:bg-white rounded-lg p-3 mb-4 flex-row items-center justify-center"
          onPress={onApplePress}
          disabled={oauthLoading !== null}
        >
          {oauthLoading === "apple" ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-white dark:text-black font-medium">
              Continue with Apple
            </Text>
          )}
        </TouchableOpacity>
      )}

      <View className="flex-row items-center my-4">
        <View className="flex-1 h-px bg-gray-300 dark:bg-gray-600" />
        <Text className="mx-4 text-gray-500 dark:text-gray-400 text-sm">or</Text>
        <View className="flex-1 h-px bg-gray-300 dark:bg-gray-600" />
      </View>

      <View className="mb-4">
        <Text className="text-gray-700 dark:text-gray-300 mb-2">Email</Text>
        <TextInput
          testID="login-email"
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
          testID="login-password"
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
        testID="login-submit"
        className="bg-blue-600 rounded-lg p-3 mb-4"
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
      >
        <Text className="text-white font-semibold text-center">
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Text>
      </TouchableOpacity>

      {__DEV__ && (
        <TouchableOpacity
          testID="login-demo"
          className="bg-amber-500 rounded-lg p-3 mb-4"
          onPress={onDemoPress}
          disabled={isSubmitting}
        >
          <Text className="text-white font-semibold text-center">
            Sign in as demo user
          </Text>
        </TouchableOpacity>
      )}

      <Link href="/(auth)/register" asChild>
        <TouchableOpacity>
          <Text className="text-blue-600 dark:text-blue-400 text-center">
            Need an account? Sign up
          </Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}
