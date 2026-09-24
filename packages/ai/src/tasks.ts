/**
 * What we actually ask a model for.
 *
 * `DECISIONS.md`:152, settled 26 August 2026: *"The model identifies; a table counts. The
 * model's job is to read 'chicken salad, big bowl' into ingredients and a portion class.
 * The numbers, and the width of the range, come from a food table keyed on that class.
 * This is what makes a range repeatable rather than invented."*
 *
 * So the schema below has **no calorie field**, and that absence is the design. A model
 * asked for calories will produce them — fluently, differently each time, and with a
 * confidence it has not earned. Two identical photographs would get two different
 * answers, which is precisely the "invented" that decision rules out. Keying a table on a
 * portion class instead makes the same lunch cost the same twice, and it is also what
 * makes a saved food free forever (§6.5): the table is what gets stored, not a number the
 * model happened to say that day.
 *
 * It is cheaper too, for a reason worth stating plainly: output tokens cost five times
 * input, and identification is a much shorter answer than identification plus arithmetic
 * plus the sentence of justification a model wants to attach to arithmetic.
 */

import { z } from 'zod';

/**
 * The containers people actually name when describing a meal, plus `unknown` for when
 * the photograph does not show one. This is a closed set on purpose: it is a table key,
 * and a table cannot be keyed on free text.
 */
export const PORTION_CONTAINERS = [
  'bowl',
  'plate',
  'cup',
  'glass',
  'slice',
  'piece',
  'handful',
  'tablespoon',
  'unknown',
] as const;

export const PORTION_SIZES = ['small', 'medium', 'large'] as const;

export const portionSchema = z.object({
  container: z.enum(PORTION_CONTAINERS),
  size: z.enum(PORTION_SIZES),
});

export const identifiedItemSchema = z.object({
  /**
   * The ingredient, as plainly as it can be named — "chicken breast", not "protein" and
   * not "grilled free-range chicken breast with herbs". The table is keyed on this, so
   * flourish is a lookup miss.
   */
  ingredient: z.string().min(1).max(60),
  portion: portionSchema,
});

export const foodIdentificationSchema = z.object({
  items: z.array(identifiedItemSchema).min(1).max(12),
  /**
   * True when the model cannot tell what it is looking at well enough to be worth
   * counting. An explicit "I cannot read this" is a usable answer — it routes to asking
   * the user — whereas a guess dressed as an identification is not.
   */
  unreadable: z.boolean(),
});

export type Portion = z.infer<typeof portionSchema>;
export type IdentifiedItem = z.infer<typeof identifiedItemSchema>;
export type FoodIdentification = z.infer<typeof foodIdentificationSchema>;

/**
 * The stable prefix, identical for every user and every call.
 *
 * `ARCHITECTURE.md` §6.5 wants this cached, and warns that the minimum cacheable prefix
 * is around a thousand tokens — so a prompt this length caches nothing yet and must be
 * padded with the food-class reference table before caching is worth claiming. That
 * padding is real work and real data; it is not invented here. `cachedInputTokens` in
 * every `Call` is how you will know when it starts working.
 */
export const FOOD_IDENTIFICATION_SYSTEM = [
  'You identify food. You do not count calories, and you never state a calorie figure.',
  '',
  'For each distinct food in the input, name the ingredient as plainly as possible and',
  'classify the portion by container and size. A calorie table is keyed on what you',
  'return, so plain names match and elaborate ones do not: "chicken breast", not',
  '"grilled free-range chicken breast". Name ingredients separately rather than naming a',
  'dish, unless the dish is the thing sold — "burger bun", "beef patty", "cheese slice"',
  'rather than "cheeseburger", but "custard tart" stays whole.',
  '',
  'Choose the container that best matches how the food is held or served, and `unknown`',
  'when nothing in the input shows one. Choose the size relative to a typical serving of',
  'that food in that container, not relative to other foods.',
  '',
  'If you cannot tell what the food is well enough for a table lookup to mean anything,',
  'set `unreadable` to true and return your best single guess in `items`. Saying you',
  'cannot read it is a useful answer. Guessing confidently is not.',
].join('\n');

export const FOOD_IDENTIFICATION_SCHEMA_NAME = 'food_identification';

/** Identification is a short answer. This is generous for twelve items. */
export const FOOD_IDENTIFICATION_MAX_OUTPUT_TOKENS = 700;
