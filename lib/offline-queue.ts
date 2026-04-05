/**
 * Offline Action Queue
 *
 * Queues mutations (workout logs, meal logs) when the device is offline
 * and replays them automatically when connectivity is restored.
 *
 * Usage:
 *   import { offlineQueue } from "@/lib/offline-queue";
 *   // Instead of calling the API directly:
 *   await offlineQueue.enqueue("logWorkout", payload);
 *   // The queue auto-syncs when online, or call:
 *   await offlineQueue.flush();
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";

// ── Types ──────────────────────────────────────────────────────────────

export interface QueuedAction {
  id: string;
  type: "logWorkout" | "logMeal" | "logWeight" | "logCheckin";
  payload: Record<string, any>;
  createdAt: string;
  retries: number;
  status: "pending" | "syncing" | "failed";
}

export interface QueueStats {
  pending: number;
  failed: number;
  total: number;
  oldestAt: string | null;
}

// ── Constants ──────────────────────────────────────────────────────────

const QUEUE_KEY = "@offline_action_queue";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// ── Helpers ────────────────────────────────────────────────────────────

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function loadQueue(): Promise<QueuedAction[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveQueue(queue: QueuedAction[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

// ── Sync handlers (map action types to API calls) ──────────────────────

type SyncHandler = (payload: Record<string, any>) => Promise<void>;
const syncHandlers: Record<string, SyncHandler> = {};

/**
 * Register a handler that knows how to sync a given action type.
 * Call this at app startup for each action type.
 *
 * Example:
 *   registerSyncHandler("logWorkout", async (payload) => {
 *     await trpcClient.workout.log.mutate(payload);
 *   });
 */
export function registerSyncHandler(
  type: QueuedAction["type"],
  handler: SyncHandler
): void {
  syncHandlers[type] = handler;
}

// ── Listeners ──────────────────────────────────────────────────────────

type QueueListener = (stats: QueueStats) => void;
const listeners = new Set<QueueListener>();

export function onQueueChange(listener: QueueListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners(queue: QueuedAction[]) {
  const stats = getStatsFromQueue(queue);
  listeners.forEach((fn) => fn(stats));
}

function getStatsFromQueue(queue: QueuedAction[]): QueueStats {
  const pending = queue.filter((a) => a.status === "pending").length;
  const failed = queue.filter((a) => a.status === "failed").length;
  const sorted = [...queue].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  return {
    pending,
    failed,
    total: queue.length,
    oldestAt: sorted[0]?.createdAt ?? null,
  };
}

// ── Core queue operations ──────────────────────────────────────────────

/**
 * Add an action to the offline queue.
 * If the device is online AND a handler is registered, attempts
 * to sync immediately. Otherwise queues for later.
 */
export async function enqueue(
  type: QueuedAction["type"],
  payload: Record<string, any>
): Promise<QueuedAction> {
  const action: QueuedAction = {
    id: generateId(),
    type,
    payload,
    createdAt: new Date().toISOString(),
    retries: 0,
    status: "pending",
  };

  // Try immediate sync if online
  const netState = await NetInfo.fetch();
  if (netState.isConnected && syncHandlers[type]) {
    try {
      await syncHandlers[type](payload);
      // Success — no need to queue
      return { ...action, status: "syncing" };
    } catch {
      // Failed — fall through to queue
    }
  }

  // Queue for later
  const queue = await loadQueue();
  queue.push(action);
  await saveQueue(queue);
  notifyListeners(queue);
  return action;
}

/**
 * Attempt to sync all pending actions in FIFO order.
 * Called automatically on connectivity change, or manually.
 */
export async function flush(): Promise<{ synced: number; failed: number }> {
  const queue = await loadQueue();
  let synced = 0;
  let failed = 0;
  const remaining: QueuedAction[] = [];

  for (const action of queue) {
    if (action.status === "failed" && action.retries >= MAX_RETRIES) {
      remaining.push(action); // Keep for manual review
      failed++;
      continue;
    }

    const handler = syncHandlers[action.type];
    if (!handler) {
      remaining.push(action);
      continue;
    }

    try {
      action.status = "syncing";
      await handler(action.payload);
      synced++;
      // Don't add to remaining — it's synced
    } catch {
      action.retries++;
      action.status = action.retries >= MAX_RETRIES ? "failed" : "pending";
      remaining.push(action);
      failed++;
    }
  }

  await saveQueue(remaining);
  notifyListeners(remaining);
  return { synced, failed };
}

/**
 * Remove a specific action from the queue (e.g., user cancels).
 */
export async function remove(actionId: string): Promise<void> {
  const queue = await loadQueue();
  const filtered = queue.filter((a) => a.id !== actionId);
  await saveQueue(filtered);
  notifyListeners(filtered);
}

/**
 * Clear all actions (pending + failed).
 */
export async function clearAll(): Promise<void> {
  await saveQueue([]);
  notifyListeners([]);
}

/**
 * Get current queue statistics.
 */
export async function getStats(): Promise<QueueStats> {
  const queue = await loadQueue();
  return getStatsFromQueue(queue);
}

/**
 * Get all queued actions for display in UI.
 */
export async function getAll(): Promise<QueuedAction[]> {
  return loadQueue();
}

// ── Network listener (auto-flush on reconnect) ────────────────────────

let unsubscribeNetInfo: (() => void) | null = null;

/**
 * Start listening for connectivity changes.
 * Call once at app startup (e.g., in _layout.tsx).
 */
export function startAutoSync(): void {
  if (unsubscribeNetInfo) return; // Already listening

  unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
    if (state.isConnected) {
      // Small delay to let the connection stabilise
      setTimeout(() => {
        flush().catch(() => {});
      }, RETRY_DELAY_MS);
    }
  });
}

/**
 * Stop listening (cleanup).
 */
export function stopAutoSync(): void {
  unsubscribeNetInfo?.();
  unsubscribeNetInfo = null;
}

// ── React hook ─────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";

/**
 * React hook for monitoring the offline queue.
 *
 * Returns current stats and actions for UI display.
 */
export function useOfflineQueue() {
  const [stats, setStats] = useState<QueueStats>({
    pending: 0,
    failed: 0,
    total: 0,
    oldestAt: null,
  });
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Initial load
    getStats().then(setStats);

    // Listen for queue changes
    const unsub = onQueueChange(setStats);

    // Listen for network changes
    const unsubNet = NetInfo.addEventListener((state) => {
      setIsOnline(!!state.isConnected);
    });

    return () => {
      unsub();
      unsubNet();
    };
  }, []);

  const retryAll = useCallback(async () => {
    return flush();
  }, []);

  const clearFailed = useCallback(async () => {
    const queue = await loadQueue();
    const filtered = queue.filter((a) => a.status !== "failed");
    await saveQueue(filtered);
    notifyListeners(filtered);
  }, []);

  return {
    stats,
    isOnline,
    retryAll,
    clearFailed,
    enqueue,
    flush,
  };
}

// ── Convenience: bundled export ────────────────────────────────────────

export const offlineQueue = {
  enqueue,
  flush,
  remove,
  clearAll,
  getStats,
  getAll,
  startAutoSync,
  stopAutoSync,
  registerSyncHandler,
  onQueueChange,
  useOfflineQueue,
};
