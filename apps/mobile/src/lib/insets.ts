import { useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context';

/**
 * Safe-area insets as a screen *inside the bottom tabs* should read them.
 *
 * React Navigation does not zero the bottom inset for a tab scene — `useSafeAreaInsets`
 * still hands back the device's full figure there, 24dp under gesture navigation and
 * 48dp with three buttons on the Pixel we measured. But the scene already ends at the
 * top of the tab bar, and the tab bar is what pays that inset. Adding it again inside
 * the screen spends it twice: the Android FAB was floating 41dp above the bar under
 * gestures and 65dp with three buttons, against an intended 16.
 *
 * The top inset is untouched, because nothing above a tab screen pays for that one.
 *
 * Screens OUTSIDE the tabs — every sheet, every form, every full-screen route — must
 * keep calling `useSafeAreaInsets` directly. For them there is no tab bar underneath,
 * so the bottom inset really is theirs to clear.
 */
export function useTabScreenInsets(): EdgeInsets {
  const insets = useSafeAreaInsets();
  return { ...insets, bottom: 0 };
}
