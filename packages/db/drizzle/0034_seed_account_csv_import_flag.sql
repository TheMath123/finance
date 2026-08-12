-- Flag nova/experimental (não é isSystem, mesmo padrão de card_invoice_csv_import
-- em 0031) — desligada por padrão até o usuário testar e ligar manualmente pelo
-- painel /saas/feature-flags. ON CONFLICT DO NOTHING pela mesma razão defensiva.
INSERT INTO "feature_flags" ("key", "enabled", "description", "is_system") VALUES
	('account_csv_import', false, 'Import de CSV direto pra transações de uma conta bancária (extrato) — sem passar por fatura de cartão.', false)
ON CONFLICT ("key") DO NOTHING;
