import type { ConfigContext, ExpoConfig } from "expo/config";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const appJson = require("./app.json");

export default ({ config }: ConfigContext): ExpoConfig => {
  const isDetox = process.env.APP_VARIANT === "detox";
  const base = appJson.expo as ExpoConfig;
  return {
    ...base,
    extra: {
      ...base.extra,
      EXPO_PUBLIC_API_URL:
        process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000",
      EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID:
        process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "",
      EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID:
        process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "",
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID:
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "",
    },
    ios: {
      ...base.ios,
      bundleIdentifier: isDetox ? "com.pulse.detox" : "com.pulse.mobile",
    },
    android: {
      ...(base.android as object),
      package: isDetox ? "com.pulse.detox" : "com.pulse.mobile",
    },
  };
};
