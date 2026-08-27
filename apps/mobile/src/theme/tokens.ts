/**
 * Design tokens, ported verbatim from `design/screen.dc.html` (`:root` and
 * `:root[data-moed="dark"]`). This file is the only place a hex belongs — reference
 * these by name everywhere else.
 *
 * Two rules that are product decisions, not styling preferences:
 *
 *  - `over` is only ever "past the limit". Never for delete, errors or emphasis.
 *    The palette already has a colour for "notice this, but do not panic": taupe.
 *  - The dark theme splits the accent. `acc` lightens for text and strokes, `accFill`
 *    darkens for fills. Do not collapse them.
 */

export type ColorTokens = {
  /** app surface */
  bg: string;
  /** cards, inputs, nav */
  card: string;
  /** primary text */
  ink: string;
  /** secondary text */
  ink2: string;
  /** tertiary, disabled, placeholder — and overdue, which is a fact, not an alarm */
  ink3: string;
  /** borders */
  line: string;
  /** row separators */
  line2: string;
  /** brand; accent text and strokes */
  acc: string;
  /** filled buttons, committed load */
  accFill: string;
  /** text on accent fill */
  onAcc: string;
  /** accent-tinted surfaces */
  accSoft: string;
  /** fixed time, paid badges, labels, low confidence */
  taupe: string;
  /** taupe surfaces */
  taupeSoft: string;
  /** over the limit — only ever this */
  over: string;
  /** over-limit surfaces */
  overSoft: string;
  /** the now-line and the eating-window marker. Never `over` — now is an index, not a state */
  now: string;
};

export const lightColors: ColorTokens = {
  bg: '#F5F2ED',
  card: '#FFFDFA',
  ink: '#1E2B26',
  ink2: '#5C6862',
  ink3: '#97A09B',
  line: 'rgba(30,43,38,0.11)',
  line2: 'rgba(30,43,38,0.06)',
  acc: '#24443C',
  accFill: '#24443C',
  onAcc: '#F5F2ED',
  accSoft: '#E4EAE6',
  taupe: '#A48C7C',
  taupeSoft: '#F0E9E3',
  over: '#A8402F',
  overSoft: '#F7E9E5',
  now: '#1E2B26',
};

export const darkColors: ColorTokens = {
  bg: '#141F1B',
  card: '#1C2A25',
  ink: '#EDE9E1',
  ink2: '#9CA8A2',
  ink3: '#6B7873',
  line: 'rgba(237,233,225,0.13)',
  line2: 'rgba(237,233,225,0.07)',
  acc: '#84B5A2',
  accFill: '#2C5548',
  onAcc: '#EAF3EF',
  accSoft: '#22352E',
  taupe: '#B79F8E',
  taupeSoft: '#2A2422',
  over: '#D98878',
  overSoft: '#33221E',
  now: '#EDE9E1',
};

/**
 * `--sh`, expressed the way React Native takes it. Light is
 * `0 1px 2px rgba(30,43,38,.05)`; dark is `0 1px 2px rgba(0,0,0,.3)`.
 * Android reads `elevation` and ignores the rest.
 */
export const lightShadow = {
  shadowColor: '#1E2B26',
  shadowOffset: { width: 0, height: 1 },
  shadowRadius: 2,
  shadowOpacity: 0.05,
  elevation: 1,
} as const;

export const darkShadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 1 },
  shadowRadius: 2,
  shadowOpacity: 0.3,
  elevation: 1,
} as const;

/** Scrim behind every bottom sheet. */
export const scrim = 'rgba(10,18,15,0.42)';

/** A loose 4px scale. These are the values the designs actually use. */
export const space = {
  xs: 5,
  sm: 7,
  md: 9,
  lg: 11,
  xl: 14,
  xxl: 18,
  xxxl: 20,
  huge: 22,
} as const;
