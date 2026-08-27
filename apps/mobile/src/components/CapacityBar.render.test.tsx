import { render } from '@testing-library/react-native';

import { CapacityBar } from './CapacityBar';
import { darkColors, lightColors } from '@/theme/tokens';

/**
 * The bar's arithmetic is tested in `@moed/core`. This is the other half: that the
 * numbers reach the screen, in the right colours, and that the caption says what the
 * rules require it to say.
 *
 * A component test cannot see pixels. What it can see is that the thing mounted, that
 * the segments exist in the order the design specifies, and that `over` appears exactly
 * when the day is over and never otherwise — which is the rule most easily broken by an
 * innocent-looking edit.
 */

const DAY = 570;

type Node = { props?: Record<string, unknown>; children?: (Node | string)[] | null };

function styleValue(node: { props?: { style?: unknown } }, key: string): unknown {
  const styles = [node.props?.style].flat(4).filter(Boolean) as Record<string, unknown>[];
  return styles.map((s) => s?.[key]).find((v) => v !== undefined);
}

/**
 * Every background colour inside the bar, in render order.
 *
 * Walks the rendered tree rather than reaching for an instance handle, because those
 * are renamed between testing-library majors and the tree is not. The bar is found by
 * its own style — a row that clips its children — rather than by a test id, so the
 * component carries nothing it would not otherwise need.
 */
function segmentColours(tree: Node | null): unknown[] {
  const bar = find(
    tree,
    (n) => styleValue(n, 'flexDirection') === 'row' && styleValue(n, 'overflow') === 'hidden',
  );
  if (!bar) return [];

  return (bar.children ?? [])
    .filter((c): c is Node => typeof c !== 'string' && c !== null)
    .map((c) => styleValue(c, 'backgroundColor'))
    .filter(Boolean);
}

function find(node: Node | string | null, matches: (n: Node) => boolean): Node | null {
  if (node === null || typeof node === 'string') return null;
  if (node.props && matches(node)) return node;
  for (const child of node.children ?? []) {
    const hit = find(child, matches);
    if (hit) return hit;
  }
  return null;
}

describe('CapacityBar', () => {
  it('renders the day from the mockup and says what is left', async () => {
    const view = await render(
      <CapacityBar committed={320} fixed={150} limit={DAY} composition="5h 20m work" />,
    );

    expect(view.getByText('1h 40m left')).toBeTruthy();
    expect(view.getByText('5h 20m work')).toBeTruthy();
  });

  it('draws committed before fixed, and no over segment when it fits', async () => {
    const view = await render(<CapacityBar committed={320} fixed={150} limit={DAY} />);
    const colours = segmentColours(view.toJSON() as never);

    expect(colours[0]).toBe(lightColors.accFill);
    expect(colours[1]).toBe(lightColors.taupe);
    expect(colours).not.toContain(lightColors.over);
  });

  it('shows the over colour only when the day is over', async () => {
    const view = await render(<CapacityBar committed={470} fixed={180} limit={DAY} />);

    expect(segmentColours(view.toJSON() as never)).toContain(lightColors.over);
    expect(view.getByText('1h 20m over')).toBeTruthy();
  });

  it('never shows the over colour on a day that fits exactly', async () => {
    // The boundary the rule turns on: at the limit is not past it.
    const view = await render(<CapacityBar committed={570} fixed={0} limit={DAY} />);

    expect(segmentColours(view.toJSON() as never)).not.toContain(lightColors.over);
    expect(view.getByText('0m left')).toBeTruthy();
  });

  it('reads an empty day as free rather than as nothing', async () => {
    const view = await render(<CapacityBar committed={0} fixed={0} limit={DAY} />);

    expect(view.getByText('Nothing planned')).toBeTruthy();
    expect(view.getByText('9h 30m free')).toBeTruthy();
  });

  it('colours the remaining figure by whether it is over', async () => {
    const under = await render(<CapacityBar committed={100} fixed={0} limit={DAY} />);
    expect(styleValue(under.getByText('7h 50m left'), 'color')).toBe(lightColors.acc);

    const over = await render(<CapacityBar committed={700} fixed={0} limit={DAY} />);
    expect(styleValue(over.getByText('2h 10m over'), 'color')).toBe(lightColors.over);
  });

  it('can be drawn without a caption, for the month grid', async () => {
    const view = await render(
      <CapacityBar committed={320} fixed={150} limit={DAY} caption={false} />,
    );

    expect(view.queryByText('1h 40m left')).toBeNull();
  });

  it('describes itself to a screen reader', async () => {
    const view = await render(
      <CapacityBar committed={320} fixed={150} limit={DAY} composition="5h 20m work" />,
    );

    expect(view.getByLabelText('5h 20m work. 1h 40m left.')).toBeTruthy();
  });

  it('uses no colour that is not a token', async () => {
    // The one rule about colour a component test can actually enforce.
    const view = await render(<CapacityBar committed={470} fixed={180} limit={DAY} />);
    const known: unknown[] = [...Object.values(lightColors), ...Object.values(darkColors)];

    for (const colour of segmentColours(view.toJSON() as never)) {
      expect(known).toContain(colour);
    }
  });
});
