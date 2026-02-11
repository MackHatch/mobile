import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { habits } from "../db/schema";
import { enqueueOp } from "../sync/outbox";

export interface HabitRow {
  id: string;
  name: string;
  color: string | null;
  isArchived: number;
  updatedAt: Date | null;
}

export function getHabits(includeArchived = false): HabitRow[] {
  const q = includeArchived
    ? db.select().from(habits).orderBy(habits.createdAt)
    : db.select().from(habits).where(eq(habits.isArchived, false)).orderBy(habits.createdAt);
  return q.all() as HabitRow[];
}

export function getHabitById(id: string): HabitRow | undefined {
  const row = db.select().from(habits).where(eq(habits.id, id)).get() as HabitRow | undefined;
  return row;
}

function nowTimestamp(): number {
  return Date.now();
}

export function createHabit(id: string, name: string, color?: string): void {
  const now = nowTimestamp();
  db.insert(habits)
    .values({
      id,
      name,
      color: color ?? null,
      isArchived: false,
      updatedAt: new Date(now),
      createdAt: new Date(now),
    })
    .run();
  enqueueOp("habit.create", { clientHabitId: id, name, color });
}

export function updateHabit(
  id: string,
  updates: { name?: string; color?: string; isArchived?: boolean }
): void {
  const existing = db.select().from(habits).where(eq(habits.id, id)).get();
  if (!existing) return;

  const now = nowTimestamp();
  const patch: Record<string, unknown> = { updatedAt: new Date(now) };
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.color !== undefined) patch.color = updates.color;
  if (updates.isArchived !== undefined) patch.isArchived = updates.isArchived;

  db.update(habits).set(patch as Record<string, never>).where(eq(habits.id, id)).run();
  enqueueOp("habit.update", { habitId: id, ...updates });
}

export function archiveHabit(id: string): void {
  updateHabit(id, { isArchived: true });
}

export function upsertHabitsFromApi(
  apiHabits: Array<{
    id: string;
    name: string;
    color?: string | null;
    isArchived?: boolean;
    updatedAt?: string | Date;
  }>
): void {
  for (const h of apiHabits) {
    const local = db.select().from(habits).where(eq(habits.id, h.id)).get() as HabitRow | undefined;
    const serverUpdatedAt = h.updatedAt
      ? (typeof h.updatedAt === "string" ? new Date(h.updatedAt).getTime() : (h.updatedAt as Date).getTime())
      : 0;
    const localUpdatedAt = local?.updatedAt ? new Date(local.updatedAt as Date).getTime() : 0;

    if (local && serverUpdatedAt <= localUpdatedAt) continue;

    db.insert(habits)
      .values({
        id: h.id,
        name: h.name,
        color: h.color ?? null,
        isArchived: h.isArchived ?? false,
        updatedAt: h.updatedAt ? new Date(h.updatedAt) : new Date(),
        createdAt: local?.createdAt ? new Date((local as { createdAt: Date }).createdAt) : new Date(),
      })
      .onConflictDoUpdate({
        target: habits.id,
        set: {
          name: h.name,
          color: h.color ?? null,
          isArchived: h.isArchived ?? false,
          updatedAt: h.updatedAt ? new Date(h.updatedAt) : new Date(),
        },
      })
      .run();
  }
}
