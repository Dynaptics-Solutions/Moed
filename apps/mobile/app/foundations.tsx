import { ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { sqlite } from '@/db/client';
import { syncedTables } from '@/db/schema';
import { useTheme } from '@/theme';

/**
 * Phase 0's verification surface, and not a product screen — it exists to prove the
 * foundations are live on a real device: both families at their real scale, the token
 * palette following the system theme, and a database that actually migrated.
 *
 * Off the default path at /foundations, because `day` is home now. It goes for good
 * once Phase 0 has been confirmed on hardware.
 */
export default function Foundations() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';

  const tables = sqlite
    .getAllSync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
    .map((row) => row.name);

  const synced = Object.keys(syncedTables).length;
  const health = tables.filter((name) => name.startsWith('health_')).length;

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + 20,
        paddingBottom: insets.bottom + 28,
        paddingHorizontal: 20,
        gap: 22,
      }}
    >
      <View style={styles.header}>
        <Text style={[theme.type.sectionLabel, { color: theme.colors.taupe }]}>Phase 0</Text>
        <Text style={[theme.type.screenTitle, { color: theme.colors.ink }]}>Foundations</Text>
        <Text style={[theme.type.body, { color: theme.colors.ink2 }]}>
          Not part of the app. This screen confirms the type, the palette and the database are real
          on this device.
        </Text>
      </View>

      <Card>
        <CardLabel>Type</CardLabel>
        <Text style={[theme.type.bigNumber, { color: theme.colors.ink }]}>9h 30m</Text>
        <Text style={[theme.type.rowTitle, { color: theme.colors.ink }]}>
          Archivo carries every row and every label.
        </Text>
        <Text style={[theme.type.meta, { color: theme.colors.ink3 }]}>
          Cormorant Garamond above, Archivo here. If either falls back to a system face, the bundled
          font did not load.
        </Text>
      </Card>

      <Card>
        <CardLabel>Palette</CardLabel>
        <View style={styles.swatches}>
          {(
            [
              ['acc', theme.colors.acc],
              ['taupe', theme.colors.taupe],
              ['over', theme.colors.over],
              ['ink3', theme.colors.ink3],
            ] as const
          ).map(([name, value]) => (
            <View key={name} style={styles.swatch}>
              <View
                style={[styles.chip, { backgroundColor: value, borderColor: theme.colors.line }]}
              />
              <Text style={[theme.type.meta, { color: theme.colors.ink2 }]}>{name}</Text>
            </View>
          ))}
        </View>
        <Text style={[theme.type.meta, { color: theme.colors.ink3 }]}>
          Following the {scheme} theme. Switch the system appearance and these change with it.
        </Text>
      </Card>

      <Card>
        <CardLabel>Database</CardLabel>
        <Row label="Tables" value={String(tables.length)} />
        <Row label="Synced" value={String(synced)} />
        <Row label="Local only" value={`${health} health`} />
        <Text style={[theme.type.meta, { color: theme.colors.ink3 }]}>
          Health tables carry no sync columns and have no server-side counterpart. They cannot leak
          because there is nowhere for them to go.
        </Text>
      </Card>
    </ScrollView>
  );

  function Card({ children }: { children: React.ReactNode }) {
    return (
      <View
        style={[
          styles.card,
          theme.shadow,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.line,
            borderRadius: theme.geometry.card.radius,
          },
        ]}
      >
        {children}
      </View>
    );
  }

  function CardLabel({ children }: { children: React.ReactNode }) {
    return <Text style={[theme.type.sectionLabel, { color: theme.colors.taupe }]}>{children}</Text>;
  }

  function Row({ label, value }: { label: string; value: string }) {
    return (
      <View style={[styles.row, { borderTopColor: theme.colors.line2 }]}>
        <Text style={[theme.type.rowTitle, { color: theme.colors.ink }]}>{label}</Text>
        <Text style={[theme.type.rowTitle, { color: theme.colors.ink2 }]}>{value}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  header: { gap: 7 },
  card: { borderWidth: 1, padding: 18, gap: 11 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 11,
  },
  swatches: { flexDirection: 'row', gap: 18 },
  swatch: { gap: 5, alignItems: 'center' },
  chip: { width: 34, height: 34, borderRadius: 17, borderWidth: 1 },
});
