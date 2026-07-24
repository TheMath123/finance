import {
  type Control,
  type FieldValues,
  type Path,
  useController,
} from 'react-hook-form';
import { type TextInputProps, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Input } from '@/components/ui/input';

export interface TextFieldProps<T extends FieldValues>
  extends Pick<
    TextInputProps,
    | 'placeholder'
    | 'autoCapitalize'
    | 'keyboardType'
    | 'autoComplete'
    | 'returnKeyType'
    | 'onSubmitEditing'
    | 'editable'
  > {
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

  return (
    <View className="gap-1.5">
      {label && <ThemedText type="smallBold">{label}</ThemedText>}
      <Input
        className={fieldState.error ? 'border-destructive' : undefined}
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
