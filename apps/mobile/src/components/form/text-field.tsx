import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';
import { TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export interface TextFieldProps<T extends FieldValues>
  extends Pick<TextInputProps, 'placeholder' | 'autoCapitalize' | 'keyboardType' | 'autoComplete'> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
}

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  ...inputProps
}: TextFieldProps<T>) {
  const { field, fieldState } = useController({ control, name });
  const hasError = Boolean(fieldState.error);

  return (
    <View className="gap-1.5">
      {label && <ThemedText type="smallBold">{label}</ThemedText>}
      <TextInput
        className={`rounded-xl border px-4 py-3 text-base dark:text-white ${
          hasError ? 'border-danger' : 'border-neutral-300 dark:border-neutral-700'
        }`}
        placeholderTextColor="#9CA3AF"
        value={(field.value as string | undefined) ?? ''}
        onChangeText={field.onChange}
        onBlur={field.onBlur}
        {...inputProps}
      />
      {fieldState.error?.message && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {fieldState.error.message}
        </ThemedText>
      )}
    </View>
  );
}
