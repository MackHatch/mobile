import * as SecureStore from "expo-secure-store";

const ONBOARDING_COMPLETED_KEY = "onboardingCompleted";
const ONBOARDING_VERSION_KEY = "onboardingVersion";

export async function getOnboardingCompleted(): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(ONBOARDING_COMPLETED_KEY);
    return value === "1";
  } catch {
    return false;
  }
}

export async function setOnboardingCompleted(value: boolean): Promise<void> {
  try {
    if (value) {
      await SecureStore.setItemAsync(ONBOARDING_COMPLETED_KEY, "1");
      await SecureStore.setItemAsync(ONBOARDING_VERSION_KEY, "1");
    } else {
      await SecureStore.deleteItemAsync(ONBOARDING_COMPLETED_KEY);
      await SecureStore.deleteItemAsync(ONBOARDING_VERSION_KEY);
    }
  } catch {
    // ignore
  }
}
