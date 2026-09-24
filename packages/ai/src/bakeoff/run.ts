/**
 * The §6.2 bake-off, as a command.
 *
 *   pnpm --filter @moed/ai bakeoff -- --cases ./cases.jsonl --models gpt-4o-mini,claude-haiku-4-5
 *
 * §6.2: *"Score `claude-haiku-4-5`, `gpt-5.4-mini` and `gpt-4o-mini` on 50 real food
 * photos, judged on range accuracy — not on how the output reads. One day of work, worth
 * more than any amount of speculation."*
 *
 * Two things this deliberately will not do.
 *
 * It will not invent the food table. `DECISIONS.md`:152 puts the calorie numbers in a
 * table, not in the model, so without `--table` there is no range to score and the run
 * reports identification and cost only — labelled as such, rather than quietly scoring
 * calories the model was never asked for.
 *
 * And it will not retry. `retries: 0` is set on purpose: a model that needs three attempts
 * to answer is a model that costs three times as much and fails one call in three, and the
 * bake-off exists to notice that rather than smooth it away.
 */

import { readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

import { countMeal, loadFoodTable, type FoodTable, type FoodTableData } from '../foodTable';
import { isModelId, type ModelId } from '../pricing';
import { ProviderError } from '../provider';
import { createRegistry, keysFromEnv } from '../providers';
import type { Range } from '../range';
import {
  FOOD_IDENTIFICATION_MAX_OUTPUT_TOKENS,
  FOOD_IDENTIFICATION_SCHEMA_NAME,
  FOOD_IDENTIFICATION_SYSTEM,
  foodIdentificationSchema,
  type FoodIdentification,
} from '../tasks';
import { scoreOne, summarise, type Scored, type Summary } from './score';

type Case = {
  id: string;
  /** A photograph, relative to the cases file. Either this or `text` is required. */
  imagePath?: string;
  /** A typed description, for the text half of the same task. */
  text?: string;
  /** The true calorie figure. Required to score; omit it and the case runs unscored. */
  truthKcal?: number;
};

type CaseOutcome = {
  case: Case;
  identification?: FoodIdentification;
  kcal?: Range | null;
  missing?: string[];
  costUsd: number;
  latencyMs: number;
  cachedInputTokens: number;
  error?: string;
};

type MediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

const MEDIA_TYPES: Record<string, MediaType> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

const DEFAULT_MODELS = 'gpt-4o-mini,claude-haiku-4-5';

function parseArgs(argv: string[]): Map<string, string> {
  const args = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === undefined || !token.startsWith('--')) continue;
    const next = argv[i + 1];
    args.set(token.slice(2), next !== undefined && !next.startsWith('--') ? next : 'true');
  }
  return args;
}

function readCases(path: string): Case[] {
  const lines = readFileSync(path, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('//'));

  return lines.map((line, index) => {
    const parsed = JSON.parse(line) as Case;
    if (!parsed.id) throw new Error(`Case on line ${index + 1} has no id`);
    if (!parsed.imagePath && !parsed.text) {
      throw new Error(`Case ${parsed.id} has neither imagePath nor text`);
    }
    return parsed;
  });
}

function imageFor(testCase: Case, casesDir: string) {
  if (!testCase.imagePath) return undefined;
  const path = resolve(casesDir, testCase.imagePath);
  const extension = basename(path).split('.').pop()?.toLowerCase() ?? '';
  const mediaType = MEDIA_TYPES[extension];
  if (!mediaType) throw new Error(`Case ${testCase.id}: unsupported image type ".${extension}"`);
  return { mediaType, base64: readFileSync(path).toString('base64') };
}

