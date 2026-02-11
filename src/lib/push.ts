import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { apiFetch } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/**
 * Request permissions without auto-granting. Returns "granted" or "denied".
 * Use when user explicitly opts in (e.g. onboarding toggle).
 */
export async function ensurePushPermissions(): Promise<"granted" | "denied"> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return "granted";

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted" ? "granted" : "denied";
}

export async function getExpoPushToken(): Promise<string | null> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return null;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch {
    return null;
  }
}

/**
 * Register push token with backend. Call after ensuring permissions.
 */
export async function registerPushToken(
  expoPushToken: string,
  authToken: string
): Promise<void> {
  await apiFetch("/api/push/register", {
    method: "POST",
    body: {
      expoPushToken,
      platform: Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : undefined,
    },
    token: authToken,
  });
}

export interface ReminderPrefs {
  enabled: boolean;
  timeLocal?: string;
  timezone?: string;
}

/**
 * Save reminder preferences to backend.
 */
export async function setReminderPrefs(
  prefs: ReminderPrefs,
  authToken: string
): Promise<void> {
  await apiFetch("/api/push/preferences", {
    method: "PUT",
    body: prefs,
    token: authToken,
  });
}
