CREATE INDEX IF NOT EXISTS "idx_workouts_user_id" ON "workouts" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_workouts_user_finished" ON "workouts" ("user_id", "is_finished");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_workout_exercises_workout_id" ON "workout_exercises" ("workout_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_workout_sets_exercise_id" ON "workout_sets" ("workout_exercise_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_workout_exercises_exercise_id" ON "workout_exercises" ("exercise_id");
