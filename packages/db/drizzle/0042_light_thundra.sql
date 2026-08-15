ALTER TABLE "feature_flags" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('portuguese', "feature_flags"."title" || ' ' || coalesce("feature_flags"."description", '') || ' ' || "feature_flags"."key")) STORED;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', "transactions"."description_normalized")) STORED;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('portuguese', "users"."name" || ' ' || "users"."email")) STORED;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('portuguese', "workspaces"."name")) STORED;--> statement-breakpoint
CREATE INDEX "feature_flags_search_vector_idx" ON "feature_flags" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "transactions_search_vector_idx" ON "transactions" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "users_search_vector_idx" ON "users" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "workspaces_search_vector_idx" ON "workspaces" USING gin ("search_vector");