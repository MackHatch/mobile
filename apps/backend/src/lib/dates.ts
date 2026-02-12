import { z } from "zod";

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

/**
 * Parse YYYY-MM-DD string to UTC midnight Date
 */
export function parseDateToUTC(dateStr: string): Date {
  const parsed = dateStringSchema.safeParse(dateStr);
  if (!parsed.success) {
    throw new Error("Invalid date format. Use YYYY-MM-DD");
  }
  return new Date(parsed.data + "T00:00:00.000Z");
}

export function formatDateToYYYYMMDD(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function daysBetween(from: Date, to: Date): number {
  const fromDay = new Date(from);
  fromDay.setUTCHours(0, 0, 0, 0);
  const toDay = new Date(to);
  toDay.setUTCHours(0, 0, 0, 0);
  return Math.floor((toDay.getTime() - fromDay.getTime()) / (24 * 60 * 60 * 1000)) + 1;
}
