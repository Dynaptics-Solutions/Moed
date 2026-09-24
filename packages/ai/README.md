# @moed/ai

The provider-agnostic model layer, the cost accounting, the caps, and the §6.2 bake-off.

Everything above this package names a **model** and never a vendor. `ARCHITECTURE.md` §6.2:
_"Build the proxy provider-agnostic — one internal interface, one place to swap. That is
the real hedge and it costs nothing now."_ `src/provider.ts` is that interface;
`src/providers/index.ts` is that one place.

## Keys

Two rules, and the first one is not a preference.

**No key goes in the app.** A release APK carries its JavaScript as
`assets/index.android.bundle`; unzipping the APK and reading it takes seconds. A key the
app holds is a key every installer holds. That is why `apps/api` exists, and it is why
nothing in `apps/mobile` imports this package.

**No key goes on a command line.** It ends up in shell history. Keys are read from the
environment, in exactly one place — `keysFromEnv` in `src/providers/index.ts`:

```
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
```

Locally, put them in a `.env` at the repo root (already gitignored) or in
`apps/api/local.settings.json` (gitignored, see `local.settings.json.example`). In Azure
they come from Key Vault references, per `ARCHITECTURE.md` §9.

## The bake-off

```
pnpm --filter @moed/ai bakeoff -- --cases ./cases.jsonl --models gpt-4o-mini,claude-haiku-4-5
```

Each line of the cases file is one meal:

```jsonl
{"id":"m1","imagePath":"photos/m1.jpg","truthKcal":640}
{"id":"m2","text":"chicken salad, big bowl","truthKcal":420}
```

### It needs a food table before it can score calories

`DECISIONS.md`:152 splits the work — _"The model identifies; a table counts… The numbers,
and the width of the range, come from a food table keyed on that class. This is what makes
a range repeatable rather than invented."_

So a calorie range is a property of **identification plus a table**, and the table does not
exist yet. Without `--table`, the run measures identification, cost and latency, and says
plainly that the range rows are empty. It does not fabricate a table: numbers invented to
fill one would be indistinguishable from real ones right up until somebody trusted them.

The table format is in `src/foodTable.ts`. It requires a `source` field, so an
unattributed table cannot load.

### How ranges are marked

The headline is the **interval score** (lower is better, units are calories), because the
two obvious metrics are both gameable:

- **Coverage alone** is maximised by answering "0 to 10,000" — perfect, useless.
- **Width alone** is maximised by answering "610 to 611" — perfect, always wrong.

The interval score is a proper scoring rule: it charges you for the width you claim and
charges you `2/alpha` times the distance by which you miss, so an honest interval is the
score-minimising answer and neither cheat pays. Coverage and median width are reported
alongside for diagnosis — two models can score alike, one because it is honestly uncertain
and one because it is sharp and occasionally very wrong, and those are not the same
product. `src/bakeoff/score.test.ts` demonstrates both cheats losing.

`degenerate ranges` counts answers where `lo === hi`. Every one is a violation of
`CLAUDE.md` non-negotiable 4, and a model that produces them is not shippable here however
well it scores.

## What is here

| File                   | What it holds                                                        |
| ---------------------- | -------------------------------------------------------------------- |
| `provider.ts`          | The one interface. Text, optional image, a schema, structured output |
| `providers/openai.ts`  | Responses API + `zodTextFormat`                                      |
| `providers/anthropic.ts` | Messages API + `zodOutputFormat`, system prompt marked cacheable    |
| `providers/index.ts`   | Model → vendor routing, lazy clients, bounded retry, `keysFromEnv`   |
| `pricing.ts`           | §6.1's table and per-call cost                                        |
| `range.ts`             | Ranges, and the refusal to return a single guessed number             |
| `tasks.ts`             | The identification schema and its system prompt                       |
| `foodTable.ts`         | The table interface and interval arithmetic. No data                  |
| `caps.ts`              | §6.7's capped-trial / unlimited-paid policy, as a pure function        |
| `bakeoff/score.ts`     | Interval score, coverage, sharpness, degeneracy                       |
| `bakeoff/run.ts`       | The command                                                           |

## Two things worth knowing

**§6.1's `claude-sonnet-5` price is wrong.** It lists $3.00 / $15.00, which is Sonnet 4.6's
rate; Sonnet 5 is $2.00 / $10.00. Haiku 4.5 and Opus 5 in that table are correct, and every
costed scenario in §6.3 and §6.6 uses Haiku, so no published figure moves. `pricing.ts`
carries the corrected number.

**Usage accounting differs between the two vendors, and naively sharing it would produce
wrong costs.** OpenAI's `input_tokens` *includes* cached tokens; Anthropic's *excludes*
them and reports cache reads and cache writes separately, with writes at a 1.25x premium.
Each adapter normalises to `Usage`, where `inputTokens` always means "charged at the full
rate". This is why there are two `normaliseUsage` functions and not one.
