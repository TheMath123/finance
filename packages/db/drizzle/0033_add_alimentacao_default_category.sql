-- "Mercado" (0018) cobre compra de supermercado, mas faltava uma categoria
-- pra comer fora/delivery — gap real reportado pelo usuário. ON CONFLICT
-- pela mesma razão defensiva de sempre (nome não é unique, mas evita
-- duplicar se essa migration rodar mais de uma vez no mesmo ambiente).
INSERT INTO "default_categories" ("name", "icon", "color", "is_fallback")
SELECT 'Alimentação', 'fork-knife', '#F97316', false
WHERE NOT EXISTS (
	SELECT 1 FROM "default_categories" WHERE "name" = 'Alimentação'
);
