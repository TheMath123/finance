import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';
import { TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export interface TextFieldProps<T extends FieldValues>
  extends Pick<TextInputProps, 'placeholder' | 'autoCapitalize' | 'keyboardType' | 'autoComplete'> {
  control: Control<T>;
  name: Path<T>;
}

export function TextField<T extends FieldValues>({ control, name, ...inputProps }: TextFieldProps<T>) {
  const { field, fieldState } = useController({ control, name });

  return (
    <View className="gap-1">
      <TextInput
        className="rounded-xl border border-neutral-300 px-4 py-3 dark:border-neutral-700 dark:text-white"
        value={(field.value as string | undefined) ?? ''}
        onChangeText={field.onChange}
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
