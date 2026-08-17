import type { SelectOption } from '@/components/ui/select';
import type { Category } from '@/lib/categories-api';
import { resolveCategoryIcon } from '@/lib/category-icons';

/** Opções de `<Select searchable>` pra categoria — bolinha colorida + ícone, igual ao ComboSelect do dashboard. */
export function buildCategoryOptions(
  categories: Category[] | undefined
): SelectOption[] {
  return (categories ?? []).map((category) => ({
    label: category.name,
    value: category.id,
    icon: resolveCategoryIcon(category.icon),
    color: category.color,
  }));
}
