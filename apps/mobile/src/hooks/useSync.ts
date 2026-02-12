import { useAuth } from "@/src/providers/AuthProvider";
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import type { SyncResult } from "@/src/sync/syncEngine";
import { syncNow } from "@/src/sync/syncEngine";

export function useSync(onComplete?: (result: SyncResult) => void) {
  const { token } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);

  const sync = useCallback(async () => {
    if (!token) return;
    setIsSyncing(true);
    try {
      const result = await syncNow(token);
      setLastResult(result);
      onComplete?.(result);
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [token, onComplete]);

  useFocusEffect(
    useCallback(() => {
      sync();
    }, [sync])
  );

  return { sync, isSyncing, lastResult };
}
