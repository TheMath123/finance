-- Flag nova/experimental (não é isSystem) — desligada por padrão até o
-- usuário testar e ligar manualmente pelo painel /saas/feature-flags.
-- Gateia só as mutações (criar/editar/excluir categoria própria de
-- workspace) — listar categoria continua sempre liberado.
INSERT INTO "feature_flags" ("key", "enabled", "description", "is_system") VALUES
	('custom_category_creation', false, 'Usuário do workspace pode criar/editar/excluir categoria própria (além das padrão).', false)
ON CONFLICT ("key") DO NOTHING;
