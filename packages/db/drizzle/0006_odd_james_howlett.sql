ALTER TABLE "workspace_invites" DROP CONSTRAINT "workspace_invites_invited_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "workspace_invites" ALTER COLUMN "invited_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;