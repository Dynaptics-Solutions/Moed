/**
 * Two families and no third, from `design/README.md`.
 *
 *   Display — Cormorant Garamond (300/400/500). Dates, counts, big numbers, titles.
 *   UI      — Archivo (400/500/600/700). Everything interactive, every label, every row.
 *
 * Both are bundled with the app, never fetched at runtime: offline is a
 * non-negotiable, so Google Fonts over the network is not an option.
 */

export const fonts = {
  displayLight: 'CormorantGaramond_300Light',
  display: 'CormorantGaramond_400Regular',
  displayMedium: 'CormorantGaramond_500Medium',
  ui: 'Archivo_400Regular',
  uiMedium: 'Archivo_500Medium',
  uiSemiBold: 'Archivo_600SemiBold',
  uiBold: 'Archivo_700Bold',
} as const;

/**
 * The scale as used. React Native has no `line-height: 1.35` — these are resolved to
 * absolute pixels so the ratio in the design survives.
 */
export const type = {
  /** Screen title (a date). Cormorant 32–36 / 1.06, tracking .005em */
  screenTitle: {
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 36,
    letterSpacing: 0.17,
  },
  /** Sheet or section title. Cormorant 26–27 / 1.2 */
  sheetTitle: {
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 31,
  },
  /** Big number. Cormorant 30–52 / 1 — size is set per use. */
  bigNumber: {
    fontFamily: fonts.display,
    fontSize: 44,
    lineHeight: 44,
  },
  /** Section label. Archivo 9.5 / 1, 600, tracking .17em, uppercase, taupe */
  sectionLabel: {
    fontFamily: fonts.uiSemiBold,
    fontSize: 9.5,
    lineHeight: 9.5,
    letterSpacing: 1.62,
    textTransform: 'uppercase',
  },
  /** Field label. Archivo 9 / 1, 600, tracking .13em, uppercase, ink3 */
  fieldLabel: {
    fontFamily: fonts.uiSemiBold,
    fontSize: 9,
    lineHeight: 9,
    letterSpacing: 1.17,
    textTransform: 'uppercase',
  },
  /** Row title. Archivo 15 / 1.35 */
  rowTitle: {
    fontFamily: fonts.ui,
    fontSize: 15,
    lineHeight: 20,
  },
  /** Body. Archivo 12–14.5 / 1.5–1.65 */
  body: {
    fontFamily: fonts.ui,
    fontSize: 14,
    lineHeight: 21,
  },
  /** Secondary body. Archivo 12 / 1.5 */
  bodySmall: {
    fontFamily: fonts.ui,
    fontSize: 12,
    lineHeight: 18,
  },
  /** Meta / tertiary. Archivo 11.5 / 1.5 */
  meta: {
    fontFamily: fonts.ui,
    fontSize: 11.5,
    lineHeight: 17,
  },
  /** Button. Archivo 14.5, 600 */
  button: {
    fontFamily: fonts.uiSemiBold,
    fontSize: 14.5,
  },
  /** Chip. Archivo 12 / 1, 500 */
  chip: {
    fontFamily: fonts.uiMedium,
    fontSize: 12,
    lineHeight: 12,
  },
} as const;
