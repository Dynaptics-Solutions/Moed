import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';

import { Button } from '@/components/Button';
import { Sheet } from '@/components/Sheet';
import { createProject } from '@/db/projects';
import { useTheme } from '@/theme';

/**
 * `newproject` — a name, and nothing else.
 *
 * NOT IN THE DESIGN, and worth reviewing as a decision rather than a recreation. The
 * prototype's projects screen is drawn with its three already made and sitting at the
 * free cap, so it never had to show the way in — which is why `createProject` was
 * written in phase 1 and never called, and why the projects tab could only ever show
 * its empty state.
 *
 * A name is all it asks for, on the plainer-option principle. A project already carries
 * a colour, a due date and a budget in the schema, but the colour has no palette to pick
 * from — the token set has `acc` and `taupe` and the third slot is `over`, which is only
 * ever past the limit — and a due date needs the picker this app does not have yet. A
 * sheet offering three fields that cannot be filled in is worse than one that asks for
 * the only thing it needs.
 */
export default function NewProject() {
  const theme = useTheme();
  const router = useRouter();

  const [name, setName] = useState('');
  const canSave = name.trim().length > 0;

  const create = async () => {
    if (!canSave) return;
    const project = await createProject(name.trim());
    router.replace({ pathname: '/project', params: { id: project.id } });
  };

  return (
    <Sheet>
      <Text style={[theme.type.sectionLabel, { color: theme.colors.taupe }]}>New project</Text>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="The gallery set"
        placeholderTextColor={theme.colors.ink3}
        style={[theme.type.sheetTitle, styles.name, { color: theme.colors.ink }]}
        selectionColor={theme.colors.acc}
        autoFocus
      />

      <Text style={[theme.type.bodySmall, { color: theme.colors.ink2 }]}>
        Somewhere to group records that share an end. Records join it from their own forms, so there
        is nothing else to set here.
      </Text>

      <Button label="Create" disabled={!canSave} onPress={() => void create()} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  name: { padding: 0 },
});
