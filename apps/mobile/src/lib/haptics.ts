import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/** Light tap feedback for selections (toggle, picker). */
export function hapticSelect(): void {
  if (Platform.OS === "web") return;
  Haptics.selectionAsync().catch(() => {});
}

/** Success feedback for confirmations (save, complete). */
export function hapticSuccess(): void {
  if (Platform.OS === "web") return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** Warning feedback for destructive or cautionary actions (archive). */
export function hapticWarning(): void {
  if (Platform.OS === "web") return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

/** Error feedback for failures. */
export function hapticError(): void {
  if (Platform.OS === "web") return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}
