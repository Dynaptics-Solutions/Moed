import { Image, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

const MARK = require('../../assets/brand/moed-mark.png') as number;
const WORDMARK = require('../../assets/brand/moed-wordmark.png') as number;

type SplashProps = {
  /** 0 to 1. How much of the opening work is actually finished. */
  progress: number;
};

/**
 * `splash` — the mark, the wordmark, and a rule that says how far in we are.
 *
 * Not a route. It cannot be one: this is what the app shows while the fonts and the
 * database are still opening, which is before there is a router to navigate with. So
 * `_layout` renders it in place of the blank frame it used to return, and the native
 * splash underneath hands over to it without a flash — both draw the same mark on the
 * same `--bg`.
 *
 * Two departures from the prototype, both for the same reason.
 *
 * Its rule sits at a fixed 64%, which is a picture of a loading bar rather than a
 * loading bar. Here the width is the real fraction: two things have to happen before
 * the planner can open — the type has to load and the migrations have to apply — so the
 * rule moves at a half each and reaches the end exactly when the app does.
 *
 * And it carries the line "Restoring 26 August", which belongs to a restore from
 * backup. That arrives in phase 3 with sync; until then there is nothing being
 * restored, and a caption naming a day the app is not fetching would be the first thing
 * this product said to someone, and untrue. The slot is here and empty. Fill it when
 * there is a fact to put in it.
 */
export function Splash({ progress }: SplashProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
      <Image source={MARK} style={styles.mark} resizeMode="contain" />
      <Image source={WORDMARK} style={styles.wordmark} resizeMode="contain" />

      <View
        style={[styles.rule, { bottom: insets.bottom + 64, backgroundColor: theme.colors.line }]}
      >
        <View
          style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: theme.colors.acc }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22 },
  /** 88 wide in the design; the mark is very nearly square, at 402x391. */
  mark: { width: 88, height: 86 },
  /** 196 wide; the wordmark is 735x243, so 65 tall. */
  wordmark: { width: 196, height: 65 },
  rule: {
    position: 'absolute',
    left: 52,
    right: 52,
    height: 2,
    borderRadius: 1,
    overflow: 'hidden',
  },
  fill: { height: '100%' },
});
