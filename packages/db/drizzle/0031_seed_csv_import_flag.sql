-- Flag nova/experimental (não é isSystem como as 8 seedadas em 0030) — fica
-- desligada por padrão até o usuário testar e ligar manualmente pelo painel
-- /saas/feature-flags. ON CONFLICT DO NOTHING pela mesma razão defensiva de
-- sempre (migration roda uma vez por ambiente, mas não custa nada).
INSERT INTO "feature_flags" ("key", "enabled", "description", "is_system") VALUES
	('card_invoice_csv_import', false, 'Import de CSV de fatura de cartão de crédito (detecção de parcela + dedup automáticos) — cartão e mês específicos.', false)
ON CONFLICT ("key") DO NOTHING;