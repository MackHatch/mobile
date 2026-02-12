import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "../db/client";
import { habitCompletions, habits, moodEntries } from "../db/schema";
import { computeCurrentStreak } from "../habits/streaks";

function getDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(d: Date, delta: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + delta);
  return out;
}

export interface DateRange {
  from: string;
  to: string;
  dates: string[];
  days: number;
}

/**
 * Get date range for insights. Last N days ending at endDate.
 */
export function getDateRange(days: number, endDate: Date): DateRange {
  const toDate = new Date(endDate);
  toDate.setHours(12, 0, 0, 0);
  const fromDate = addDays(toDate, -(days - 1));
  const from = getDateStr(fromDate);
  const to = getDateStr(toDate);

  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    dates.push(getDateStr(addDays(fromDate, i)));
  }

  return { from, to, dates, days };
}

export interface HabitStat {
  id: string;
  name: string;
  color: string | null;
  completionCount: number;
  completionRate: number;
  currentStreak: number;
}

/**
 * Compute per-habit stats from local DB.
 */
export function computeHabitStats(from: string, to: string): HabitStat[] {
  const habitRows = db
    .select()
    .from(habits)
    .where(eq(habits.isArchived, false))
    .orderBy(habits.createdAt)
    .all() as Array<{ id: string; name: string; color: string | null }>;

  const fromDate = new Date(from + "T12:00:00");
  const toDate = new Date(to + "T12:00:00");
  const days = Math.floor((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;

  return habitRows.map((h) => {
    const completionRows = db
      .select({ date: habitCompletions.date })
      .from(habitCompletions)
      .where(
        and(
          eq(habitCompletions.habitId, h.id),
          gte(habitCompletions.date, from),
          lte(habitCompletions.date, to)
        )
      )
      .all();

    const completionCount = completionRows.length;
    const completionRate = days > 0 ? completionCount / days : 0;
    const currentStreak = computeCurrentStreak(h.id, toDate);

    return {
      id: h.id,
      name: h.name,
      color: h.color,
      completionCount,
      completionRate,
      currentStreak,
    };
  });
}

export interface MoodPoint {
  date: string;
  mood: number;
}

/**
 * Compute mood series by day from local DB.
 * Returns one entry per day in range; mood 0 if no entry.
 */
export function computeMoodSeries(from: string, to: string): MoodPoint[] {
  const toDate = new Date(to + "T12:00:00");
  const fromDate = new Date(from + "T12:00:00");
  const days =
    Math.floor((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)) +
    1;
  const range = getDateRange(days, toDate);

  const rows = db
    .select({ date: moodEntries.date, mood: moodEntries.mood })
    .from(moodEntries)
    .where(and(gte(moodEntries.date, from), lte(moodEntries.date, to)))
    .all();

  const moodByDate = new Map<string, number>();
  for (const r of rows) {
    moodByDate.set(r.date, r.mood);
  }

  return range.dates.map((date) => ({
    date,
    mood: moodByDate.get(date) ?? 0,
  }));
}

export interface Kpis {
  completionPercent: number;
  avgMood: number | null;
  bestStreak: number;
}

/**
 * Compute KPIs from habit stats and mood series.
 */
export function computeKpis(
  habitStats: HabitStat[],
  moodSeries: MoodPoint[],
  days: number
): Kpis {
  let totalCompletions = 0;
  for (const h of habitStats) {
    totalCompletions += h.completionCount;
  }

  const totalPossible =
    habitStats.length > 0 && days > 0 ? habitStats.length * days : 1;
  const completionPercent =
    totalPossible > 0
      ? Math.min(100, (totalCompletions / totalPossible) * 100)
      : 0;

  const bestStreak =
    habitStats.length > 0
      ? Math.max(...habitStats.map((h) => h.currentStreak))
      : 0;

  const moodValues = moodSeries.filter((p) => p.mood > 0).map((p) => p.mood);
  const avgMood =
    moodValues.length > 0
      ? moodValues.reduce((a, b) => a + b, 0) / moodValues.length
      : null;

  return {
    completionPercent,
    avgMood: avgMood !== null ? Math.round(avgMood * 100) / 100 : null,
    bestStreak,
  };
}
