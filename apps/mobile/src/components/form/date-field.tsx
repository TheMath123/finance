import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { DatePicker } from '@/components/ui/date-picker';

export interface DateFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
}

/** "YYYY-MM-DD" -> Date local (meio-dia, pra nunca virar o dia por fuso). */
function parseIsoDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day, 12);
}

function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplay(date: Date): string {
  return date.toLocaleDateString('pt-BR');
}

export function DateField<T extends FieldValues>({ control, name, label }: DateFieldProps<T>) {
  const { field, fieldState } = useController({ control, name });

  return (
    <View className="gap-1.5">
      {label && <ThemedText type="smallBold">{label}</ThemedText>}
      <DatePicker
        className={fieldState.error ? 'border-destructive' : undefined}
        placeholder="Selecione a data"
        value={parseIsoDate(field.value as string | undefined)}
        onChange={(date) => field.onChange(formatIsoDate(date))}
        formatDate={formatDisplay}
      />
      {fieldState.error?.message && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {fieldState.error.message}
        </ThemedText>
      )}
    </View>
  );
}
