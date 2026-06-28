DELETE FROM "follows" WHERE "follower_id" = "following_id";
--> statement-breakpoint
DELETE FROM "follows" a USING "follows" b
WHERE a.id > b.id
  AND a.follower_id = b.follower_id
  AND a.following_id = b.following_id;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "follows_pair_unique" ON "follows" USING btree ("follower_id","following_id");
--> statement-breakpoint
CREATE TABLE "blocks" (
  "id" serial PRIMARY KEY NOT NULL,
  "blocker_id" integer NOT NULL,
  "blocked_id" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "blocks_blocker_id_users_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."users"("id") ON DELETE cascade,
  CONSTRAINT "blocks_blocked_id_users_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."users"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX "blocks_pair_unique" ON "blocks" USING btree ("blocker_id","blocked_id");
--> statement-breakpoint
CREATE TABLE "mutes" (
  "id" serial PRIMARY KEY NOT NULL,
  "muter_id" integer NOT NULL,
  "muted_id" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "mutes_muter_id_users_id_fk" FOREIGN KEY ("muter_id") REFERENCES "public"."users"("id") ON DELETE cascade,
  CONSTRAINT "mutes_muted_id_users_id_fk" FOREIGN KEY ("muted_id") REFERENCES "public"."users"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX "mutes_pair_unique" ON "mutes" USING btree ("muter_id","muted_id");
