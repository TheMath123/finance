-- Restaura a flag card_invoice_csv_import: foi excluída sem querer pelo
-- painel /saas/feature-flags (o botão "Excluir" ainda existia quando isso
-- aconteceu). Agora que o painel perde a capacidade de criar/excluir flag
-- (só resta ativar/desativar), essa é a única forma de trazê-la de volta.
-- ON CONFLICT DO NOTHING pela mesma razão defensiva de sempre.
INSERT INTO "feature_flags" ("key", "enabled", "description", "is_system") VALUES
	('card_invoice_csv_import', false, 'Import de CSV de fatura de cartão de crédito (detecção de parcela + dedup automáticos) — cartão e mês específicos.', false)
ON CONFLICT ("key") DO NOTHING;
