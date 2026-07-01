CREATE TABLE "blocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"blocker_id" integer NOT NULL,
	"blocked_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mutes" (
	"id" serial PRIMARY KEY NOT NULL,
	"muter_id" integer NOT NULL,
	"muted_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplement_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"supplement_id" integer NOT NULL,
	"date" date NOT NULL,
	"logged_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplements" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"name" text NOT NULL,
	"dosage" text,
	"is_custom" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_supplements" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"supplement_id" integer NOT NULL,
	"custom_dosage" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "water_intake" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"amount_ml" integer NOT NULL,
	"date" date NOT NULL,
	"logged_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipient_id" integer NOT NULL,
	"actor_id" integer,
	"type" text NOT NULL,
	"entity_id" integer,
	"entity_type" text,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "theme" text DEFAULT 'system' NOT NULL;--> statement-breakpoint
ALTER TABLE "routine_exercises" ADD COLUMN "default_weight" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "routine_exercises" ADD COLUMN "rest_seconds" integer;--> statement-breakpoint
ALTER TABLE "workouts" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "nutrition_goals" ADD COLUMN "water_ml" integer DEFAULT 3000 NOT NULL;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_id_users_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_id_users_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mutes" ADD CONSTRAINT "mutes_muter_id_users_id_fk" FOREIGN KEY ("muter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mutes" ADD CONSTRAINT "mutes_muted_id_users_id_fk" FOREIGN KEY ("muted_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplement_logs" ADD CONSTRAINT "supplement_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplement_logs" ADD CONSTRAINT "supplement_logs_supplement_id_supplements_id_fk" FOREIGN KEY ("supplement_id") REFERENCES "public"."supplements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplements" ADD CONSTRAINT "supplements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_supplements" ADD CONSTRAINT "user_supplements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_supplements" ADD CONSTRAINT "user_supplements_supplement_id_supplements_id_fk" FOREIGN KEY ("supplement_id") REFERENCES "public"."supplements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "water_intake" ADD CONSTRAINT "water_intake_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "blocks_pair_unique" ON "blocks" USING btree ("blocker_id","blocked_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mutes_pair_unique" ON "mutes" USING btree ("muter_id","muted_id");--> statement-breakpoint
CREATE UNIQUE INDEX "follows_pair_unique" ON "follows" USING btree ("follower_id","following_id");