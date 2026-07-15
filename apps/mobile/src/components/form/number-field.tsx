import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';
import { TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export interface NumberFieldProps<T extends FieldValues>
  extends Pick<TextInputProps, 'placeholder'> {
  control: Control<T>;
  name: Path<T>;
}

/** Guarda o valor do form como number — o input só aceita dígitos e um separador decimal. */
export function NumberField<T extends FieldValues>({ control, name, ...inputProps }: NumberFieldProps<T>) {
  const { field, fieldState } = useController({ control, name });
  const value = field.value as number | undefined;

  return (
    <View className="gap-1">
      <TextInput
        className="rounded-xl border border-neutral-300 px-4 py-3 dark:border-neutral-700 dark:text-white"
        keyboardType="decimal-pad"
        value={value === undefined ? '' : String(value)}
        onChangeText={(text) => {
          const normalized = text.replace(',', '.').replace(/[^0-9.]/g, '');
          field.onChange(normalized === '' ? undefined : Number(normalized));
        }}
        onBlur={field.onBlur}
        {...inputProps}
      />
      {fieldState.error?.message && (
        <ThemedText type="small" themeColor="textSecondary">
          {fieldState.error.message}
        </ThemedText>
      )}
    </View>
  );
}
