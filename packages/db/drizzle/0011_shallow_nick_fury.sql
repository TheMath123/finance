CREATE TYPE "public"."split_share_status" AS ENUM('pending', 'paid', 'confirmed');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'split_payment_pending';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'split_reimbursement_confirmed';--> statement-breakpoint
CREATE TABLE "expense_splits" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "split_shares" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"split_id" uuid NOT NULL,
	"participant_user_id" uuid,
	"participant_name" text,
	"amount" bigint NOT NULL,
	"status" "split_share_status" DEFAULT 'pending' NOT NULL,
	"reimbursement_transaction_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_shares" ADD CONSTRAINT "split_shares_split_id_expense_splits_id_fk" FOREIGN KEY ("split_id") REFERENCES "public"."expense_splits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_shares" ADD CONSTRAINT "split_shares_participant_user_id_users_id_fk" FOREIGN KEY ("participant_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_shares" ADD CONSTRAINT "split_shares_reimbursement_transaction_id_transactions_id_fk" FOREIGN KEY ("reimbursement_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expense_splits_transaction_idx" ON "expense_splits" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "split_shares_split_idx" ON "split_shares" USING btree ("split_id");--> statement-breakpoint
CREATE INDEX "split_shares_participant_user_idx" ON "split_shares" USING btree ("participant_user_id","status");