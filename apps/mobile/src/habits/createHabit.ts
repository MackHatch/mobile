import { createHabit as createHabitInRepo } from "./habitRepo";

/**
 * Create a habit locally and enqueue an outbox op for sync.
 */
export function createHabit(id: string, name: string, color?: string): void {
  createHabitInRepo(id, name, color);
}
