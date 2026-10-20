import type { FinanceTxType, ShgFinanceCategory } from "@/types/database";

// Categorías page helpers. The rules that matter (system categories can't be
// deleted, deactivated or change type; a used category can't change type)
// live in shg_finance_category_guard (050); these only shape the list.

/** One type's categories, in the order the selects show them. */
export function categoriesOfType(categories: ShgFinanceCategory[], type: FinanceTxType): ShgFinanceCategory[] {
  return categories
    .filter((c) => c.type === type)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "es"));
}

/** The ids of `list` with `id` moved one place up or down; null at either end. */
export function moveCategory(list: { id: string }[], id: string, direction: -1 | 1): string[] | null {
  const ids = list.map((c) => c.id);
  const from = ids.indexOf(id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ids.length) return null;
  [ids[from], ids[to]] = [ids[to], ids[from]];
  return ids;
}

/** Applies a new order (1, 2, 3… as in the seed) to the categories it names. */
export function withOrder(categories: ShgFinanceCategory[], ids: string[]): ShgFinanceCategory[] {
  return categories.map((c) => {
    const i = ids.indexOf(c.id);
    return i < 0 ? c : { ...c, sort_order: i + 1 };
  });
}
