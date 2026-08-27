import { Platform } from 'react-native';

/**
 * Platform differences are real, not cosmetic — iOS gets tighter radii, bottom tabs
 * and an inline add pill; Android gets pill buttons, looser radii and a FAB.
 * Values from the geometry table in `design/README.md`.
 *
 * The prototype's 44px iOS "safe-area top inset" is deliberately absent: that was the
 * HTML frame faking a notch. Use `react-native-safe-area-context` for real insets.
 */
const ios = Platform.OS === 'ios';

export const geometry = {
  button: { height: 48, radius: ios ? 13 : 26 },
  card: { radius: ios ? 14 : 18 },
  input: { radius: ios ? 11 : 14, minHeight: 42 },
  sheet: { radius: ios ? 26 : 30 },
  chip: { radius: 19 },
  /** The capacity bar is the same on both platforms. */
  bar: { height: 10, radius: 5, minSegment: 2 },
  nav: { height: 36, bottomPad: ios ? 26 : 14 },
  /** iOS: an inline pill above the tab bar. Android: a FAB, bottom-right. */
  add: ios ? { kind: 'pill' as const, height: 50 } : { kind: 'fab' as const, size: 58, radius: 19 },
  /** 19x19, 1.4px ink3 ring; checked fills accFill with a white 1.8px tick. */
  ring: { size: 19, borderWidth: 1.4, tickWidth: 1.8 },
  /** 36x4 grabber at the top of every sheet. */
  grabber: { width: 36, height: 4, radius: 2 },
} as const;
