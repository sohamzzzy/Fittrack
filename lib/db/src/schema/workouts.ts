import { pgTable, text, serial, timestamp, integer, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { exercisesTable } from "./exercises";

export const routinesTable = pgTable("routines", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const routineExercisesTable = pgTable("routine_exercises", {
  id: serial("id").primaryKey(),
  routineId: integer("routine_id").notNull().references(() => routinesTable.id, { onDelete: "cascade" }),
  exerciseId: integer("exercise_id").notNull().references(() => exercisesTable.id, { onDelete: "cascade" }),
  order: integer("order").notNull().default(0),
  defaultSets: integer("default_sets"),
  defaultReps: integer("default_reps"),
});

export const workoutsTable = pgTable("workouts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  routineId: integer("routine_id").references(() => routinesTable.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  notes: text("notes"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  isFinished: boolean("is_finished").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workoutExercisesTable = pgTable("workout_exercises", {
  id: serial("id").primaryKey(),
  workoutId: integer("workout_id").notNull().references(() => workoutsTable.id, { onDelete: "cascade" }),
  exerciseId: integer("exercise_id").notNull().references(() => exercisesTable.id, { onDelete: "cascade" }),
  order: integer("order").notNull().default(0),
  notes: text("notes"),
});

export const workoutSetsTable = pgTable("workout_sets", {
  id: serial("id").primaryKey(),
  workoutExerciseId: integer("workout_exercise_id").notNull().references(() => workoutExercisesTable.id, { onDelete: "cascade" }),
  setNumber: integer("set_number").notNull(),
  weight: numeric("weight", { precision: 8, scale: 2 }),
  reps: integer("reps"),
  completed: boolean("completed").notNull().default(false),
  setType: text("set_type").notNull().default("normal"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRoutineSchema = createInsertSchema(routinesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWorkoutSchema = createInsertSchema(workoutsTable).omit({ id: true, createdAt: true });
export const insertWorkoutSetSchema = createInsertSchema(workoutSetsTable).omit({ id: true, createdAt: true });

export type InsertRoutine = z.infer<typeof insertRoutineSchema>;
export type Routine = typeof routinesTable.$inferSelect;
export type WorkoutExercise = typeof workoutExercisesTable.$inferSelect;
export type Workout = typeof workoutsTable.$inferSelect;
export type WorkoutSet = typeof workoutSetsTable.$inferSelect;
