CREATE TYPE "public"."payment_method" AS ENUM('credit_card', 'debit_card', 'pix');--> statement-breakpoint
CREATE TABLE "plan_prices" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"plan_id" uuid NOT NULL,
	"billing_interval_unit" "billing_interval" NOT NULL,
	"billing_interval_count" integer DEFAULT 1 NOT NULL,
	"price_cents" bigint NOT NULL,
	"max_installments" integer DEFAULT 1 NOT NULL,
	"payment_methods" jsonb DEFAULT '["credit_card","debit_card","pix"]'::jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plan_prices_plan_interval_key" UNIQUE("plan_id","billing_interval_unit","billing_interval_count")
);
--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "trial_days" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "plan_price_id" uuid;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "trial_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "plan_prices" ADD CONSTRAINT "plan_prices_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_plan_price_id_plan_prices_id_fk" FOREIGN KEY ("plan_price_id") REFERENCES "public"."plan_prices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- M5-03: backfill — 1 plan_price por plano existente, a partir das colunas
-- antigas de preço (que ainda existem nesta etapa), marcado como default.
-- Idempotente: só insere se o plano ainda não tiver nenhum plan_price.
INSERT INTO "plan_prices" ("plan_id", "billing_interval_unit", "billing_interval_count", "price_cents", "max_installments", "is_default", "sort_order")
SELECT "id", "billing_interval_unit", "billing_interval_count", "price_cents", 1, true, 0
FROM "plans" p
WHERE NOT EXISTS (SELECT 1 FROM "plan_prices" pp WHERE pp."plan_id" = p."id");--> statement-breakpoint

-- Backfill do plan_price_id dos workspaces existentes, usando o price default do plano atual.
UPDATE "workspaces" w
SET "plan_price_id" = (
	SELECT pp."id" FROM "plan_prices" pp
	WHERE pp."plan_id" = w."plan_id" AND pp."is_default" = true
	LIMIT 1
)
WHERE w."plan_price_id" IS NULL;