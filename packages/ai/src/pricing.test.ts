import { describe, expect, it } from 'vitest';

import { costOf, isModelId, PRICES, providerOf } from './pricing';

describe('costOf', () => {
  it('costs the photo estimate from ARCHITECTURE.md 6.3 on Haiku', () => {
    // 2,600 in / 300 out. The document's figure is $0.0040.
    const cost = costOf(
      { inputTokens: 2600, outputTokens: 300, cachedInputTokens: 0, cacheWriteTokens: 0 },
      'claude-haiku-4-5',
    );
    expect(cost).toBeCloseTo(0.0026 + 0.0015, 6);
    expect(cost).toBeCloseTo(0.0041, 4);
  });

  it('costs the same call on gpt-4o-mini at roughly a seventh', () => {
    const haiku = costOf(
      { inputTokens: 2600, outputTokens: 300, cachedInputTokens: 0, cacheWriteTokens: 0 },
      'claude-haiku-4-5',
    );
    const mini = costOf(
      { inputTokens: 2600, outputTokens: 300, cachedInputTokens: 0, cacheWriteTokens: 0 },
      'gpt-4o-mini',
    );
    expect(haiku / mini).toBeGreaterThan(6);
    expect(haiku / mini).toBeLessThan(8);
  });

  it('charges cache reads at a tenth on Anthropic', () => {
    const cached = costOf(
      { inputTokens: 0, outputTokens: 0, cachedInputTokens: 1_000_000, cacheWriteTokens: 0 },
      'claude-haiku-4-5',
    );
    expect(cached).toBeCloseTo(0.1, 6);
  });

  it('charges cache writes at a premium, so caching is not free on the first call', () => {
    const write = costOf(
      { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, cacheWriteTokens: 1_000_000 },
      'claude-haiku-4-5',
    );
    const plain = costOf(
      { inputTokens: 1_000_000, outputTokens: 0, cachedInputTokens: 0, cacheWriteTokens: 0 },
      'claude-haiku-4-5',
    );
    expect(write).toBeGreaterThan(plain);
    expect(write).toBeCloseTo(1.25, 6);
  });

  it('is zero for a call that used nothing', () => {
    expect(
      costOf(
        { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, cacheWriteTokens: 0 },
        'gpt-4o-mini',
      ),
    ).toBe(0);
  });
});

describe('the price table', () => {
  it('routes every model to a provider', () => {
    expect(providerOf('gpt-4o-mini')).toBe('openai');
    expect(providerOf('claude-haiku-4-5')).toBe('anthropic');
  });

  it('never prices output below input, on any model', () => {
    for (const [model, price] of Object.entries(PRICES)) {
      expect(price.outputPerMTok, model).toBeGreaterThanOrEqual(price.inputPerMTok);
    }
  });

  it('never prices a cache read above a full input token', () => {
    for (const [model, price] of Object.entries(PRICES)) {
      expect(price.cachedInputPerMTok, model).toBeLessThanOrEqual(price.inputPerMTok);
    }
  });

  it('recognises model ids and rejects anything else', () => {
    expect(isModelId('claude-haiku-4-5')).toBe(true);
    expect(isModelId('gpt-4o-mini')).toBe(true);
    expect(isModelId('gpt-4')).toBe(false);
  });
});
