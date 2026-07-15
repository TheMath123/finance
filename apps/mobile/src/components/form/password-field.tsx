import { useState } from 'react';
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { EyeIcon, EyeSlashIcon } from 'phosphor-react-native';

import { inputField } from '@/components/form/input-variants';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/cn';

export interface PasswordFieldProps<T extends FieldValues>
  extends Pick<TextInputProps, 'placeholder' | 'autoComplete'> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
}

export function PasswordField<T extends FieldValues>({
  control,
  name,
  label,
  ...inputProps
}: PasswordFieldProps<T>) {
  const { field, fieldState } = useController({ control, name });
  const [visible, setVisible] = useState(false);
  const theme = useTheme();

  return (
    <View className="gap-1.5">
      {label && <ThemedText type="smallBold">{label}</ThemedText>}
      <View className="justify-center">
        <TextInput
          className={cn(inputField({ error: Boolean(fieldState.error) }), 'pl-4 pr-11')}
          placeholderTextColor="#9CA3AF"
          value={(field.value as string | undefined) ?? ''}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          secureTextEntry={!visible}
          {...inputProps}
        />
        <Pressable
          className="absolute right-3"
          hitSlop={8}
          onPress={() => setVisible((v) => !v)}
          accessibilityLabel={visible ? 'Ocultar senha' : 'Mostrar senha'}>
          {visible ? (
            <EyeSlashIcon size={20} color={theme.textSecondary} />
          ) : (
            <EyeIcon size={20} color={theme.textSecondary} />
          )}
        </Pressable>
      </View>
      {fieldState.error?.message && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {fieldState.error.message}
        </ThemedText>
      )}
    </View>
  );
}
