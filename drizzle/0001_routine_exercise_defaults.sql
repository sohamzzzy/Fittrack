ALTER TABLE "routine_exercises" ADD COLUMN IF NOT EXISTS "default_weight" numeric(8, 2);
ALTER TABLE "routine_exercises" ADD COLUMN IF NOT EXISTS "rest_seconds" integer;
