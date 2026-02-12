/**
 * Seed demo user with habits, completions, and mood entries.
 * demo@pulse.com / DemoPass123!
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@pulse.com";
const DEMO_PASSWORD = "DemoPass123!";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  const user = existing ?? await prisma.user.create({
    data: { email: DEMO_EMAIL, passwordHash, name: "Demo User" },
  });

  // Upsert habits: Water, Walk, Read
  const habitsData = [
    { name: "Water", color: "#3B82F6" },
    { name: "Walk", color: "#10B981" },
    { name: "Read", color: "#8B5CF6" },
  ];

  const habitIds: string[] = [];
  for (const h of habitsData) {
    const existingHabit = await prisma.habit.findFirst({
      where: { userId: user.id, name: h.name },
    });
    if (existingHabit) {
      habitIds.push(existingHabit.id);
    } else {
      const created = await prisma.habit.create({
        data: { userId: user.id, name: h.name, color: h.color },
      });
      habitIds.push(created.id);
    }
  }

  // Last 7 days completions (vary which habits done each day)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let d = 0; d < 7; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    const dateOnly = new Date(date.toISOString().slice(0, 10) + "T00:00:00.000Z");

    for (let i = 0; i < habitIds.length; i++) {
      // Complete 1-2 habits per day on average
      const shouldComplete = (d + i) % 2 === 0 || (d === 0 && i < 2);
      await prisma.habitCompletion.upsert({
        where: {
          userId_habitId_date: { userId: user.id, habitId: habitIds[i], date: dateOnly },
        },
        create: { userId: user.id, habitId: habitIds[i], date: dateOnly, done: shouldComplete },
        update: { done: shouldComplete },
      });
    }

    // Mood 1-5, vary by day
    const mood = 2 + (d % 4);
    await prisma.moodEntry.upsert({
      where: { userId_date: { userId: user.id, date: dateOnly } },
      create: { userId: user.id, date: dateOnly, mood },
      update: { mood },
    });
  }

  console.log(`Seeded demo user: ${DEMO_EMAIL}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
