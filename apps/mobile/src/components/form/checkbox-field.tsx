import { CheckIcon } from 'phosphor-react-native';
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { cn } from '@/lib/cn';

export interface CheckboxFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
}

export function CheckboxField<T extends FieldValues>({ control, name, label }: CheckboxFieldProps<T>) {
  const { field, fieldState } = useController({ control, name });
  const checked = Boolean(field.value);
  const hasError = Boolean(fieldState.error);

  return (
    <View className="gap-1.5">
      <Pressable className="flex-row items-center gap-2.5" onPress={() => field.onChange(!checked)}>
        <ThemedView
          className={cn(
            'h-5 w-5 items-center justify-center rounded-md border',
            hasError && !checked ? 'border-danger' : 'border-neutral-400 dark:border-neutral-600',
          )}
          type={checked ? 'backgroundSelected' : 'background'}>
          {checked && <CheckIcon size={14} weight="bold" color="#2563EB" />}
        </ThemedView>
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
      </Pressable>
      {fieldState.error?.message && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {fieldState.error.message}
        </ThemedText>
      )}
    </View>
  );
}
