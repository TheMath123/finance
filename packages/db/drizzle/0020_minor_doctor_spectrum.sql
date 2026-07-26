CREATE TYPE "public"."saved_formula_display_format" AS ENUM('currency', 'number');--> statement-breakpoint
CREATE TYPE "public"."saved_formula_pinned_to" AS ENUM('none', 'home', 'transactions');--> statement-breakpoint
CREATE TABLE "saved_formulas" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"name" varchar(80) NOT NULL,
	"expression" text NOT NULL,
	"display_format" "saved_formula_display_format" DEFAULT 'currency' NOT NULL,
	"pinned_to" "saved_formula_pinned_to" DEFAULT 'none' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "saved_formulas" ADD CONSTRAINT "saved_formulas_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_formulas" ADD CONSTRAINT "saved_formulas_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "saved_formulas_workspace_idx" ON "saved_formulas" USING btree ("workspace_id");