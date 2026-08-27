import { useEffect, useState } from 'react';
import { Keyboard, Platform, useWindowDimensions } from 'react-native';

/**
 * How much of the screen the keyboard is covering, in dp. 0 when it is closed.
 *
 * This has to be read and applied by hand now. Android's `adjustResize` used to make
 * the keyboard the platform's problem — the window shrank and a bottom-anchored footer
 * came up with it. Edge-to-edge ended that: it is mandatory from Android 15 and Expo
 * SDK 57 targets 16, so the window no longer resizes. The IME reports an inset and the
 * app is expected to move its own content.
 *
 * Nothing did, and the measured cost was total: with the keyboard up the IME owned
 * y 1517..2400 of a 2400px screen while the capture sheet sat at y 1937..2279, so the
 * sheet that autofocuses — the highest-frequency action in the app — rendered entirely
 * underneath it. Not clipped: invisible, with its Save button unreachable.
 *
 * Derived from the keyboard's top edge rather than its `height`, which is not the same
 * number. On the Pixel we measured, the IME occupied 336dp of a 914dp screen but the
 * event reported its height as 312 — short by exactly the 24dp navigation bar, which
 * sits under the keys and which `height` does not count. Lifting content by `height`
 * left the Save button 5px into the keyboard. Whether a given platform counts the
 * navigation bar or not, the distance from the screen's bottom to the keyboard's top is
 * the coverage, so that is what this returns.
 *
 * iOS uses the `Will` events so the movement rides the keyboard's own animation curve;
 * Android only emits `Did`.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);
  const { height } = useWindowDimensions();

  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const shown = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) =>
      setInset(Math.max(0, height - e.endCoordinates.screenY)),
    );
    const hidden = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () =>
      setInset(0),
    );
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, [height]);

  return inset;
}
