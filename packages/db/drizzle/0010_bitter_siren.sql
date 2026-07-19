CREATE TYPE "public"."inter_user_transfer_status" AS ENUM('pending', 'accepted', 'rejected', 'expired');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'transfer_pending';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'transfer_accepted';--> statement-breakpoint
CREATE TABLE "inter_user_transfers" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"from_user_id" uuid NOT NULL,
	"from_transaction_id" uuid NOT NULL,
	"to_user_id" uuid NOT NULL,
	"to_transaction_id" uuid,
	"amount" bigint NOT NULL,
	"description" text NOT NULL,
	"status" "inter_user_transfer_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trusted_contacts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"trusted_user_id" uuid NOT NULL,
	"default_account_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inter_user_transfers" ADD CONSTRAINT "inter_user_transfers_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inter_user_transfers" ADD CONSTRAINT "inter_user_transfers_from_transaction_id_transactions_id_fk" FOREIGN KEY ("from_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inter_user_transfers" ADD CONSTRAINT "inter_user_transfers_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inter_user_transfers" ADD CONSTRAINT "inter_user_transfers_to_transaction_id_transactions_id_fk" FOREIGN KEY ("to_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trusted_contacts" ADD CONSTRAINT "trusted_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trusted_contacts" ADD CONSTRAINT "trusted_contacts_trusted_user_id_users_id_fk" FOREIGN KEY ("trusted_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trusted_contacts" ADD CONSTRAINT "trusted_contacts_default_account_id_bank_accounts_id_fk" FOREIGN KEY ("default_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inter_user_transfers_to_user_status_idx" ON "inter_user_transfers" USING btree ("to_user_id","status");--> statement-breakpoint
CREATE INDEX "inter_user_transfers_from_user_idx" ON "inter_user_transfers" USING btree ("from_user_id");--> statement-breakpoint
CREATE INDEX "inter_user_transfers_status_expires_idx" ON "inter_user_transfers" USING btree ("status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "trusted_contacts_user_trusted_idx" ON "trusted_contacts" USING btree ("user_id","trusted_user_id");