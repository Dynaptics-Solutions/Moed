import { formatMinutes } from '@moed/core';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Field, Input, Note, Toggle } from '@/components/Field';
import { FormScaffold } from '@/components/FormScaffold';
import { clockTime } from '@/lib/day';
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
 */

const TRAVEL_EACH_WAY = 25;
const PREP = 30;

export default function Appointment() {
  const theme = useTheme();
  const form = useKindForm('appointment', 60);
  const [travel, setTravel] = useState(false);
  const [prep, setPrep] = useState(false);

  const extra = (travel ? TRAVEL_EACH_WAY * 2 : 0) + (prep ? PREP : 0);
  const total = form.lengthMinutes + extra;

  const freeBefore = form.limit - form.load.committed - form.load.fixed;
  const freeAfter = freeBefore - total;

  const start = new Date(form.startAt);
  const end = new Date(form.startAt + form.lengthMinutes * 60_000);

  return (
    <FormScaffold
      kindLabel="Appointment"
      leading={{ label: 'Back', onPress: form.back }}
      title={form.title}
      onTitleChange={form.setTitle}
      titlePlaceholder="Dentist"
      saveLabel="Save appointment"
      budget={{ load: form.load, limit: form.limit, adding: total, addingIsFixed: true }}
      onSave={() =>
        void form.save({
          kind: 'appointment',
          title: form.title,
          lengthMinutes: total,
          startAt: form.startAt,
          isFixed: true,
          recurrence: form.recurrence,
        })
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
        <Input value={`Today · ${clockTime(start)}`} />
      </Field>

      <Text style={[theme.type.sectionLabel, { color: theme.colors.taupe }]}>You can add</Text>

      <AddOn
        label="Travel there and back"
        detail={`${formatMinutes(TRAVEL_EACH_WAY)} each way`}
        on={travel}
        onPress={() => setTravel((v) => !v)}
      />
      <AddOn
        label="Prep block before"
        detail={formatMinutes(PREP)}
        on={prep}
        onPress={() => setPrep((v) => !v)}
      />

      {extra > 0 && (
        <Note>
          {freeAfter >= 0
            ? `That adds ${formatMinutes(extra)} to today's ${formatMinutes(freeBefore)} free. It leaves ${formatMinutes(freeAfter)}.`
            : `That adds ${formatMinutes(extra)}, which is more than today's ${formatMinutes(freeBefore)} free.`}
        </Note>
      )}
    </FormScaffold>
  );

  function AddOn({
    label,
    detail,
    on,
    onPress,
  }: {
    label: string;
    detail: string;
    on: boolean;
    onPress: () => void;
  }) {
    return (
      <View
        style={[
          styles.addOn,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.line,
            borderRadius: theme.geometry.card.radius,
          },
        ]}
      >
        <View style={styles.addOnText}>
          <Text
            style={[
              theme.type.bodySmall,
              { fontFamily: theme.fonts.uiMedium, fontSize: 13.5, color: theme.colors.ink },
            ]}
          >
            {label}
          </Text>
          <Text style={[theme.type.meta, styles.addOnSub, { color: theme.colors.ink3 }]}>
            {detail}
          </Text>
        </View>
        <Toggle on={on} onPress={onPress} label={label} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  head: { borderWidth: 1, padding: 16 },
  headSub: { marginTop: 7 },
  addOn: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 15,
  },
  addOnText: { flex: 1 },
  addOnSub: { marginTop: 3 },
});