function describeError(error: unknown): string {
  if (error instanceof ProviderError) {
    return error.retryable ? `${error.message} (retryable)` : error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

async function runModel(
  model: ModelId,
  cases: Case[],
  casesDir: string,
  table: FoodTable | null,
): Promise<{ outcomes: CaseOutcome[]; summary: Summary }> {
  // No retries: see the note at the top of this file.
  const registry = createRegistry({ keys: keysFromEnv(), retries: 0 });
  const outcomes: CaseOutcome[] = [];

  for (const testCase of cases) {
    try {
      const image = imageFor(testCase, casesDir);
      const call = await registry.run(model, {
        system: FOOD_IDENTIFICATION_SYSTEM,
        text: testCase.text ?? 'Identify the food in this photograph.',
        ...(image ? { image } : {}),
        schema: foodIdentificationSchema,
        schemaName: FOOD_IDENTIFICATION_SCHEMA_NAME,
        maxOutputTokens: FOOD_IDENTIFICATION_MAX_OUTPUT_TOKENS,
      });

      const counted = table ? countMeal(table, call.value) : null;

      outcomes.push({
        case: testCase,
        identification: call.value,
        ...(counted ? { kcal: counted.kcal, missing: counted.missing } : {}),
        costUsd: call.costUsd,
        latencyMs: call.latencyMs,
        cachedInputTokens: call.usage.cachedInputTokens,
      });
    } catch (error) {
      outcomes.push({
        case: testCase,
        costUsd: 0,
        latencyMs: 0,
        cachedInputTokens: 0,
        error: describeError(error),
      });
    }
  }

  const scored: Scored[] = [];
  let unscored = 0;
  for (const outcome of outcomes) {
    const truth = outcome.case.truthKcal;
    const complete = (outcome.missing?.length ?? 0) === 0;
    if (outcome.kcal && truth !== undefined && truth > 0 && complete) {
      scored.push(scoreOne(outcome.case.id, outcome.kcal, truth));
    } else {
      unscored += 1;
    }
  }

  return {
    outcomes,
    summary: summarise(
      scored,
      unscored,
      outcomes.map((outcome) => outcome.costUsd),
      outcomes.filter((outcome) => !outcome.error).map((outcome) => outcome.latencyMs),
    ),
  };
}

function pad(value: string, to: number): string {
  return value.length >= to ? value : value + ' '.repeat(to - value.length);
}

function report(model: ModelId, result: { outcomes: CaseOutcome[]; summary: Summary }): void {
  const { summary, outcomes } = result;
  const failures = outcomes.filter((outcome) => outcome.error);
  const perCall = outcomes.length > 0 ? summary.totalCostUsd / outcomes.length : 0;
  const dash = '—';

  const rows: [string, string][] = [
    ['cases', String(outcomes.length)],
    ['failed', String(failures.length)],
    ['scored', String(summary.scored)],
    ['unscored', String(summary.unscored)],
    [
      'interval score',
      Number.isNaN(summary.meanIntervalScore)
        ? dash
        : `${summary.meanIntervalScore.toFixed(1)} kcal`,
    ],
    ['coverage', Number.isNaN(summary.coverage) ? dash : `${(summary.coverage * 100).toFixed(0)}%`],
    [
      'median width',
      Number.isNaN(summary.medianRelativeWidth)
        ? dash
        : `${(summary.medianRelativeWidth * 100).toFixed(0)}% of truth`,
    ],
    ['degenerate ranges', String(summary.degenerate)],
    ['cost / call', `$${perCall.toFixed(5)}`],
    ['total cost', `$${summary.totalCostUsd.toFixed(4)}`],
    [
      'median latency',
      Number.isNaN(summary.medianLatencyMs) ? dash : `${Math.round(summary.medianLatencyMs)} ms`,
    ],
    [
      'cache reads',
      String(outcomes.reduce((total, outcome) => total + outcome.cachedInputTokens, 0)),
    ],
  ];

  process.stdout.write(`\n${model}\n${'-'.repeat(model.length)}\n`);
  for (const [label, value] of rows) {
    process.stdout.write(`  ${pad(label, 20)}${value}\n`);
  }
  for (const failure of failures.slice(0, 5)) {
    process.stdout.write(`  ! ${failure.case.id}: ${failure.error}\n`);
  }
}

const USAGE = [
  'Usage: bakeoff --cases <file.jsonl> [--models a,b] [--table <table.json>]',
  '',
  'Each line of the cases file is one meal:',
  '  {"id":"m1","imagePath":"photos/m1.jpg","truthKcal":640}',
  '  {"id":"m2","text":"chicken salad, big bowl","truthKcal":420}',
  '',
  `Models default to ${DEFAULT_MODELS}.`,
  'Keys come from OPENAI_API_KEY and ANTHROPIC_API_KEY in the environment, never a flag —',
  'a key passed on the command line ends up in the shell history.',
].join('\n');

const NO_TABLE_NOTICE = [
  '',
  'No --table given, so nothing is scored on calorie accuracy.',
  'DECISIONS.md:152 puts the numbers in a food table, not in the model, so range accuracy',
  'is a property of identification *and* that table. Identification, cost and latency below',
  'are real; the range rows read as a dash until a table exists.',
  '',
].join('\n');

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const casesPath = args.get('cases');
  if (!casesPath) {
    process.stderr.write(`${USAGE}\n`);
    process.exitCode = 1;
    return;
  }

  const resolvedCases = resolve(casesPath);
  const cases = readCases(resolvedCases);
  const casesDir = dirname(resolvedCases);

  const models = (args.get('models') ?? DEFAULT_MODELS).split(',').map((model) => model.trim());
  for (const model of models) {
    if (!isModelId(model)) throw new Error(`Unknown model "${model}"`);
  }

  const tablePath = args.get('table');
  let table: FoodTable | null = null;
  if (tablePath) {
    const data = JSON.parse(readFileSync(resolve(tablePath), 'utf8')) as FoodTableData;
    table = loadFoodTable(data);
  }

  process.stdout.write(`${cases.length} cases, ${models.length} models\n`);
  // Said once, plainly, rather than left to be inferred from a column of dashes.
  process.stdout.write(table ? `\nFood table: ${table.source}\n` : NO_TABLE_NOTICE);

  for (const model of models) {
    const result = await runModel(model as ModelId, cases, casesDir, table);
    report(model as ModelId, result);
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`\n${describeError(error)}\n`);
  process.exitCode = 1;
});
