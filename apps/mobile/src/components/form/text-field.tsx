import type { ReactNode } from 'react';
import {
  type Control,
  type FieldValues,
  type Path,
  useController,
} from 'react-hook-form';
import { type TextInputProps, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';

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
  className?: string;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  className,
  leadingIcon,
  trailingIcon,
  ...inputProps
}: TextFieldProps<T>) {
  const { field, fieldState } = useController({ control, name });

  return (
    <View className="gap-1.5">
      {label && <ThemedText type="smallBold">{label}</ThemedText>}
      <Input
        className={cn(fieldState.error && 'border-destructive', className)}
        leadingIcon={leadingIcon}
        trailingIcon={trailingIcon}
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
