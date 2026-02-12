/**
 * Backend integration smoke test.
 * Run: npm run test:smoke
 * Requires: backend running on BASE_URL, DB migrated.
 */
const BASE_URL = process.env.API_URL ?? "http://localhost:4000";

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function run(): Promise<void> {
  const timestamp = Date.now();
  const email = `smoke-${timestamp}@test.local`;
  const password = "SmokeTest123!";

  console.log("🧪 Backend smoke test");
  console.log("   BASE_URL:", BASE_URL);
  console.log("   Email:", email);

  // 1. Register
  console.log("\n1. Register...");
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name: "Smoke Test" }),
  });
  if (!regRes.ok) {
    const text = await regRes.text();
    throw new Error(`Register failed: ${regRes.status} ${text}`);
  }
  const { token, user } = (await regRes.json()) as { token: string; user: { id: string } };
  console.log("   ✓ Registered, user id:", user.id);

  // 2. Login (sanity check)
  console.log("\n2. Login...");
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
  const { token: loginToken } = (await loginRes.json()) as { token: string };
  console.log("   ✓ Logged in");

  const authToken = loginToken ?? token;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${authToken}`,
  };

  // 3. Create habit (via API)
  console.log("\n3. Create habit...");
  const habitRes = await fetch(`${BASE_URL}/api/habits`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: "Smoke Habit", color: "#3B82F6" }),
  });
  if (!habitRes.ok) throw new Error(`Create habit failed: ${habitRes.status}`);
  const { habit } = (await habitRes.json()) as { habit: { id: string } };
  const habitId = habit.id;
  console.log("   ✓ Habit created:", habitId);

  // 4. Sync: habit.create + completion.set + mood.set (simulates mobile outbox)
  const dateStr = today();
  const opId1 = uuid();
  const opId2 = uuid();
  const opId3 = uuid();

  console.log("\n4. Sync (habit.create, completion.set, mood.set)...");
  const syncRes = await fetch(`${BASE_URL}/api/sync`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      ops: [
        {
          id: opId1,
          type: "habit.create",
          payload: {
            clientHabitId: uuid(),
            name: "Sync Test Habit",
            color: "#10B981",
          },
        },
        {
          id: opId2,
          type: "completion.set",
          payload: { date: dateStr, habitId, done: true },
        },
        {
          id: opId3,
          type: "mood.set",
          payload: { date: dateStr, mood: 4 },
        },
      ],
    }),
  });
  if (!syncRes.ok) {
    const text = await syncRes.text();
    throw new Error(`Sync failed: ${syncRes.status} ${text}`);
  }
  const syncResult = (await syncRes.json()) as {
    applied: string[];
    skipped: string[];
    failed: Array<{ opId: string; code: string; message: string }>;
  };
  console.log("   ✓ Applied:", syncResult.applied.length, "Skipped:", syncResult.skipped.length);

  // 5. Fetch checkin for today and assert
  console.log("\n5. Fetch checkin for today...");
  const checkinRes = await fetch(`${BASE_URL}/api/checkins/${dateStr}`, { headers });
  if (!checkinRes.ok) throw new Error(`Get checkin failed: ${checkinRes.status}`);
  const checkin = (await checkinRes.json()) as {
    date: string;
    mood?: number;
    completions: Array<{ habitId: string; done: boolean }>;
  };

  if (checkin.date !== dateStr) {
    throw new Error(`Expected date ${dateStr}, got ${checkin.date}`);
  }
  if (checkin.mood !== 4) {
    throw new Error(`Expected mood 4, got ${checkin.mood}`);
  }
  const completed = checkin.completions.filter((c) => c.done);
  if (completed.length < 1) {
    throw new Error(`Expected at least 1 completed habit, got ${completed.length}`);
  }

  console.log("   ✓ Date:", checkin.date, "Mood:", checkin.mood, "Completions:", completed.length);

  console.log("\n✅ Smoke test passed");
}

run().catch((err) => {
  console.error("\n❌ Smoke test failed:", err.message);
  process.exit(1);
});
