/**
 * `POST /ai/{task}` — the reason the app never holds a key.
 *
 * `ARCHITECTURE.md`:141 gives this endpoint three jobs: proxy to the model providers,
 * enforce caps, log spend. It does all three, and it exists at all because of §9:
 * *"Secrets only in Key Vault. No API key ever ships in the app — that is the reason the
 * AI proxy exists, alongside cap enforcement."*
 *
 * That rule is not caution. A React Native release APK carries its JavaScript as
 * `assets/index.android.bundle`, and unzipping an APK and reading that file takes about
 * ten seconds. Any key the app holds is a key every installer holds.
 *
 * ## What is deliberately missing, and why it matters before this is deployed
 *
 * **There is no authentication here yet.** `POST /auth/session` is Phase 0 work and does
 * not exist, so this function has no session JWT to verify and no `user_id` to attribute
 * a call to. Two consequences follow, and neither should be discovered later:
 *
 * 1. `authLevel` is `'function'`, not `'anonymous'`. An anonymous endpoint that forwards
 *    to OpenAI on a stored key is an open relay billed to whoever owns the key — the same
 *    exposure as shipping the key, reached by a different route. The function key is a
 *    stopgap that makes the endpoint useless to a stranger who has not been given it. It
 *    is *not* a substitute for auth: it does not identify anyone, so it cannot attribute
 *    spend, and every holder shares one bucket.
 * 2. Caps are evaluated but not yet *counted*. `capDecision` is pure and correct; the
 *    usage it is handed comes from the request for now, because the table that would hold
 *    the real counts is behind the same missing auth. Until `POST /auth/session` lands,
 *    treat cap enforcement here as wired, not enforced — a client could simply report
 *    zero. `readUsage` is the single seam where the database goes in.
 */

import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from '@azure/functions';
import {
  capDecision,
  createRegistry,
  FOOD_IDENTIFICATION_MAX_OUTPUT_TOKENS,
  FOOD_IDENTIFICATION_SCHEMA_NAME,
  FOOD_IDENTIFICATION_SYSTEM,
  foodIdentificationSchema,
  keysFromEnv,
  ProviderError,
  type CapUsage,
  type ImageInput,
  type MeteredFeature,
  type ModelId,
  type Plan,
} from '@moed/ai';

/**
 * The model every task runs on until §6.2's bake-off says otherwise.
 *
 * One constant, read from the environment so the bake-off's answer can be applied without
 * a deploy. §6.1's starting choice is `claude-haiku-4-5`; §6.2 expects `gpt-4o-mini` to
 * win on cost if it holds up on range accuracy.
 */
const DEFAULT_MODEL = (process.env.MOED_AI_MODEL ?? 'claude-haiku-4-5') as ModelId;

/** Guards against a caller pasting a photograph of a wall into the request body. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type AiRequestBody = {
  /** `photo` carries an image; `text` carries a typed description. */
  feature: MeteredFeature;
  plan: Plan;
  text?: string;
  image?: ImageInput;
};

type Json = Record<string, unknown>;

function json(status: number, body: Json): HttpResponseInit {
  return { status, jsonBody: body };
}

/**
 * The one seam where the database goes in.
 *
 * Returns zeroes today because there is no `user_id` to count against — see the header.
 * When `POST /auth/session` lands this becomes a query, and nothing else in this file
 * changes.
 */
async function readUsage(_userId: string | null): Promise<CapUsage> {
  return { photosToday: 0, photosThisMonth: 0 };
}

/**
 * §6.8: *"Log every call: user, feature, provider, model, tokens in/out, cost, latency,
 * timestamp"* and *"alert on any user past $1.50/month"*.
 *
 * Written as structured properties rather than an interpolated sentence so Application
 * Insights can aggregate on them — a spend total nobody can group by user is not an
 * observability story, it is a log file.
 */
function logSpend(
  context: InvocationContext,
  entry: {
    feature: MeteredFeature;
    provider: string;
    model: ModelId;
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens: number;
    costUsd: number;
    latencyMs: number;
  },
): void {
  context.log('ai.call', { ...entry, at: new Date().toISOString() });
}

export async function aiHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const task = request.params.task;
  if (task !== 'identify') {
    return json(404, { error: `Unknown task "${task ?? ''}"` });
  }

  let body: AiRequestBody;
  try {
    body = (await request.json()) as AiRequestBody;
  } catch {
    return json(400, { error: 'Body must be JSON' });
  }

  if (body.feature !== 'photo' && body.feature !== 'text' && body.feature !== 'voice') {
    return json(400, { error: 'feature must be photo, text or voice' });
  }
  if (body.feature === 'photo' && !body.image) {
    return json(400, { error: 'A photo estimate needs an image' });
  }
  if (body.feature !== 'photo' && !body.text) {
    return json(400, { error: 'A text estimate needs text' });
  }
  if (body.image && body.image.base64.length * 0.75 > MAX_IMAGE_BYTES) {
    return json(413, { error: 'That image is too large to send' });
  }

  // Caps before the call, always. Deciding afterwards would mean paying for the call you
  // just refused.
  const decision = capDecision(body.plan, body.feature, await readUsage(null));
  if (!decision.allowed) {
    // 402 rather than 403: this is about what has been paid for, and the client shows
    // `notice` verbatim so the wording cannot drift between iOS and Android.
    return json(402, { error: decision.notice, reason: decision.reason });
  }

  const registry = createRegistry({ keys: keysFromEnv() });

  try {
    const call = await registry.run(DEFAULT_MODEL, {
      system: FOOD_IDENTIFICATION_SYSTEM,
      text: body.text ?? 'Identify the food in this photograph.',
      ...(body.image ? { image: body.image } : {}),
      schema: foodIdentificationSchema,
      schemaName: FOOD_IDENTIFICATION_SCHEMA_NAME,
      maxOutputTokens: FOOD_IDENTIFICATION_MAX_OUTPUT_TOKENS,
    });

    logSpend(context, {
      feature: body.feature,
      provider: call.provider,
      model: call.model,
      inputTokens: call.usage.inputTokens,
      outputTokens: call.usage.outputTokens,
      cachedInputTokens: call.usage.cachedInputTokens,
      costUsd: call.costUsd,
      latencyMs: call.latencyMs,
    });

    // The identification only. No calories: DECISIONS.md:152 puts those in a food table,
    // and the cost figures are the operator's business, not the phone's.
    return json(200, { identification: call.value });
  } catch (error) {
    if (error instanceof ProviderError) {
      context.error('ai.call.failed', {
        provider: error.provider,
        model: error.model,
        retryable: error.retryable,
        message: error.message,
      });
      return error.retryable
        ? json(503, { error: 'The estimate service is busy. Try again in a moment.' })
        : json(502, { error: 'That could not be estimated. Nothing has been logged.' });
    }
    context.error('ai.call.error', { message: String(error) });
    return json(500, { error: 'Something went wrong. Nothing has been logged.' });
  }
}

app.http('ai', {
  methods: ['POST'],
  // See the header. Not 'anonymous', and not a substitute for auth either.
  authLevel: 'function',
  route: 'ai/{task}',
  handler: aiHandler,
});
