import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export interface CheckboxFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
}

export function CheckboxField<T extends FieldValues>({ control, name, label }: CheckboxFieldProps<T>) {
  const { field, fieldState } = useController({ control, name });
  const checked = Boolean(field.value);

  return (
    <View className="gap-1">
      <Pressable className="flex-row items-center gap-2" onPress={() => field.onChange(!checked)}>
        <ThemedView
          className="h-5 w-5 items-center justify-center rounded border border-neutral-400"
          type={checked ? 'backgroundSelected' : 'background'}>
          {checked && <ThemedText type="smallBold">✓</ThemedText>}
        </ThemedView>
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
      </Pressable>
      {fieldState.error?.message && (
        <ThemedText type="small" themeColor="textSecondary">
          {fieldState.error.message}
        </ThemedText>
      )}
    </View>
  );
}
