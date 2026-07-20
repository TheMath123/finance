ALTER TYPE "public"."auth_token_purpose" ADD VALUE 'email_change';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pending_email" text;