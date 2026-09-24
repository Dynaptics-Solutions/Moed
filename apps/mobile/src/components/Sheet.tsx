import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKeyboardInset } from '@/lib/keyboard';
import { useTheme } from '@/theme';

type SheetProps = {
  children: React.ReactNode;
  /**
   * A 2px top rule, used by the gate to say which colour of decision this is before a
   * word has been read.
   */
  accent?: string;
  onDismiss?: () => void;
};

/**
 * A bottom sheet over the screen that opened it. Tapping the scrim dismisses.
 *
 * The prototype renders these inside one file switched by a prop; here each is its own
 * route with `presentation: 'transparentModal'`, so the back gesture, the Android back
 * button and the URL all behave without anything being wired by hand.
 */
export function Sheet({ children, accent, onDismiss }: SheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardInset();
  const router = useRouter();

  const dismiss = onDismiss ?? (() => router.back());

  // The keyboard's inset reaches the bottom of the screen, so while it is up it is
  // already covering the gesture bar the safe-area inset exists to clear. Adding both
  // would lift the sheet a further 24dp above the keys for no reason.
  const footRoom = keyboard > 0 ? 0 : insets.bottom;

  return (
    <View style={[styles.host, { paddingBottom: keyboard }]}>
      <Pressable
        style={[StyleSheet.absoluteFill, { backgroundColor: theme.scrim }]}
        onPress={dismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
      />

      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.colors.card,
            borderTopLeftRadius: theme.geometry.sheet.radius,
            borderTopRightRadius: theme.geometry.sheet.radius,
            paddingBottom: (Platform.OS === 'ios' ? 30 : 22) + footRoom,
          },
          accent !== undefined && { borderTopWidth: 2, borderTopColor: accent },
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: theme.colors.line }]} />
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    paddingTop: 12,
    paddingHorizontal: 20,
    gap: 14,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 6,
  },
});
