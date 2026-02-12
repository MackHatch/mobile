/**
 * Detox E2E: First run flow
 * - Login as demo user
 * - Complete onboarding (skip reminders)
 * - Toggle first habit on Today
 * - Assert habit shows as done
 *
 * Prerequisites:
 * - Backend running on EXPO_PUBLIC_API_URL (default localhost:4000)
 * - Demo user: demo@test.local / Demo123!
 *   Create via: make demo (seeds demo@pulse.com) or npm run db:seed
 */
import { device, element, by, expect, waitFor } from "detox";

const DEMO_EMAIL = "demo@pulse.com";
const DEMO_PASSWORD = "DemoPass123!";

describe("First run flow", () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      delete: true,
      permissions: { notifications: "YES" },
    });
  });

  it("logs in via demo button or form", async () => {
    await waitForScreen();

    const demoButton = element(by.id("login-demo"));
    const isDemoVisible = await isElementVisible(demoButton);

    if (isDemoVisible) {
      await demoButton.tap();
    } else {
      await element(by.id("login-email")).typeText(DEMO_EMAIL);
      await element(by.id("login-password")).typeText(DEMO_PASSWORD);
      await element(by.id("login-submit")).tap();
    }
    await new Promise((r) => setTimeout(r, 2000));
  });

  it("completes onboarding", async () => {
    await waitForScreen();

    // Step 1
    await element(by.id("ob-continue-1")).tap();
    await new Promise((r) => setTimeout(r, 500));

    // Step 2: select Drink water
    await element(by.id("ob-habit-drink-water")).tap();
    await element(by.id("ob-continue-2")).tap();
    await new Promise((r) => setTimeout(r, 500));

    // Step 3: skip reminders to avoid OS prompt
    await element(by.id("ob-skip")).tap();
    await new Promise((r) => setTimeout(r, 1500));
  });

  it("toggles first habit on Today and asserts done", async () => {
    await waitForScreen();

    // Wait for Today content
    await waitFor(element(by.id("today-habit-item-0")))
      .toBeVisible()
      .withTimeout(5000);

    // Tap to complete
    await element(by.id("today-habit-item-0")).tap();
    await new Promise((r) => setTimeout(r, 500));

    // Assert done indicator visible
    await expect(element(by.id("today-habit-item-0-done"))).toBeVisible();
  });
});

async function waitForScreen() {
  await new Promise((r) => setTimeout(r, 1500));
}

async function isElementVisible(
  el: ReturnType<typeof element>
): Promise<boolean> {
  try {
    await expect(el).toBeVisible();
    return true;
  } catch {
    return false;
  }
}
