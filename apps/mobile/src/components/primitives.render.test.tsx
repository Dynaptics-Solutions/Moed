import { render } from '@testing-library/react-native';

import { Button } from './Button';
import { Chip } from './Chip';
import { Note, Toggle } from './Field';
import { RecordRow } from './RecordRow';
import { Ring } from './Ring';
import { lightColors } from '@/theme/tokens';

/**
 * The shared row, ring, chip and button. Every list and every form is built from these,
 * so a fault here is a fault in a dozen screens at once — which is exactly the kind of
 * thing worth catching without a device.
 *
 * These assert behaviour the design settles, not styling for its own sake: that overdue
 * is a fact rather than an alarm, that a finished record reads as finished, and that
 * nothing draws in the alert colour except the thing the alert colour means.
 */

function styleValue(node: { props?: { style?: unknown } }, key: string): unknown {
  const styles = [node.props?.style].flat(4).filter(Boolean) as Record<string, unknown>[];
  return styles.map((s) => s?.[key]).find((v) => v !== undefined);
}

/** Every colour anywhere in a rendered tree, for the "never `over`" assertions. */
function allColours(node: unknown): unknown[] {
  if (node === null || typeof node !== 'object') return [];
  const n = node as { props?: { style?: unknown }; children?: unknown[] | null };
  const own = [
    styleValue(n, 'color'),
    styleValue(n, 'backgroundColor'),
    styleValue(n, 'borderColor'),
  ];
  const kids = (n.children ?? []).flatMap(allColours);
  return [...own.filter(Boolean), ...kids];
}

describe('RecordRow', () => {
  it('reads an overdue record as a fact, never as an alarm', async () => {
    // A record that has slipped is `ink3`. Turning it red forever is the failure the
    // tray exists to avoid, and `over` is only ever past the limit.
    const view = await render(<RecordRow title="Reply to Marta" overdue />);

    expect(styleValue(view.getByText('Overdue'), 'color')).toBe(lightColors.ink3);
    expect(allColours(view.toJSON())).not.toContain(lightColors.over);
  });

  it('strikes through a finished record and dims it', async () => {
    const view = await render(<RecordRow title="Standup" done />);
    const title = view.getByText('Standup');

    expect(styleValue(title, 'textDecorationLine')).toBe('line-through');
    expect(styleValue(title, 'color')).toBe(lightColors.ink3);
  });

  it('leaves an open record in full ink and unstruck', async () => {
    const view = await render(<RecordRow title="Draft the roadmap" />);
    const title = view.getByText('Draft the roadmap');

    expect(styleValue(title, 'color')).toBe(lightColors.ink);
    expect(styleValue(title, 'textDecorationLine')).toBeUndefined();
  });

  it('shows the meta line and the project dot only when given one', async () => {
    const withMeta = await render(
      <RecordRow title="Copy" meta="Operon · 2h block" projectColour={lightColors.acc} />,
    );
    expect(withMeta.getByText('Operon · 2h block')).toBeTruthy();

    const without = await render(<RecordRow title="Copy" />);
    expect(without.queryByText('Operon · 2h block')).toBeNull();
  });

  it('prefers the overdue mark over the trailing figure', async () => {
    // Both cannot be true at once, and which one wins is a rule rather than an accident.
    const view = await render(<RecordRow title="Copy" trailing="10:00" overdue />);

    expect(view.getByText('Overdue')).toBeTruthy();
    expect(view.queryByText('10:00')).toBeNull();
  });
});

describe('Ring', () => {
  it('fills when done and stays an outline when not', async () => {
    const done = await render(<Ring done label="Standup" />);
    expect(allColours(done.toJSON())).toContain(lightColors.accFill);

    const open = await render(<Ring done={false} label="Standup" />);
    expect(allColours(open.toJSON())).not.toContain(lightColors.accFill);
    expect(allColours(open.toJSON())).toContain(lightColors.ink3);
  });

  it('is a checkbox to a screen reader, carrying its row name', async () => {
    const view = await render(<Ring done label="Standup" onPress={() => {}} />);

    expect(view.getByLabelText('Standup')).toBeTruthy();
    expect(view.getByRole('checkbox', { checked: true })).toBeTruthy();
  });
});

describe('Chip', () => {
  it('fills when selected', async () => {
    const on = await render(<Chip label="Today" selected />);
    expect(styleValue(on.getByText('Today'), 'color')).toBe(lightColors.onAcc);

    const off = await render(<Chip label="Today" />);
    expect(styleValue(off.getByText('Today'), 'color')).toBe(lightColors.ink2);
  });
});

describe('Button', () => {
  it('draws the primary filled and the secondary outlined', async () => {
    const primary = await render(<Button label="Save" />);
    expect(styleValue(primary.getByText('Save'), 'color')).toBe(lightColors.onAcc);

    const secondary = await render(<Button label="Add it anyway" variant="secondary" />);
    expect(styleValue(secondary.getByText('Add it anyway'), 'color')).toBe(lightColors.ink);
  });

  it('says it is disabled rather than only looking it', async () => {
    const view = await render(<Button label="Save" disabled />);

    expect(view.getByRole('button', { disabled: true })).toBeTruthy();
  });
});

describe('Toggle', () => {
  it('is a switch to a screen reader, and reports its state', async () => {
    const view = await render(<Toggle on label="Travel there and back" />);

    expect(view.getByRole('switch', { checked: true })).toBeTruthy();
  });
});

describe('Note', () => {
  it('uses the accent surface, and taupe when asked, but never the alert colour', async () => {
    const acc = await render(<Note>This fits.</Note>);
    expect(allColours(acc.toJSON())).toContain(lightColors.acc);
    expect(allColours(acc.toJSON())).not.toContain(lightColors.over);

    const taupe = await render(<Note tone="taupe">Part of the subscription.</Note>);
    expect(allColours(taupe.toJSON())).toContain(lightColors.taupe);
  });
});
