import { apiFetch } from "../lib/api";
import { getPendingOps, markApplied, markFailed } from "./outbox";

export interface SyncResult {
  applied: number;
  skipped: number;
  failed: number;
  error?: string;
}

export async function syncNow(token: string): Promise<SyncResult> {
  const ops = getPendingOps(100);
  if (ops.length === 0) {
    return { applied: 0, skipped: 0, failed: 0 };
  }

  try {
    const body = {
      ops: ops.map((op) => ({
        id: op.id,
        type: op.type,
        payload: JSON.parse(op.payloadJson),
        createdAt: op.createdAt?.toISOString?.(),
      })),
    };

    const res = await apiFetch<{
      applied: string[];
      skipped: string[];
      failed: Array<{ opId: string; code: string; message: string }>;
    }>("/api/sync", {
      method: "POST",
      body,
      token,
    });

    markApplied([...res.applied, ...res.skipped]);

    for (const f of res.failed) {
      markFailed(f.opId, `${f.code}: ${f.message}`);
    }

    return {
      applied: res.applied.length,
      skipped: res.skipped.length,
      failed: res.failed.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return {
      applied: 0,
      skipped: 0,
      failed: ops.length,
      error: message,
    };
  }
}
