import { eq } from "drizzle-orm";
import { db } from "./client";
import { habitCompletions, moodEntries } from "./schema";
import {
  getHabits as getHabitsFromRepo,
  upsertHabitsFromApi as upsertHabitsFromApiInRepo,
  type HabitRow,
} from "../habits/habitRepo";

export type { HabitRow };

export interface CompletionRow {
  id: string;
  habitId: string;
  date: string;
  done: number;
}

export interface MoodRow {
  id: string;
  date: string;
  mood: number;
  notes: string | null;
}

export function upsertHabitsFromApi(
  apiHabits: Array<{
    id: string;
    name: string;
    color?: string | null;
    isArchived?: boolean;
    updatedAt?: string;
  }>
): void {
  upsertHabitsFromApiInRepo(apiHabits);
}

export function getHabits(): HabitRow[] {
  return getHabitsFromRepo(false);
}

export function getCompletionsForDate(date: string): CompletionRow[] {
  return db.select()
    .from(habitCompletions)
    .where(eq(habitCompletions.date, date))
    .all() as CompletionRow[];
}

export function getMoodForDate(date: string): MoodRow | undefined {
  return db.select()
    .from(moodEntries)
    .where(eq(moodEntries.date, date))
    .get() as MoodRow | undefined;
}

function completionId(habitId: string, date: string): string {
  return `${habitId}-${date}`;
}

export function setCompletion(habitId: string, date: string, done: boolean): void {
  const id = completionId(habitId, date);
  if (done) {
    db.insert(habitCompletions)
      .values({
        id,
        habitId,
        date,
        done: true,
      })
      .onConflictDoUpdate({
        target: habitCompletions.id,
        set: { done: true },
      })
      .run();
  } else {
    db.delete(habitCompletions).where(eq(habitCompletions.id, id)).run();
  }
}

/**
 * Merge checkin data from backend into local DB.
 * Used to bootstrap demo user with seeded completions/mood.
 */
export function upsertCheckinFromApi(
  date: string,
  data: {
    mood?: number;
    completions?: Array<{ habitId: string; done: boolean }>;
  }
): void {
  if (data.mood != null) {
    setMood(date, data.mood);
  }
  if (data.completions?.length) {
    for (const c of data.completions) {
      setCompletion(c.habitId, date, c.done);
    }
  }
}

export function setMood(date: string, mood: number, notes?: string): void {
  const id = `mood-${date}`;
  db.insert(moodEntries)
    .values({
      id,
      date,
      mood,
      notes: notes ?? null,
    })
    .onConflictDoUpdate({
      target: moodEntries.id,
      set: { mood, notes: notes ?? null },
    })
    .run();
}
