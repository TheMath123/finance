ALTER TABLE "workspaces" ALTER COLUMN "plan_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" DROP COLUMN "plan";--> statement-breakpoint
DROP TYPE "public"."workspace_plan";