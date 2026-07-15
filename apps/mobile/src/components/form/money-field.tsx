import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';
import { TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { cn } from '@/lib/cn';
import { formatCents } from '@/lib/money';

export interface MoneyFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
}

/**
 * Input de dinheiro estilo "digita da direita pra esquerda" (padrão de apps
 * bancários): cada dígito digitado entra como o último centavo, sempre com
 * 2 casas decimais visíveis. O valor do form fica em CENTAVOS (integer),
 * nunca em reais/float — mesma regra de dinheiro do backend.
 */
export function MoneyField<T extends FieldValues>({ control, name, label }: MoneyFieldProps<T>) {
  const { field, fieldState } = useController({ control, name });
  const cents = (field.value as number | undefined) ?? 0;

  const handleChangeText = (text: string) => {
    const digits = text.replace(/\D/g, '');
    field.onChange(digits === '' ? 0 : Number(digits));
  };

  return (
    <View className="gap-1.5">
      {label && <ThemedText type="smallBold">{label}</ThemedText>}
      <TextInput
        className={cn(
          'rounded-xl border px-4 py-3 text-right text-xl font-semibold dark:text-white',
          fieldState.error ? 'border-destructive' : 'border-neutral-300 dark:border-neutral-700',
        )}
        keyboardType="number-pad"
        value={formatCents(cents)}
        onChangeText={handleChangeText}
        onBlur={field.onBlur}
      />
      {fieldState.error?.message && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {fieldState.error.message}
        </ThemedText>
      )}
    </View>
  );
}
