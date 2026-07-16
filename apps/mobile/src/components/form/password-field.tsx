import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';
import { View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PasswordInput } from '@/components/ui/password-input';

export interface PasswordFieldProps<T extends FieldValues>
  extends Pick<TextInputProps, 'placeholder' | 'autoComplete' | 'returnKeyType' | 'onSubmitEditing'> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  showStrength?: boolean;
}

export function PasswordField<T extends FieldValues>({
  control,
  name,
  label,
  showStrength,
  ...inputProps
}: PasswordFieldProps<T>) {
  const { field, fieldState } = useController({ control, name });

  return (
    <View className="gap-1.5">
      {label && <ThemedText type="smallBold">{label}</ThemedText>}
      <PasswordInput
        className={fieldState.error ? 'border-destructive' : undefined}
        showStrength={showStrength}
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
