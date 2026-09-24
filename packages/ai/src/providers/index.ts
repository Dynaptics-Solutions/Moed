/**
 * The registry — the one place that knows which vendor serves which model.
 *
 * Everything above this line names a model and never a vendor. Settling §6.2's bake-off
 * therefore changes one constant, not a call site: `gpt-4o-mini` and `claude-haiku-4-5`
 * are interchangeable to every caller, which is what "one place to swap" has to mean if
 * it is going to be true a year from now.
 *
 * Clients are constructed lazily and once. Constructing an Anthropic client when the
 * bake-off is only running OpenAI models would demand a key that need not exist, and on
 * Azure Functions a cold start pays for every constructor it runs.
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

import { providerOf, type ModelId } from '../pricing';
import { ProviderError, type Call, type Prompt, type Provider } from '../provider';
import { anthropicProvider } from './anthropic';
import { openAiProvider } from './openai';

export type Keys = {
  openai?: string;
  anthropic?: string;
};

export type RegistryOptions = {
  keys: Keys;
  /**
   * How many times a retryable failure is tried again. Rate limits and 5xx are worth one
   * or two more attempts; a bad schema or a refusal is not, and `ProviderError.retryable`
   * is what separates them. Zero disables retrying, which is what the bake-off wants —
   * a model that needs three attempts to answer should be measured as such.
   */
  retries?: number;
};

export type Registry = {
  run<T>(model: ModelId, prompt: Prompt<T>): Promise<Call<T>>;
};

const DEFAULT_RETRIES = 2;

/** Exponential, starting at a quarter second. Short: a person is waiting on this. */
function backoffMs(attempt: number): number {
  return 250 * 2 ** attempt;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createRegistry(options: RegistryOptions): Registry {
  const retries = options.retries ?? DEFAULT_RETRIES;
  const built = new Map<string, Provider>();

  function providerFor(model: ModelId): Provider {
    const id = providerOf(model);
    const existing = built.get(id);
    if (existing) return existing;

    const key = options.keys[id];
    if (!key) {
      // Never falls back to another vendor. A silent substitution would make the
      // bake-off measure the wrong model and the spend log name the wrong provider.
      throw new ProviderError(
        `No ${id} API key configured, so ${model} cannot be called`,
        id,
        model,
        false,
      );
    }

    const provider =
      id === 'openai'
        ? openAiProvider(new OpenAI({ apiKey: key }))
        : anthropicProvider(new Anthropic({ apiKey: key }));

    built.set(id, provider);
    return provider;
  }

  return {
    async run<T>(model: ModelId, prompt: Prompt<T>): Promise<Call<T>> {
      const provider = providerFor(model);

      let lastError: unknown;
      for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
          return await provider.run(model, prompt);
        } catch (error) {
          lastError = error;
          const retryable = error instanceof ProviderError && error.retryable;
          if (!retryable || attempt === retries) break;
          await sleep(backoffMs(attempt));
        }
      }
      throw lastError;
    },
  };
}

/**
 * Keys from the environment, which is the only place they are allowed to come from.
 *
 * `ARCHITECTURE.md` §9: *"Secrets only in Key Vault. No API key ever ships in the app —
 * that is the reason the AI proxy exists."* This function exists so there is exactly one
 * reader, and so that grepping for the variable names finds one hit. It is never called
 * from `apps/mobile`, and it cannot be: nothing in the client bundle imports this package.
 */
export function keysFromEnv(env: Record<string, string | undefined> = process.env): Keys {
  return {
    openai: env.OPENAI_API_KEY,
    anthropic: env.ANTHROPIC_API_KEY,
  };
}
