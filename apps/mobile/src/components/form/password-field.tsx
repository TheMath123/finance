import {
  type Control,
  type FieldValues,
  type Path,
  useController,
} from 'react-hook-form';
import { type TextInputProps, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PasswordInput } from '@/components/ui/password-input';
import { PasswordRequirements } from '@/components/ui/password-requirements';

export interface PasswordFieldProps<T extends FieldValues>
  extends Pick<
    TextInputProps,
    'placeholder' | 'autoComplete' | 'returnKeyType' | 'onSubmitEditing'
  > {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  /** Mostra o checklist de requisitos da senha `strong` abaixo do campo — só no campo de senha NOVA (cadastro, reset, troca), nunca em confirmação/senha atual. */
  showRequirements?: boolean;
}

export function PasswordField<T extends FieldValues>({
  control,
  name,
  label,
  showRequirements,
  ...inputProps
}: PasswordFieldProps<T>) {
  const { field, fieldState } = useController({ control, name });

  return (
    <View className="gap-1.5">
      {label && <ThemedText type="smallBold">{label}</ThemedText>}
      <PasswordInput
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
      {showRequirements && (
        <PasswordRequirements password={(field.value as string) ?? ''} />
      )}
    </View>
  );
}
