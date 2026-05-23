import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const exercisesTable = pgTable("exercises", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  muscleGroups: text("muscle_groups").array().notNull().default([]),
  description: text("description"),
  isCustom: boolean("is_custom").notNull().default(false),
  /** NULL = global catalog; set = owner's internal users.id (not Clerk id). */
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  /** Soft-delete for custom exercises; keeps FK integrity for past workouts. */
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertExerciseSchema = createInsertSchema(exercisesTable).omit({ id: true, createdAt: true });
export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type Exercise = typeof exercisesTable.$inferSelect;
