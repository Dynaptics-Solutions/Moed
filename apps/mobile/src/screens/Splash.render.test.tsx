import { render } from '@testing-library/react-native';

import { Splash } from './Splash';
import { lightColors } from '@/theme/tokens';

/**
 * The opening screen, which is the one screen that cannot be reached by navigating and
 * so is the hardest to look at on a device: on a warm launch it is gone inside a frame.
 *
 * What is worth pinning is the thing that made it worth building over a static image —
 * that the rule is the real fraction of the work done, and not a picture of one.
 */

type TreeNode = { type?: string; props?: { style?: unknown }; children?: unknown[] | null };

/** Every host component in a rendered tree, by name. */
function typesIn(node: TreeNode | null): string[] {
  if (node === null || typeof node !== 'object') return [];
  const kids = (node.children ?? []).flatMap((c) =>
    c !== null && typeof c === 'object' ? typesIn(c as TreeNode) : [],
  );
  return node.type !== undefined ? [node.type, ...kids] : kids;
}

function styleValue(node: { props?: { style?: unknown } }, key: string): unknown {
  const styles = [node.props?.style].flat(4).filter(Boolean) as Record<string, unknown>[];
  return styles.map((s) => s?.[key]).find((v) => v !== undefined);
}

/** The filled part of the rule: the only node painted in the accent. */
function ruleWidth(tree: { props?: { style?: unknown }; children?: unknown[] | null }): unknown {
  if (styleValue(tree, 'backgroundColor') === lightColors.acc) return styleValue(tree, 'width');
  for (const child of tree.children ?? []) {
    if (child !== null && typeof child === 'object') {
      const found = ruleWidth(child as Parameters<typeof ruleWidth>[0]);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

describe('Splash', () => {
  it('draws the rule at the fraction actually finished', async () => {
    const half = await render(<Splash progress={0.5} />);
    expect(ruleWidth(half.toJSON() as Parameters<typeof ruleWidth>[0])).toBe('50%');

    const none = await render(<Splash progress={0} />);
    expect(ruleWidth(none.toJSON() as Parameters<typeof ruleWidth>[0])).toBe('0%');

    const all = await render(<Splash progress={1} />);
    expect(ruleWidth(all.toJSON() as Parameters<typeof ruleWidth>[0])).toBe('100%');
  });

  it('cannot be driven past either end', async () => {
    // Nothing should be able to draw a rule wider than the bar or narrower than empty,
    // however the caller has counted its steps.
    const over = await render(<Splash progress={4} />);
    expect(ruleWidth(over.toJSON() as Parameters<typeof ruleWidth>[0])).toBe('100%');

    const under = await render(<Splash progress={-1} />);
    expect(ruleWidth(under.toJSON() as Parameters<typeof ruleWidth>[0])).toBe('0%');
  });

  it('shows the mark and the wordmark, and no spinner', async () => {
    const { toJSON } = await render(<Splash progress={0.5} />);
    const kinds = typesIn(toJSON() as TreeNode);

    expect(kinds.filter((t) => t === 'Image')).toHaveLength(2);

    // "No spinner" is in the design note for this screen, and an ActivityIndicator is
    // how one gets added later without anyone deciding to.
    expect(kinds).not.toContain('ActivityIndicator');
  });
});
