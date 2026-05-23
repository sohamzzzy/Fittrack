ALTER TABLE "exercises" ADD COLUMN "archived_at" timestamp with time zone;
--> statement-breakpoint
CREATE UNIQUE INDEX "exercises_user_name_active_unique" ON "exercises" ("user_id", lower(trim("name"))) WHERE "user_id" IS NOT NULL AND "archived_at" IS NULL;
