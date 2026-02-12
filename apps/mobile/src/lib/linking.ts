import * as Linking from "expo-linking";

const SCHEME = "pulse";

/**
 * Build a deep link URL for the app.
 * @param path - Path without leading slash (e.g. "today", "habits/abc-123")
 * @param params - Optional query params
 */
export function buildDeepLink(
  path: string,
  params?: Record<string, string>
): string {
  const trimmed = path.startsWith("/") ? path.slice(1) : path;
  const base = `${SCHEME}://${trimmed}`;
  if (!params || Object.keys(params).length === 0) return base;
  const search = new URLSearchParams(params).toString();
  return `${base}?${search}`;
}

/**
 * Parse date param safely. Returns null if invalid.
 */
export function parseDateParam(dateStr: string | undefined): string | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const match = dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
  if (!match) return null;
  const d = new Date(dateStr + "T12:00:00");
  if (Number.isNaN(d.getTime())) return null;
  return dateStr;
}

/**
 * Open a URL (deep link or external). Use for testing or programmatic navigation.
 */
export function openUrl(url: string): void {
  Linking.openURL(url).catch(() => {});
}
