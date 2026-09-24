/**
 * The one internal interface, and the one place to swap.
 *
 * `ARCHITECTURE.md` §6.2: *"Build the proxy provider-agnostic — one internal interface,
 * one place to swap. That is the real hedge and it costs nothing now."* This is that
 * interface. Everything above it — the tasks, the proxy, the bake-off — names a model and
 * never a vendor, so settling §6.2's bake-off is a one-line change rather than a rewrite.
 *
 * The interface is deliberately small. All six features `ARCHITECTURE.md` §6 admits need
 * a model are the same shape: some text, sometimes an image, and a demand for structured
 * output against a known schema. Nothing here streams, because nothing in this product
 * shows a model's output as it arrives — a range appears when it is complete or it does
 * not appear. Nothing here is a conversation, because none of the six features have a
 * second turn. Adding either later is additive; carrying them now is dead weight.
 */

import type { z } from 'zod';

import type { ModelId, ProviderId, Usage } from './pricing';

export type ImageInput = {
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
  /** The image bytes, base64, with no data-URI prefix and no newlines. */
  base64: string;
};

export type Prompt<T> = {
  /**
   * The stable prefix. Identical across every user and every call for a given task,
   * which is what makes it cacheable — see `ARCHITECTURE.md` §6.5. Anything that varies
   * per call belongs in `text`, never here; a timestamp or a user id in this string
   * silently invalidates the cache and the only symptom is the bill.
   */
  system: string;
  /** The part that varies per call. */
  text: string;
  image?: ImageInput;
  /** The shape the answer must take. Not a suggestion to the model — a constraint. */
  schema: z.ZodType<T>;
  /** A name for the schema. Both providers require one; neither shows it to the user. */
  schemaName: string;
  maxOutputTokens: number;
};

export type Call<T> = {
  value: T;
  usage: Usage;
  costUsd: number;
  provider: ProviderId;
  model: ModelId;
  latencyMs: number;
};

export interface Provider {
  readonly id: ProviderId;
  run<T>(model: ModelId, prompt: Prompt<T>): Promise<Call<T>>;
}

/**
 * A call that did not produce a usable answer.
 *
 * `retryable` separates "ask again in a moment" (rate limit, 5xx, connection) from "asking
 * again will fail the same way" (bad request, auth, a schema the model cannot satisfy).
 * The proxy needs the distinction to decide between a retry and an error the app can show,
 * and the bake-off needs it to tell a flaky network apart from a model that cannot do the
 * task.
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    readonly provider: ProviderId,
    readonly model: ModelId,
    readonly retryable: boolean,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}
