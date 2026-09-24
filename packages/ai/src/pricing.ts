/**
 * What a call costs, computed from the tokens it actually used.
 *
 * `ARCHITECTURE.md` §6.8 asks for every call to be logged with "user, feature, provider,
 * model, tokens in/out, cost, latency, timestamp", and §6.7 puts caps on top of that.
 * Neither is possible without a price table in code, so this is it — the same numbers as
 * §6.1, in the one place that can be checked against a bill.
 *
 * Two deliberate choices about being wrong:
 *
 * Cost is estimated *low* nowhere. Where a discount exists but is not confirmed against
 * the provider's current published rate, the discount is not applied. A cap that
 * under-counts spend fails silently; one that over-counts fails visibly.
 *
 * And `PerMTok` means per *million* tokens, matching how both providers publish. Dividing
 * by a million once, here, keeps the factor-of-1000 error out of every call site.
 */

export type ProviderId = 'openai' | 'anthropic';

export type OpenAiModel = 'gpt-4o-mini' | 'gpt-5.4-mini' | 'gpt-5-nano';
export type AnthropicModel = 'claude-haiku-4-5' | 'claude-sonnet-5' | 'claude-opus-5';
export type ModelId = OpenAiModel | AnthropicModel;

export type Price = {
  provider: ProviderId;
  /** USD per million input tokens, uncached. */
  inputPerMTok: number;
  /** USD per million output tokens. */
  outputPerMTok: number;
  /**
   * USD per million input tokens served from the prompt cache.
   *
   * Anthropic publishes cache reads at a tenth of the input rate, so that is modelled.
   * OpenAI's cached-input discount is real but is not modelled here — it is set equal to
   * the full input rate, so a cached OpenAI call is costed as if it were not cached. That
   * over-states OpenAI spend and never under-states it. Confirm against OpenAI's
   * published rate before this figure is used for anything but a cap.
   */
  cachedInputPerMTok: number;
  /**
   * USD per million input tokens written *into* the cache.
   *
   * Anthropic charges a premium — 1.25x the input rate at the default five-minute TTL —
   * so the call that populates the cache costs more than an uncached one and the saving
   * only arrives on the second. OpenAI does not surcharge cache writes, so its rate is
   * the input rate. Modelling this separately is what stops §6.5's caching plan from
   * looking free.
   */
  cacheWritePerMTok: number;
};

/**
 * The table from `ARCHITECTURE.md` §6.1, with one correction.
 *
 * §6.1 lists `claude-sonnet-5` at $3.00 / $15.00. That is Sonnet 4.6's rate; Sonnet 5 is
 * $2.00 / $10.00. Haiku 4.5 ($1/$5) and Opus 5 ($5/$25) in §6.1 are both correct, and
 * since §6.1's starting choice and every costed scenario in §6.3 and §6.6 use Haiku, the
 * error moves no published figure in that document. It is corrected here and flagged so
 * §6.1 can be corrected too.
 */
export const PRICES: Record<ModelId, Price> = {
  'gpt-4o-mini': {
    provider: 'openai',
    inputPerMTok: 0.15,
    outputPerMTok: 0.6,
    cachedInputPerMTok: 0.15,
    cacheWritePerMTok: 0.15,
  },
  'gpt-5.4-mini': {
    provider: 'openai',
    inputPerMTok: 0.75,
    outputPerMTok: 4.5,
    cachedInputPerMTok: 0.75,
    cacheWritePerMTok: 0.75,
  },
  'gpt-5-nano': {
    provider: 'openai',
    inputPerMTok: 0.05,
    outputPerMTok: 0.4,
    cachedInputPerMTok: 0.05,
    cacheWritePerMTok: 0.05,
  },
  'claude-haiku-4-5': {
    provider: 'anthropic',
    inputPerMTok: 1.0,
    outputPerMTok: 5.0,
    cachedInputPerMTok: 0.1,
    cacheWritePerMTok: 1.25,
  },
  'claude-sonnet-5': {
    provider: 'anthropic',
    inputPerMTok: 2.0,
    outputPerMTok: 10.0,
    cachedInputPerMTok: 0.2,
    cacheWritePerMTok: 2.5,
  },
  'claude-opus-5': {
    provider: 'anthropic',
    inputPerMTok: 5.0,
    outputPerMTok: 25.0,
    cachedInputPerMTok: 0.5,
    cacheWritePerMTok: 6.25,
  },
};

export type Usage = {
  /** Input tokens charged at the full rate — cache misses only. */
  inputTokens: number;
  outputTokens: number;
  /**
   * Input tokens served from the prompt cache. `ARCHITECTURE.md` §6.5 makes this the
   * number to watch: if it stays zero across repeated calls with the same system prompt,
   * something is invalidating the prefix and the caching plan is not working.
   */
  cachedInputTokens: number;
  /** Input tokens written into the cache by this call, charged at `cacheWritePerMTok`. */
  cacheWriteTokens: number;
};

export const NO_USAGE: Usage = {
  inputTokens: 0,
  outputTokens: 0,
  cachedInputTokens: 0,
  cacheWriteTokens: 0,
};

const PER_MILLION = 1_000_000;

/** What one call cost, in USD. */
export function costOf(usage: Usage, model: ModelId): number {
  const price = PRICES[model];
  return (
    (usage.inputTokens * price.inputPerMTok +
      usage.cachedInputTokens * price.cachedInputPerMTok +
      usage.cacheWriteTokens * price.cacheWritePerMTok +
      usage.outputTokens * price.outputPerMTok) /
    PER_MILLION
  );
}

/** Which provider serves a model. The registry uses this to route. */
export function providerOf(model: ModelId): ProviderId {
  return PRICES[model].provider;
}

export function isModelId(value: string): value is ModelId {
  return Object.prototype.hasOwnProperty.call(PRICES, value);
}
