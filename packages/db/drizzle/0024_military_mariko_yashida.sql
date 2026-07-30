CREATE TYPE "public"."billing_interval" AS ENUM('day', 'week', 'month', 'year');--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_cents" bigint DEFAULT 0 NOT NULL,
	"billing_interval_unit" "billing_interval" DEFAULT 'month' NOT NULL,
	"billing_interval_count" integer DEFAULT 1 NOT NULL,
	"limits" jsonb NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plans_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "plan_id" uuid;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- M5-02: semeia os planos correspondentes ao antigo enum antes do backfill (idempotente).
INSERT INTO "plans" ("key", "name", "price_cents", "billing_interval_unit", "billing_interval_count", "limits", "sort_order")
VALUES
	('free', 'Free', 0, 'month', 1, '{"maxOwnedSharedWorkspaces":1,"maxMembersPerWorkspace":5,"maxSavedFormulasPerWorkspace":10}'::jsonb, 0),
	('premium', 'Premium', 4990, 'month', 1, '{"maxOwnedSharedWorkspaces":5,"maxMembersPerWorkspace":20,"maxSavedFormulasPerWorkspace":50}'::jsonb, 1)
ON CONFLICT ("key") DO NOTHING;--> statement-breakpoint
-- M5-02: backfill de workspaces existentes a partir do valor antigo do enum `plan`.
UPDATE "workspaces" SET "plan_id" = (SELECT "id" FROM "plans" WHERE "plans"."key" = "workspaces"."plan"::text) WHERE "plan_id" IS NULL;