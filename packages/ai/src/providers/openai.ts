/**
 * The OpenAI half of the swap.
 *
 * Uses the Responses API with `zodTextFormat`, which constrains the answer to the schema
 * rather than asking for it in prose and hoping — the difference matters here, because
 * the schema is what stops a calorie estimate arriving as a single number.
 *
 * One accounting trap is handled here and it is the reason this file does arithmetic on
 * usage at all: **OpenAI's `input_tokens` is the total, and `cached_tokens` is a subset
 * of it.** Anthropic's `input_tokens` is the opposite — it excludes cache reads, which
 * are counted separately. Passing either provider's raw numbers into one shared cost
 * function would double-count on one side and under-count on the other. Each adapter
 * normalises to `Usage`, where `inputTokens` always means "charged at the full rate".
 */

import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

import { costOf, NO_USAGE, type ModelId, type Usage } from '../pricing';
import { ProviderError, type Call, type Prompt, type Provider } from '../provider';

/** Retryable on OpenAI's side: rate limits, server faults, and anything below HTTP. */
function isRetryable(error: unknown): boolean {
  if (error instanceof OpenAI.APIConnectionError) return true;
  if (error instanceof OpenAI.RateLimitError) return true;
  if (error instanceof OpenAI.APIError) {
    return typeof error.status === 'number' && error.status >= 500;
  }
  return false;
}

export function openAiProvider(client: OpenAI): Provider {
  return {
    id: 'openai',

    async run<T>(model: ModelId, prompt: Prompt<T>): Promise<Call<T>> {
      const started = Date.now();

      let response;
      try {
        response = await client.responses.parse({
          model,
          instructions: prompt.system,
          max_output_tokens: prompt.maxOutputTokens,
          input: [
            {
              role: 'user',
              content: [
                ...(prompt.image
                  ? [
                      {
                        type: 'input_image' as const,
                        detail: 'auto' as const,
                        image_url: `data:${prompt.image.mediaType};base64,${prompt.image.base64}`,
                      },
                    ]
                  : []),
                { type: 'input_text' as const, text: prompt.text },
              ],
            },
          ],
          text: { format: zodTextFormat(prompt.schema, prompt.schemaName) },
        });
      } catch (error) {
        throw new ProviderError(
          error instanceof Error ? error.message : 'OpenAI call failed',
          'openai',
          model,
          isRetryable(error),
          error,
        );
      }

      const value = response.output_parsed;
      if (value === null || value === undefined) {
        // The call succeeded and was billed; the answer did not fit the schema. Retrying
        // will usually produce the same refusal, so this is not retryable.
        throw new ProviderError(
          `${model} returned no value matching ${prompt.schemaName}`,
          'openai',
          model,
          false,
        );
      }

      const usage: Usage = normaliseUsage(response.usage);

      return {
        value,
        usage,
        costUsd: costOf(usage, model),
        provider: 'openai',
        model,
        latencyMs: Date.now() - started,
      };
    },
  };
}

type OpenAiUsage = {
  input_tokens: number;
  output_tokens: number;
  input_tokens_details?: { cached_tokens?: number };
};

/**
 * `input_tokens` counts everything the model read, cache hits included. Subtracting the
 * cached portion leaves what is charged at the full rate, which is what `Usage` means by
 * `inputTokens`. `Math.max` guards the case where the two disagree — better a slight
 * over-count than a negative token bill.
 *
 * `cacheWriteTokens` is deliberately always zero for OpenAI, and it is not an oversight.
 * OpenAI reports `cache_write_tokens` as a *subset* of `input_tokens`, and it charges no
 * premium for a write. Reporting it separately here would bill those tokens twice: once
 * inside `inputTokens` and once again at `cacheWritePerMTok`. Anthropic is the opposite —
 * its cache-creation tokens sit outside `input_tokens` and do carry a premium — which is
 * exactly why the two adapters normalise rather than hand their raw usage to `costOf`.
 */
export function normaliseUsage(usage: OpenAiUsage | undefined): Usage {
  if (!usage) return { ...NO_USAGE };
  const cached = usage.input_tokens_details?.cached_tokens ?? 0;
  return {
    inputTokens: Math.max(0, usage.input_tokens - cached),
    outputTokens: usage.output_tokens,
    cachedInputTokens: cached,
    cacheWriteTokens: 0,
  };
}
