import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Share } from "react-native";
import type { React.RefObject } from "react";
import type ViewShot from "react-native-view-shot";
import { buildDeepLink } from "@/src/lib/linking";

export interface ShareStreakCardResult {
  success: boolean;
  error?: string;
}

export interface ShareStreakCardOptions {
  dialogTitle?: string;
  habitId?: string;
  habitName?: string;
}

/**
 * Capture a view and share it via the native share sheet.
 * When habitId/habitName are provided, includes deep link text:
 * "My streak for <Habit> on Pulse: pulse://habits/<habitId>"
 * Uses Share.share (message + url) when possible; falls back to expo-sharing.
 */
export async function shareStreakCard(
  viewRef: React.RefObject<ViewShot | null>,
  options?: ShareStreakCardOptions
): Promise<ShareStreakCardResult> {
  try {
    const ref = viewRef.current;
    if (!ref || typeof ref.capture !== "function") {
      return { success: false, error: "View not ready for capture" };
    }

    const uri = await ref.capture({
      format: "png",
      result: "tmpfile",
      quality: 1,
      width: 375,
      height: 500,
    });

    if (!uri) {
      return { success: false, error: "Failed to capture image" };
    }

    const cachePath = `${FileSystem.cacheDirectory}streak-card-${Date.now()}.png`;
    await FileSystem.copyAsync({ from: uri, to: cachePath });
    const fileUri = cachePath.startsWith("file://") ? cachePath : `file://${cachePath}`;

    const linkText =
      options?.habitId && options?.habitName
        ? `My streak for ${options.habitName} on Pulse: ${buildDeepLink(`habits/${options.habitId}`)}`
        : undefined;

    if (linkText) {
      try {
        await Share.share({
          message: linkText,
          url: fileUri,
          title: options?.dialogTitle ?? "Share streak card",
        });
      } catch (shareErr) {
        /* Fall back to image-only if Share.share with url fails */
        const available = await Sharing.isAvailableAsync();
        if (available) {
          await Sharing.shareAsync(fileUri, {
            mimeType: "image/png",
            dialogTitle: options?.dialogTitle ?? "Share streak card",
          });
        } else {
          throw shareErr;
        }
      }
    } else {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        return { success: false, error: "Sharing is not available on this device" };
      }
      await Sharing.shareAsync(fileUri, {
        mimeType: "image/png",
        dialogTitle: options?.dialogTitle ?? "Share streak card",
      });
    }

    try {
      await FileSystem.deleteAsync(cachePath, { idempotent: true });
    } catch {
      /* optional cleanup - cache clears on app restart */
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to share";
    return { success: false, error: message };
  }
}
