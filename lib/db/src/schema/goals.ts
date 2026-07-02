import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { exercisesTable } from "./exercises";

export const goalsTable = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(), // WORKOUT, STRENGTH, VOLUME, NUTRITION, HYDRATION, SUPPLEMENT, CUSTOM
  metric: text("metric").notNull(), // kg, sets, kcal, days, etc.
  targetValue: integer("target_value").notNull(),
  currentValue: integer("current_value").notNull().default(0),
  
  smartGoalType: text("smart_goal_type"), // TOTAL_VOLUME, EXERCISE_WEIGHT, WORKOUT_COUNT, WATER_STREAK, etc.
  smartExerciseId: integer("smart_exercise_id").references(() => exercisesTable.id, { onDelete: "cascade" }),
  
  startDate: timestamp("start_date", { withTimezone: true }),
  deadline: timestamp("deadline", { withTimezone: true }),
  
  status: text("status").notNull().default("ACTIVE"), // ACTIVE, COMPLETED, PAUSED, ARCHIVED
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertGoalSchema = createInsertSchema(goalsTable).omit({ id: true, createdAt: true, completedAt: true });
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goalsTable.$inferSelect;
