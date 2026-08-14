ALTER TABLE "plans" ADD COLUMN "restricted_to_workspace_id" uuid;
--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_restricted_to_workspace_id_workspaces_id_fk" FOREIGN KEY ("restricted_to_workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE set null ON UPDATE no action;