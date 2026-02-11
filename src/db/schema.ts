import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const habits = sqliteTable("habits", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color"),
  isArchived: integer("is_archived", { mode: "boolean" }).default(false),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
  syncedAt: integer("synced_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export const habitCompletions = sqliteTable("habit_completions", {
  id: text("id").primaryKey(),
  habitId: text("habit_id").notNull(),
  date: text("date").notNull(),
  done: integer("done", { mode: "boolean" }).default(true),
  syncedAt: integer("synced_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export const moodEntries = sqliteTable("mood_entries", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  mood: integer("mood").notNull(),
  notes: text("notes"),
  syncedAt: integer("synced_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export const outbox = sqliteTable("outbox", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  payloadJson: text("payload_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  attempts: integer("attempts").default(0).notNull(),
  lastError: text("last_error"),
});
