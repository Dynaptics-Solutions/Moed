import { formatMinutes } from '@moed/core';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { Field, Note } from '@/components/Field';
import { FormScaffold } from '@/components/FormScaffold';
import { WhenInput } from '@/components/WhenInput';
import { clockTime, whenDay } from '@/lib/day';
import { useKindForm } from '@/lib/useKindForm';
import { useTheme } from '@/theme';

/**
 * `appt` — fixed, and the only kind whose time the user did not choose.
 *
 * It spends the day's hours from the taupe segment rather than the accent one, which is
 * the visual difference between load you took on and load that was handed to you.
 *
 * The design shows the title and time read-only, because the appointment came from a
 * calendar and is edited where it came from. Calendar import is not built yet, so both
 * are editable here; the read-only treatment arrives with the import rather than being
 * faked before it.
 *
 * Travel is a real cost and it is drawn as one. Adding it does not shorten the
 * appointment — it lengthens what the day spends, and the note says by how much.
 *
 * DEPARTS FROM THE PROTOTYPE, which shows both add-ons as toggles and travel as
 * "25m each way". That number is the paid capability drawn as though it were free:
 * `screen.dc.html` lists "travel times and errand routes" as paid with the reason
 * "maps", so the 25 is what a route lookup would have returned. Hardcoding it invents
 * a figure about a journey the app knows nothing about, and non-negotiable 4 exists
 * to stop exactly that.
 *
 * So the person says how long instead, through the same chips the task form uses to
 * pick a length. Tapping the chosen one again clears it, which is what the toggle was
 * for. A computed estimate can still arrive with the maps integration, and when it
 * does it arrives as a range.
 */

const TRAVEL_EACH_WAY: { label: string; minutes: number }[] = [
  { label: '10m', minutes: 10 },
  { label: '20m', minutes: 20 },
  { label: '30m', minutes: 30 },
  { label: '45m', minutes: 45 },
];

const PREP: { label: string; minutes: number }[] = [
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '1h', minutes: 60 },
];

export default function Appointment() {
  const theme = useTheme();
  const form = useKindForm('appointment', 60);
  // Null until the person says. Nothing is added on their behalf, so nothing has to be
  // guessed on their behalf either.
  const [travel, setTravel] = useState<number | null>(null);
  const [prep, setPrep] = useState<number | null>(null);

  const extra = (travel ?? 0) * 2 + (prep ?? 0);
  const total = form.lengthMinutes + extra;

  const freeBefore = form.limit - form.load.committed - form.load.fixed;
  const freeAfter = freeBefore - total;

  // "today's 4h free", "Thursday's 4h free" — the note describes the day the
  // appointment is on, which is not always this one.
  const dayPossessive = form.dayLabel === 'Today' ? "today's" : `${form.dayLabel}'s`;

  const start = new Date(form.startAt);
  const end = new Date(form.startAt + form.lengthMinutes * 60_000);

  return (
    <FormScaffold
      kindLabel={form.isEditing ? 'Edit appointment' : 'New appointment'}
      leading={{ label: 'Back', onPress: form.back }}
      title={form.title}
      onTitleChange={form.setTitle}
      titlePlaceholder="Dentist"
      saveLabel="Save appointment"
      budget={{
        load: form.load,
        limit: form.limit,
        adding: total,
        addingIsFixed: true,
        dayLabel: form.dayLabel,
      }}
      onSave={() =>
        void form.save(
          {
            kind: 'appointment',
            title: form.title,
            lengthMinutes: total,
            startAt: form.startAt,
            isFixed: true,
            recurrence: form.recurrence,
          },
          form.id,
        )
      }
    >
      <View
        style={[
          styles.head,
          {
            backgroundColor: theme.colors.taupeSoft,
            borderColor: theme.colors.taupe,
            borderRadius: theme.geometry.card.radius,
          },
        ]}
      >
        <Text style={[theme.type.bodySmall, { color: theme.colors.ink }]}>
          {clockTime(start)} — {clockTime(end)} · {formatMinutes(form.lengthMinutes)}
        </Text>
        <Text style={[theme.type.meta, styles.headSub, { color: theme.colors.ink3 }]}>
          Fixed. It spends the day whether or not you chose it.
        </Text>
      </View>

      <Field label="When">
        <WhenInput
          at={form.startAt}
          onChange={form.setStartAt}
          value={`${whenDay(start, form.today)} · ${clockTime(start)}`}
        />
      </Field>

      <Text style={[theme.type.sectionLabel, { color: theme.colors.taupe }]}>You can add</Text>

      <Field label="Travel, each way">
        <Lengths options={TRAVEL_EACH_WAY} chosen={travel} onChoose={setTravel} />
      </Field>

      <Field label="Prep block before">
        <Lengths options={PREP} chosen={prep} onChoose={setPrep} />
      </Field>

      {extra > 0 && (
        <Note>
          {freeAfter >= 0
            ? `That adds ${formatMinutes(extra)} to ${dayPossessive} ${formatMinutes(freeBefore)} free. It leaves ${formatMinutes(freeAfter)}.`
            : `That adds ${formatMinutes(extra)}, which is more than ${dayPossessive} ${formatMinutes(freeBefore)} free.`}
        </Note>
      )}
    </FormScaffold>
  );
}

/** Pick a length, or tap the chosen one again to take it back off. */
function Lengths({
  options,
  chosen,
  onChoose,
}: {
  options: { label: string; minutes: number }[];
  chosen: number | null;
  onChoose: (next: number | null) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map((o) => (
        <Chip
          key={o.label}
          label={o.label}
          selected={chosen === o.minutes}
          onPress={() => onChoose(chosen === o.minutes ? null : o.minutes)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { borderWidth: 1, padding: 16 },
  headSub: { marginTop: 7 },
  chips: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
});
