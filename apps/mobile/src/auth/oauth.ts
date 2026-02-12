import Constants from "expo-constants";
import * as AppleAuthentication from "expo-apple-authentication";
import * as WebBrowser from "expo-web-browser";
import { useIdTokenAuthRequest } from "expo-auth-session/providers/Google";
import { Platform } from "react-native";

WebBrowser.maybeCompleteAuthSession();

function getEnv(key: string): string | undefined {
  return (
    (Constants.expoConfig?.extra?.[key] as string | undefined) ??
    (typeof process !== "undefined" && (process.env as Record<string, string>)?.[key])
  );
}

export function useGoogleAuth() {
  const iosClientId = getEnv("EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID") || undefined;
  const androidClientId = getEnv("EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID") || undefined;
  const webClientId = getEnv("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID") || undefined;

  const clientId = Platform.select({
    ios: iosClientId ?? webClientId ?? "placeholder",
    android: androidClientId ?? webClientId ?? "placeholder",
    default: webClientId ?? "placeholder",
  });

  const [request, response, promptAsync] = useIdTokenAuthRequest(
    {
      iosClientId: iosClientId ?? undefined,
      androidClientId: androidClientId ?? undefined,
      webClientId: webClientId ?? undefined,
      clientId,
    },
    { useProxy: false }
  );

  return { request, response, promptAsync };
}

export function hasGoogleClientIdConfigured(): boolean {
  const ios = getEnv("EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID");
  const android = getEnv("EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID");
  const web = getEnv("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID");
  return !!(Platform.OS === "ios" ? (ios || web) : Platform.OS === "android" ? (android || web) : web);
}

export async function signInWithApple(): Promise<string | null> {
  if (Platform.OS !== "ios") {
    return null;
  }

  const hasSupport = await AppleAuthentication.isAvailableAsync();
  if (!hasSupport) {
    return null;
  }

  const result = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
    ],
  });

  return result.identityToken ?? null;
}

export function getGoogleIdToken(response: {
  type: string;
  params?: Record<string, string>;
  authentication?: { idToken?: string };
} | null): string | null {
  if (!response || response.type !== "success") return null;
  return (
    response.authentication?.idToken ??
    response.params?.id_token ??
    null
  );
}
