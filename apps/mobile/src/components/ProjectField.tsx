import { StyleSheet, View } from 'react-native';

import { Chip } from './Chip';
import { Field, Input } from './Field';
import { useProjects } from '@/db/projects';

/**
 * Which project a record belongs to, if any.
 *
 * Every form drew this as `<Input value="None" muted />` — painted, unpressable, and
 * wired to nothing. Nothing in the app could set `records.project_id`, so every project
 * was permanently empty: the project screen could only ever show its own name, and its
 * three stat cards could only ever read zero.
 *
 * DEPARTS FROM THE PROTOTYPE, which draws a dropdown. There is no picker screen in the
 * design set and inventing one for a list capped at three on the free plan would be a
 * route, a sheet and a back stack to choose between three chips. Chips are what this
 * app already uses to choose one of a few things — lengths on the task form, cadences
 * on the bill form — so the field is built from them. Tapping the chosen one again
 * clears it, which is what "None" was for.
 */
export function ProjectField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  const { data } = useProjects();
  const projects = data ?? [];

  return (
    <Field label="Project">
      {projects.length === 0 ? (
        // Honest rather than inviting. There is nothing to attach this to yet, and a
        // control that opens onto nothing is worse than a sentence saying so.
        <Input value="No projects yet" muted />
      ) : (
        <View style={styles.chips}>
          {projects.map((project) => (
            <Chip
              key={project.id}
              label={project.name}
              selected={value === project.id}
              onPress={() => onChange(value === project.id ? null : project.id)}
            />
          ))}
        </View>
      )}
    </Field>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
});
