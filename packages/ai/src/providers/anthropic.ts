/**
 * The Anthropic half of the swap.
 *
 * Uses `messages.parse` with `zodOutputFormat`, the structured-output path — the schema
 * constrains the answer rather than requesting it. `ARCHITECTURE.md` §6.1 names
 * `claude-haiku-4-5` as the starting choice on the grounds that food identification is
 * "structured extraction against a known schema, which is what small models are good at";
 * that reasoning only holds if the schema is actually enforced, which is what this does.
 *
 * The usage mapping is the mirror image of the OpenAI adapter's, and the asymmetry is the
 * whole reason both files normalise instead of sharing one function: **Anthropic's
 * `input_tokens` excludes cache reads and cache writes**, which arrive as their own
 * counters. OpenAI's `input_tokens` includes them. Feeding either provider's raw numbers
 * to `costOf` would under-count here and double-count there.
 *
 * No `thinking` parameter is set. Haiku 4.5 predates adaptive thinking, and none of the
 * six features in §6 want a model reasoning at length — they want a schema filled in.
 */

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

import { costOf, NO_USAGE, type ModelId, type Usage } from '../pricing';
import { ProviderError, type Call, type Prompt, type Provider } from '../provider';

function isRetryable(error: unknown): boolean {
  if (error instanceof Anthropic.APIConnectionError) return true;
  if (error instanceof Anthropic.RateLimitError) return true;
  if (error instanceof Anthropic.APIError) {
    return typeof error.status === 'number' && error.status >= 500;
  }
  return false;
}

export function anthropicProvider(client: Anthropic): Provider {
  return {
    id: 'anthropic',

    async run<T>(model: ModelId, prompt: Prompt<T>): Promise<Call<T>> {
      const started = Date.now();

      let response;
      try {
        response = await client.messages.parse({
          model,
          max_tokens: prompt.maxOutputTokens,
          // The stable prefix, marked cacheable. §6.5 wants this hit on every call after
          // the first; `cachedInputTokens` in the result is how you check that it is.
          system: [
            {
              type: 'text',
              text: prompt.system,
              cache_control: { type: 'ephemeral' },
            },
          ],
          messages: [
            {
              role: 'user',
              content: [
                ...(prompt.image
                  ? [
                      {
                        type: 'image' as const,
                        source: {
                          type: 'base64' as const,
                          media_type: prompt.image.mediaType,
                          data: prompt.image.base64,
                        },
                      },
                    ]
                  : []),
                { type: 'text' as const, text: prompt.text },
              ],
            },
          ],
          // `zodOutputFormat` takes the schema alone — unlike OpenAI, Anthropic does not
          // ask for a name for it. `prompt.schemaName` is still carried on `Prompt`
          // because the OpenAI side requires one, and error messages read better for it.
          output_config: { format: zodOutputFormat(prompt.schema) },
        });
      } catch (error) {
        throw new ProviderError(
          error instanceof Error ? error.message : 'Anthropic call failed',
          'anthropic',
          model,
          isRetryable(error),
          error,
        );
      }

      // A safety decline arrives as a successful response, not an exception. Reading
      // content without checking would treat a refusal as an empty answer.
      if (response.stop_reason === 'refusal') {
        throw new ProviderError(`${model} declined the request`, 'anthropic', model, false);
      }

      const value = response.parsed_output;
      if (value === null || value === undefined) {
        throw new ProviderError(
          `${model} returned no value matching ${prompt.schemaName}`,
          'anthropic',
          model,
          false,
        );
      }

      const usage = normaliseUsage(response.usage);

      return {
        value,
        usage,
        costUsd: costOf(usage, model),
        provider: 'anthropic',
        model,
        latencyMs: Date.now() - started,
      };
    },
  };
}

type AnthropicUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

/**
 * A straight copy, because Anthropic already reports the three counters separately and
 * `input_tokens` already excludes both cache figures. Nothing is subtracted here — doing
 * so would drop tokens that were genuinely charged at the full rate.
 */
export function normaliseUsage(usage: AnthropicUsage | undefined): Usage {
  if (!usage) return { ...NO_USAGE };
  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cachedInputTokens: usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
  };
}
