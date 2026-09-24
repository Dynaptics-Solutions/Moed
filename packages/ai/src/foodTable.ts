/**
 * The half of the estimate that is not a model.
 *
 * `DECISIONS.md`:152 splits the work: the model reads a meal into ingredients and portion
 * classes, and a table turns those into a calorie range. This is the table's side of that
 * contract — an interface and the arithmetic, and deliberately **no data**.
 *
 * No data, because there is only one honest way to fill it. A calorie table assembled by
 * writing plausible numbers would be exactly the "invented" range that decision exists to
 * prevent, and it would be indistinguishable from a real one until someone lost weight
 * they were not trying to lose. It has to come from a nutrition source with a name.
 * `loadFoodTable` reads one; nothing here fabricates one.
 *
 * A consequence worth stating, because it changes a plan: **§6.2's bake-off cannot be
 * scored on calorie accuracy until this table exists.** §6.2 says "score on range
 * accuracy", and the range is this table's output, not the model's. Until it is supplied,
 * the harness measures what it honestly can — whether models identify food correctly, and
 * what they cost — and says so rather than scoring a number nobody computed.
 */

import type { Range } from './range';
import type { FoodIdentification, IdentifiedItem, Portion } from './tasks';

/** How a portion class is written when it is used as a lookup key: `bowl:large`. */
export function portionKey(portion: Portion): string {
  return `${portion.container}:${portion.size}`;
}

export type FoodTableData = {
  /** Where these numbers came from. Required, so an unattributed table cannot load. */
  source: string;
  /**
   * Ingredient name to portion key to calorie range. Ingredient keys are matched
   * lowercased and trimmed, because a model's capitalisation is not a fact about food.
   */
  ingredients: Record<string, Record<string, Range>>;
};

export interface FoodTable {
  readonly source: string;
  lookup(item: IdentifiedItem): Range | null;
}

export class FoodTableError extends Error {}

export function loadFoodTable(data: FoodTableData): FoodTable {
  if (!data.source || data.source.trim().length === 0) {
    throw new FoodTableError(
      'A food table must name its source — unattributed calories are guesses',
    );
  }

  const byIngredient = new Map<string, Record<string, Range>>();
  for (const [ingredient, portions] of Object.entries(data.ingredients)) {
    byIngredient.set(ingredient.trim().toLowerCase(), portions);
  }

  return {
    source: data.source,
    lookup(item) {
      const portions = byIngredient.get(item.ingredient.trim().toLowerCase());
      if (!portions) return null;
      return portions[portionKey(item.portion)] ?? null;
    },
  };
}

export type MealCount = {
  /** The meal's range, or null when nothing could be looked up. */
  kcal: Range | null;
  /** Ingredients the table had no row for. These are the reason a count is incomplete. */
  missing: string[];
};

/**
 * Adds the items up.
 *
 * Interval addition: the lows sum and the highs sum. That is wider than treating the
 * errors as independent and adding them in quadrature would be, and the wider one is
 * correct here — the errors are not independent (a model that reads a portion large reads
 * every portion large), and a limit built on an under-stated range is a limit that lets
 * you past it without saying so.
 *
 * A meal with any missing ingredient returns what it could count *and* names what it
 * could not. A partial total presented as a whole one would be the same lie as a
 * fake-precise number, so the caller is expected to check `missing` before showing `kcal`.
 */
export function countMeal(table: FoodTable, identification: FoodIdentification): MealCount {
  const missing: string[] = [];
  let lo = 0;
  let hi = 0;
  let found = 0;

  for (const item of identification.items) {
    const range = table.lookup(item);
    if (!range) {
      missing.push(item.ingredient);
      continue;
    }
    lo += range.lo;
    hi += range.hi;
    found += 1;
  }

  return { kcal: found > 0 ? { lo, hi } : null, missing };
}
