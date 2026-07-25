CREATE TABLE "default_categories" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"name" text NOT NULL,
	"icon" text NOT NULL,
	"color" text NOT NULL,
	"is_fallback" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "suspended_at" timestamp with time zone;
--> statement-breakpoint
INSERT INTO "default_categories" ("name", "icon", "color", "is_fallback") VALUES
	('Mercado', 'shopping-cart', '#22C55E', false),
	('Transporte', 'car', '#3B82F6', false),
	('Moradia', 'home', '#8B5CF6', false),
	('Lazer', 'party-popper', '#EC4899', false),
	('Saúde', 'heart-pulse', '#EF4444', false),
	('Educação', 'graduation-cap', '#F59E0B', false),
	('Assinaturas', 'repeat', '#06B6D4', false),
	('Salário', 'banknote', '#10B981', false),
	('Outros', 'circle-ellipsis', '#6B7280', true);