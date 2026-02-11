import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { outbox } from "../db/schema";
import type { OpType, OutboxPayload } from "./opTypes";

export type { OpType, OutboxPayload } from "./opTypes";

export function enqueueOp(type: OpType, payload: OutboxPayload): string {
  const id = crypto.randomUUID();
  db.insert(outbox).values({
    id,
    type,
    payloadJson: JSON.stringify(payload),
    attempts: 0,
  }).run();
  return id;
}

export function getPendingOps(limit = 100): Array<{ id: string; type: string; payloadJson: string; createdAt: Date }> {
  return db.select()
    .from(outbox)
    .orderBy(outbox.createdAt)
    .limit(limit)
    .all() as Array<{ id: string; type: string; payloadJson: string; createdAt: Date }>;
}

export function markApplied(ids: string[]): void {
  for (const id of ids) {
    db.delete(outbox).where(eq(outbox.id, id)).run();
  }
}

export function markFailed(id: string, error: string): void {
  const row = db.select({ attempts: outbox.attempts }).from(outbox).where(eq(outbox.id, id)).get();
  const attempts = (row?.attempts ?? 0) + 1;
  db.update(outbox)
    .set({ attempts, lastError: error })
    .where(eq(outbox.id, id))
    .run();
}
