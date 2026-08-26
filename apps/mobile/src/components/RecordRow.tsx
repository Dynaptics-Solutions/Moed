import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Ring } from './Ring';
import { useTheme } from '@/theme';

export type RecordRowProps = {
  title: string;
  done?: boolean;
  /** "Operon · 2h block", "Kensington · leave 13:35". */
  meta?: string;
  /** Draws the project's dot before the meta line. */
  projectColour?: string;
  /** The right-hand figure: a clock time, or a length for anything unscheduled. */
  trailing?: string;
  /**
   * A record that has slipped. It reads `ink3`, not `over` — it is a fact, not an
   * alarm, and turning it red forever is the thing the tray exists to avoid.
   */
  overdue?: boolean;
  /** No separator above the first row in a group. */
  first?: boolean;
  onPress?: () => void;
  onToggle?: () => void;
};

/** One record in a day. The row every list in the planner copies. */
export function RecordRow({
  title,
  done = false,
  meta,
  projectColour,
  trailing,
  overdue = false,
  first = false,
  onPress,
  onToggle,
}: RecordRowProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.row, !first && { borderTopWidth: 1, borderTopColor: theme.colors.line2 }]}
    >
      <Ring done={done} onPress={onToggle} label={title} />

      <View style={styles.body}>
        <Text
          style={[
            theme.type.rowTitle,
            { color: done ? theme.colors.ink3 : theme.colors.ink },
            done && styles.struck,
          ]}
        >
          {title}
        </Text>

        {meta !== undefined && (
          <View style={styles.meta}>
            {projectColour !== undefined && (
              <View style={[styles.dot, { backgroundColor: projectColour }]} />
            )}
            <Text style={[theme.type.meta, { color: theme.colors.ink3 }]} numberOfLines={1}>
              {meta}
            </Text>
          </View>
        )}
      </View>

      {overdue ? (
        <Text
          style={[
            theme.type.meta,
            { fontFamily: theme.fonts.uiSemiBold, color: theme.colors.ink3 },
          ]}
        >
          Overdue
        </Text>
      ) : (
        trailing !== undefined && (
          <Text style={[theme.type.meta, { color: theme.colors.ink3 }]}>{trailing}</Text>
        )
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    paddingVertical: 13,
  },
  body: { flex: 1, minWidth: 0 },
  struck: { textDecorationLine: 'line-through' },
  meta: { marginTop: 5, flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 5, height: 5, borderRadius: 2.5, flexGrow: 0, flexShrink: 0 },
});
