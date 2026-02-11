import { useAuth } from "@/src/providers/AuthProvider";
import {
  useGoogleAuth,
  signInWithApple,
  getGoogleIdToken,
  hasGoogleClientIdConfigured,
} from "@/src/auth/oauth";
import { ensurePushPermissions, getExpoPushToken, registerPushToken, setReminderPrefs } from "@/src/lib/push";
import { apiFetch } from "@/src/lib/api";
import { buildDeepLink, openUrl } from "@/src/lib/linking";
import { setOnboardingCompleted } from "@/src/lib/prefs";
import { isIOS } from "@/src/lib/platform";
import { ApiError } from "@/src/lib/errors";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const TIME_OPTIONS = [
  "06:00", "07:00", "08:00", "09:00", "10:00",
  "12:00", "14:00", "16:00", "18:00", "20:00", "20:30", "21:00", "22:00",
];

function getTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "America/New_York";
  } catch {
    return "America/New_York";
  }
}

export default function SettingsScreen() {
  const { token, signOut, user, linkedProviders, hasPassword, refreshUser } = useAuth();
  const router = useRouter();
  const { request: googleRequest, response: googleResponse, promptAsync: googlePromptAsync } = useGoogleAuth();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [timeLocal, setTimeLocal] = useState("20:30");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingTest, setSendingTest] = useState(false);
  const [accountAction, setAccountAction] = useState<"link-google" | "link-apple" | null>(null);
  const linkProcessedRef = useRef(false);

  const loadPrefs = useCallback(async () => {
    if (!token) return;
    try {
      const prefs = await apiFetch<{ enabled: boolean; timeLocal: string; timezone: string }>(
        "/api/push/preferences",
        { token }
      );
      setPushEnabled(prefs.enabled);
      setTimeLocal(prefs.timeLocal);
    } catch {
      setStatus("Failed to load preferences");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  useEffect(() => {
    if (!accountAction || accountAction !== "link-google" || !googleResponse || linkProcessedRef.current) return;
    if (googleResponse.type !== "success") {
      setAccountAction(null);
      linkProcessedRef.current = false;
      return;
    }
    const idToken = getGoogleIdToken(googleResponse);
    if (!idToken || !token) {
      setAccountAction(null);
      linkProcessedRef.current = false;
      return;
    }
    linkProcessedRef.current = true;
    apiFetch("/api/auth/oauth/link", { method: "POST", body: { provider: "google", idToken }, token })
      .then(() => {
        setStatus("Google connected");
        refreshUser();
      })
      .catch((e) => {
        setStatus(e instanceof ApiError ? e.message : "Failed to connect Google");
      })
      .finally(() => {
        setAccountAction(null);
        linkProcessedRef.current = false;
      });
  }, [accountAction, googleResponse, token, refreshUser]);

  const handleEnablePush = useCallback(
    async (enabled: boolean) => {
      if (!token) return;

      if (enabled) {
        const status = await ensurePushPermissions();
        if (status === "denied") {
          Alert.alert(
            "Permission needed",
            "Please enable notifications in your device settings to receive reminders."
          );
          return;
        }
        const pushToken = await getExpoPushToken();
        if (!pushToken) {
          setStatus("Failed to get push token");
          return;
        }
        try {
          await registerPushToken(pushToken, token);
        } catch {
          setStatus("Failed to register for push");
          return;
        }
      }

      try {
        await setReminderPrefs(
          { enabled, timeLocal, timezone: getTimezone() },
          token
        );
        setPushEnabled(enabled);
        setStatus(enabled ? "Reminders enabled" : "Reminders disabled");
      } catch {
        setStatus("Failed to update preferences");
      }
    },
    [token, timeLocal]
  );

  const handleTimeChange = useCallback(
    async (newTime: string) => {
      setTimeLocal(newTime);
      if (!token || !pushEnabled) return;
      try {
        await setReminderPrefs(
          { enabled: true, timeLocal: newTime, timezone: getTimezone() },
          token
        );
      } catch {
        setStatus("Failed to update time");
      }
    },
    [token, pushEnabled]
  );

  const handleSendTest = useCallback(async () => {
    if (!token) return;
    setSendingTest(true);
    setStatus(null);
    try {
      const res = await apiFetch<{ sent: number; tokens: string[] }>(
        "/api/push/send-test",
        { method: "POST", token }
      );
      setStatus(res.sent > 0 ? `Test sent to ${res.sent} device(s)` : "No push tokens registered");
    } catch (e) {
      setStatus("Failed to send test notification");
    } finally {
      setSendingTest(false);
    }
  }, [token]);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/(auth)/login");
  };

  const googleConnected = linkedProviders.includes("google");
  const appleConnected = linkedProviders.includes("apple");
  const canUnlinkGoogle = googleConnected && (appleConnected || hasPassword);
  const canUnlinkApple = appleConnected && (googleConnected || hasPassword);

  const handleConnectGoogle = async () => {
    if (!googleRequest || !token) return;
    setAccountAction("link-google");
    setStatus(null);
    linkProcessedRef.current = false;
    const result = await googlePromptAsync();
    if (result.type !== "success") {
      setAccountAction(null);
      if (result.type !== "cancel" && result.type !== "dismiss") {
        setStatus("Google sign-in was cancelled");
      }
    }
  };

  const handleConnectApple = async () => {
    if (!token) return;
    setAccountAction("link-apple");
    setStatus(null);
    try {
      const idToken = await signInWithApple();
      setAccountAction(null);
      if (!idToken) {
        setStatus("Apple Sign In is not available");
        return;
      }
      await apiFetch("/api/auth/oauth/link", { method: "POST", body: { provider: "apple", idToken }, token });
      setStatus("Apple connected");
      refreshUser();
    } catch (e) {
      setAccountAction(null);
      setStatus(e instanceof ApiError ? e.message : "Failed to connect Apple");
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!token || !canUnlinkGoogle) return;
    try {
      await apiFetch("/api/auth/oauth/unlink/google", { method: "DELETE", token });
      setStatus("Google disconnected");
      refreshUser();
    } catch (e) {
      setStatus(e instanceof ApiError ? e.message : "Cannot disconnect");
    }
  };

  const handleDisconnectApple = async () => {
    if (!token || !canUnlinkApple) return;
    try {
      await apiFetch("/api/auth/oauth/unlink/apple", { method: "DELETE", token });
      setStatus("Apple disconnected");
      refreshUser();
    } catch (e) {
      setStatus(e instanceof ApiError ? e.message : "Cannot disconnect");
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900">
      <View className="p-6">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Settings</Text>

        <View testID="settings-account" className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-6">
          <Text className="text-gray-600 dark:text-gray-400 text-sm">Account</Text>
          <Text className="text-gray-900 dark:text-white font-medium mt-1">{user?.email}</Text>

          <View className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
            <Text className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Sign-in methods</Text>

            <View className="flex-row items-center justify-between py-2">
              <Text className="text-gray-900 dark:text-white">Google</Text>
              <View className="flex-row items-center gap-2">
                <Text className="text-gray-500 dark:text-gray-400 text-sm">
                  {googleConnected ? "Connected" : "Not connected"}
                </Text>
                {googleConnected ? (
                  <TouchableOpacity
                    testID="account-google-disconnect"
                    onPress={handleDisconnectGoogle}
                    disabled={!canUnlinkGoogle}
                    className={`py-2 px-3 rounded-lg ${canUnlinkGoogle ? "bg-red-100 dark:bg-red-900/30" : "bg-gray-200 dark:bg-gray-700 opacity-50"}`}
                  >
                    <Text className={`text-sm font-medium ${canUnlinkGoogle ? "text-red-600 dark:text-red-400" : "text-gray-500"}`}>
                      Disconnect
                    </Text>
                  </TouchableOpacity>
                ) : (
                  hasGoogleClientIdConfigured() && (
                    <TouchableOpacity
                      testID="account-google-connect"
                      onPress={handleConnectGoogle}
                      disabled={!!accountAction}
                      className="bg-blue-600 py-2 px-3 rounded-lg"
                    >
                      {accountAction === "link-google" ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text className="text-white text-sm font-medium">Connect</Text>
                      )}
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>

            {isIOS && (
              <View className="flex-row items-center justify-between py-2">
                <Text className="text-gray-900 dark:text-white">Apple</Text>
                <View className="flex-row items-center gap-2">
                  <Text className="text-gray-500 dark:text-gray-400 text-sm">
                    {appleConnected ? "Connected" : "Not connected"}
                  </Text>
                  {appleConnected ? (
                    <TouchableOpacity
                      testID="account-apple-disconnect"
                      onPress={handleDisconnectApple}
                      disabled={!canUnlinkApple}
                      className={`py-2 px-3 rounded-lg ${canUnlinkApple ? "bg-red-100 dark:bg-red-900/30" : "bg-gray-200 dark:bg-gray-700 opacity-50"}`}
                    >
                      <Text className={`text-sm font-medium ${canUnlinkApple ? "text-red-600 dark:text-red-400" : "text-gray-500"}`}>
                        Disconnect
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      testID="account-apple-connect"
                      onPress={handleConnectApple}
                      disabled={!!accountAction}
                      className="bg-black dark:bg-white py-2 px-3 rounded-lg"
                    >
                      {accountAction === "link-apple" ? (
                        <ActivityIndicator size="small" color={isIOS ? "#fff" : "#000"} />
                      ) : (
                        <Text className="text-white dark:text-black text-sm font-medium">Connect</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            <View className="flex-row items-center justify-between py-2">
              <Text className="text-gray-900 dark:text-white">Password</Text>
              <Text className="text-gray-500 dark:text-gray-400 text-sm">
                {hasPassword ? "Set" : "Not set"}
              </Text>
            </View>
          </View>
        </View>

        <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Push notifications
        </Text>
        <View className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-gray-900 dark:text-white">Enable reminders</Text>
            <Switch
              testID="settings-enable-push"
              value={pushEnabled}
              onValueChange={handleEnablePush}
              trackColor={{ false: "#d1d5db", true: "#2563eb" }}
              thumbColor="#fff"
            />
          </View>

          {pushEnabled && (
            <View className="mb-4">
              <Text className="text-gray-600 dark:text-gray-400 text-sm mb-2">Reminder time</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
                {TIME_OPTIONS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    testID="settings-push-time"
                    className={`px-3 py-2 rounded-lg mr-2 ${
                      timeLocal === t ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
                    }`}
                    onPress={() => handleTimeChange(t)}
                  >
                    <Text
                      className={
                        timeLocal === t
                          ? "text-white font-medium"
                          : "text-gray-700 dark:text-gray-300"
                      }
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <TouchableOpacity
            testID="settings-send-test"
            className={`rounded-lg p-3 items-center justify-center ${sendingTest ? "bg-gray-400" : "bg-blue-600"}`}
            onPress={handleSendTest}
            disabled={sendingTest}
          >
            {sendingTest ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-center">Send test notification</Text>
            )}
          </TouchableOpacity>
        </View>

        {status && (
          <View className="bg-gray-100 dark:bg-gray-800 rounded p-3 mb-6">
            <Text className="text-gray-700 dark:text-gray-300 text-sm">{status}</Text>
          </View>
        )}

        {__DEV__ && (
          <>
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Developer
            </Text>
            <TouchableOpacity
              testID="settings-rerun-onboarding"
              onPress={async () => {
                await setOnboardingCompleted(false);
                router.replace("/(onboarding)/step-1");
              }}
              className="mb-3 py-3 rounded-lg bg-amber-200 dark:bg-amber-800 items-center"
            >
              <Text className="text-amber-900 dark:text-amber-100 font-medium">
                Re-run onboarding
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/(app)/demo")}
              className="mb-6 py-3 rounded-lg bg-indigo-200 dark:bg-indigo-800 items-center"
            >
              <Text className="text-indigo-900 dark:text-indigo-100 font-medium">
                Demo (quick actions)
              </Text>
            </TouchableOpacity>
          </>
        )}

        <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Test deep links
        </Text>
        <View className="flex-row gap-3 mb-6">
          <TouchableOpacity
            testID="settings-test-link-today"
            onPress={() => openUrl(buildDeepLink("today", { date: new Date().toISOString().slice(0, 10) }))}
            className="flex-1 py-3 rounded-lg bg-gray-200 dark:bg-gray-700 items-center"
          >
            <Text className="text-gray-900 dark:text-white font-medium">Today</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="settings-test-link-habit"
            onPress={() => openUrl(buildDeepLink("habits/00000000-0000-0000-0000-000000000001"))}
            className="flex-1 py-3 rounded-lg bg-gray-200 dark:bg-gray-700 items-center"
          >
            <Text className="text-gray-900 dark:text-white font-medium">Habit</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          className="bg-red-600 rounded-lg p-3"
          onPress={handleSignOut}
        >
          <Text className="text-white font-semibold text-center">Sign out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
