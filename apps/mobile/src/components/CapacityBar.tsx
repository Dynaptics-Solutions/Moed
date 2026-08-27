import { capacity, minutes, remainingLabel, segmentWidths, type Unit } from '@moed/core';
import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { useTheme } from '@/theme';

type CapacityBarProps = {
  /** Load the user chose. Renders `accFill`. */
  committed: number;
  /** Load they did not choose — appointments, bills. Renders `taupe`. */
  fixed: number;
  /** Planned but not yet actual. Renders `taupe` at .75 behind a dashed edge. */
  estimated?: number;
  limit: number;
  /** How the numbers read. Hours today; money and calories arrive with their phases. */
  unit?: Unit;
  /**
   * The caption's left-hand side, which is worded per screen — "5h 20m work · 2h 30m
   * fixed" on the day, "£152 spent · £279 in bills" on money. The right-hand side is
   * rule-governed and this component writes it.
   */
  composition?: string;
  /**
   * The caption is meant to be there. This exists for the month grid, whose cells hold
   * one load bar per day and no text at all — not as licence to drop it from a screen
   * that has the room.
   */
  caption?: boolean;
  /** 10 by default; the inline bars inside forms and cards run at 8. */
  height?: number;
};

/**
 * The product's signature component. One bar, parameterised by unit — hours per day,
 * money per week, calories per week. If you find yourself writing a second one, stop.
 *
 * The arithmetic lives in `@moed/core` so it can run server-side unchanged, and so it
 * can be tested without a renderer. This file is only the drawing.
 *
 * Widths are computed in pixels rather than flex-grown, because the 2px minimum for a
 * non-zero segment cannot be expressed as a flex ratio. Before the first layout pass
 * there is no width to divide, so it flex-grows for that one frame instead.
 */
export function CapacityBar({
  committed,
  fixed,
  estimated = 0,
  limit,
  unit = minutes,
  composition,
  caption = true,
  height,
}: CapacityBarProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);

  const c = capacity({ committed, fixed, estimated, limit });
  const px = segmentWidths(c.segments, c.denominator, width, theme.geometry.bar.minSegment);
  const measured = width > 0;

  const barHeight = height ?? theme.geometry.bar.height;
  const left = composition ?? (c.isEmpty ? 'Nothing planned' : undefined);
  const right = remainingLabel(c, unit);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  // Before measurement, flex-grow by the raw values — the same proportions, without
  // the floor. Visually identical except for segments under 2px, for one frame.
  const size = (key: keyof typeof c.segments) =>
    measured ? { width: px[key] } : { flexGrow: c.segments[key], flexBasis: 0 };

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={left ? `${left}. ${right}.` : `${right}.`}
    >
      <View
        onLayout={onLayout}
        style={[
          styles.bar,
          {
            height: barHeight,
            borderRadius: theme.geometry.bar.radius,
            backgroundColor: theme.colors.card,
            // The one place the alert colour belongs, because it is the one thing it means.
            borderColor: c.isOver ? theme.colors.over : theme.colors.line,
          },
        ]}
      >
        {c.segments.committed > 0 && (
          <View style={[size('committed'), { backgroundColor: theme.colors.accFill }]} />
        )}
        {c.segments.fixed > 0 && (
          <View style={[size('fixed'), { backgroundColor: theme.colors.taupe }]} />
        )}
        {c.segments.estimated > 0 && (
          <View style={[size('estimated'), styles.estimated]}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.taupe }]} />
            <DashedEdge height={barHeight} colour={theme.colors.card} />
          </View>
        )}
        {c.segments.free > 0 && <View style={size('free')} />}
        {/* Not a fourth segment appended to the others — it re-colours the tail. Its
            left edge is the limit, which is why no tick is drawn. */}
        {c.segments.over > 0 && (
          <View style={[size('over'), { backgroundColor: theme.colors.over }]} />
        )}
      </View>

      {caption && (
        <View style={styles.caption}>
          <Text style={[theme.type.bodySmall, { color: theme.colors.ink2 }]} numberOfLines={1}>
            {left ?? ''}
          </Text>
          <Text
            style={[
              theme.type.bodySmall,
              styles.remaining,
              {
                fontFamily: theme.fonts.uiSemiBold,
                color: c.isOver ? theme.colors.over : theme.colors.acc,
              },
            ]}
          >
            {right}
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * The 2px dashed trailing edge on an estimated segment. Drawn rather than set as a
 * border: React Native cannot dash one side of a box on Android, and uncertainty being
 * visible is the whole point of the segment.
 */
function DashedEdge({ height, colour }: { height: number; colour: string }) {
  const dash = 2;
  const count = Math.max(1, Math.floor(height / (dash * 2)));
  return (
    <View style={styles.dashes}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ width: dash, height: dash, backgroundColor: colour }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
  },
  estimated: {
    opacity: 0.75,
    overflow: 'hidden',
  },
  dashes: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'space-evenly',
  },
  caption: {
    marginTop: 9,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
  },
  remaining: {
    flexShrink: 0,
  },
});
