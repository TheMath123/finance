ALTER TABLE "feature_flags" ADD COLUMN "is_system" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
-- Flags predefinidas da plataforma (kill-switches de subsistemas opcionais já
-- existentes em produção): seed via migration, mesmo padrão de
-- default_categories (0018) e platform_settings (0019) — dado global da
-- plataforma nasce junto com a coluna que o protege, não via seed.ts (que é
-- só pro workspace demo local). ON CONFLICT DO NOTHING é defensivo (migration
-- roda uma única vez por ambiente de qualquer forma): nunca deve resetar o
-- `enabled` de uma flag que o superadmin já tenha alternado manualmente.
INSERT INTO "feature_flags" ("key", "enabled", "description", "is_system") VALUES
	('whatsapp_ai_chatbot', true, 'Pipeline de IA do chatbot no WhatsApp (categorização automática e respostas analíticas).', true),
	('csv_export', true, 'Exportação de dados do workspace em CSV.', true),
	('inter_user_transfer', true, 'Transferência de dinheiro entre usuários da plataforma.', true),
	('expense_split', true, 'Divisão de despesas entre participantes.', true),
	('variable_expense_estimate', true, 'Estimativa de gasto variável na projeção de disponível mensal.', true),
	('formula_calculator', true, 'Calculadora de fórmulas salvas (widgets de fórmula).', true),
	('biometric_lock', true, 'Trava por biometria no app mobile.', true),
	('stripe_billing', true, 'Checkout e Customer Portal do Stripe (autoatendimento de assinatura).', true)
ON CONFLICT ("key") DO NOTHING;