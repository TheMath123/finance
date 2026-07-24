import {
  type Control,
  type FieldValues,
  type Path,
  useController,
} from 'react-hook-form';
import { View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Input } from '@/components/ui/input';

export interface CodeFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  /** Chamado assim que o código atinge os 6 dígitos — usado pra auto-enviar o formulário. */
  onComplete?: (code: string) => void;
}

/**
 * Campo do código de 6 dígitos (reset de senha): só aceita dígitos, corta em 6
 * caracteres — não dá pra digitar/colar nada além do código.
 */
export function CodeField<T extends FieldValues>({
  control,
  name,
  label,
  onComplete,
}: CodeFieldProps<T>) {
  const { field, fieldState } = useController({ control, name });

  const handleChangeText = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 6);
    field.onChange(digits);
    if (digits.length === 6) onComplete?.(digits);
  };

  return (
    <View className="gap-1.5">
      {label && <ThemedText type="smallBold">{label}</ThemedText>}
      <Input
        className={fieldState.error ? 'border-destructive' : undefined}
        value={(field.value as string | undefined) ?? ''}
        onChangeText={handleChangeText}
        onBlur={field.onBlur}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="000000"
        style={{
          letterSpacing: 4,
          textAlign: 'center',
          fontVariant: ['tabular-nums'],
        }}
      />
      {fieldState.error?.message && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {fieldState.error.message}
        </ThemedText>
      )}
    </View>
  );
}
