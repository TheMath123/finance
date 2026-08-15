ALTER TABLE "feature_flags" ADD COLUMN "title" text;
--> statement-breakpoint
-- Backfill das flags já seedadas (0030/0031/0032/0034/0035) com um nome
-- legível — coluna nasce nullable pra isso, vira NOT NULL só depois que
-- toda linha já tem valor (mesmo padrão 2-estágios de M5-03).
UPDATE "feature_flags" SET "title" = 'Chatbot de IA no WhatsApp' WHERE "key" = 'whatsapp_ai_chatbot';
UPDATE "feature_flags" SET "title" = 'Exportar dados em CSV' WHERE "key" = 'csv_export';
UPDATE "feature_flags" SET "title" = 'Transferência entre usuários' WHERE "key" = 'inter_user_transfer';
UPDATE "feature_flags" SET "title" = 'Divisão de despesas' WHERE "key" = 'expense_split';
UPDATE "feature_flags" SET "title" = 'Estimativa de gasto variável' WHERE "key" = 'variable_expense_estimate';
UPDATE "feature_flags" SET "title" = 'Calculadora de fórmulas' WHERE "key" = 'formula_calculator';
UPDATE "feature_flags" SET "title" = 'Trava por biometria' WHERE "key" = 'biometric_lock';
UPDATE "feature_flags" SET "title" = 'Cobrança via Stripe' WHERE "key" = 'stripe_billing';
UPDATE "feature_flags" SET "title" = 'Importar CSV de fatura de cartão' WHERE "key" = 'card_invoice_csv_import';
UPDATE "feature_flags" SET "title" = 'Importar CSV de conta' WHERE "key" = 'account_csv_import';
UPDATE "feature_flags" SET "title" = 'Categorias personalizadas' WHERE "key" = 'custom_category_creation';
-- Qualquer flag fora dessa lista (ambiente com seed diferente) recebe a
-- própria key como título de fallback, só pra nunca deixar a coluna vazia.
UPDATE "feature_flags" SET "title" = "key" WHERE "title" IS NULL;
--> statement-breakpoint
ALTER TABLE "feature_flags" ALTER COLUMN "title" SET NOT NULL;
