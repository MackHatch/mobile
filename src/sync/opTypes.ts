export type OpType =
  | "completion.set"
  | "mood.set"
  | "habit.create"
  | "habit.update";

export interface CompletionSetPayload {
  date: string;
  habitId: string;
  done: boolean;
}

export interface MoodSetPayload {
  date: string;
  mood: number;
  notes?: string;
}

export interface HabitCreatePayload {
  clientHabitId: string;
  name: string;
  color?: string;
}

export interface HabitUpdatePayload {
  habitId: string;
  name?: string;
  color?: string;
  isArchived?: boolean;
}

export type OutboxPayload =
  | CompletionSetPayload
  | MoodSetPayload
  | HabitCreatePayload
  | HabitUpdatePayload;
