import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "../db/client";
import { habitCompletions } from "../db/schema";

function getDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(d: Date, delta: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + delta);
  return out;
}

/**
 * Compute the current streak for a habit as of the given date.
 * Streak = consecutive days with completions ending at asOfDate.
 * If asOfDate has a completion, count backwards. If not, streak is 0.
 */
export function computeCurrentStreak(habitId: string, asOfDate: Date): number {
  let current = new Date(asOfDate);
  let streak = 0;

  while (true) {
    const dateStr = getDateStr(current);
    const row = db
      .select()
      .from(habitCompletions)
      .where(
        and(eq(habitCompletions.habitId, habitId), eq(habitCompletions.date, dateStr))
      )
      .get();

    const done = row?.done === 1 || row?.done === true;
    if (!done) break;

    streak++;
    current = addDays(current, -1);
  }

  return streak;
}

/**
 * Get completion status for the last n days ending at asOfDate.
 * Returns array [oldest, ..., newest] where true = completed.
 * habit_completions only has rows when done=true, so existence = completed.
 */
export function getLastNDaysCompletion(
  habitId: string,
  n: number,
  asOfDate: Date
): boolean[] {
  const result: boolean[] = [];
  const startDate = addDays(asOfDate, -(n - 1));
  const startStr = getDateStr(startDate);
  const endStr = getDateStr(asOfDate);

  const rows = db
    .select({ date: habitCompletions.date })
    .from(habitCompletions)
    .where(
      and(
        eq(habitCompletions.habitId, habitId),
        gte(habitCompletions.date, startStr),
        lte(habitCompletions.date, endStr)
      )
    )
    .all();

  const completedDates = new Set(rows.map((r) => r.date).filter(Boolean) as string[]);

  for (let i = 0; i < n; i++) {
    const d = addDays(startDate, i);
    const dateStr = getDateStr(d);
    result.push(completedDates.has(dateStr));
  }

  return result;
}
