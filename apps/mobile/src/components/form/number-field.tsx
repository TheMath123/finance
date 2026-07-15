import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { NumberInput } from '@/components/ui/number-input';

export interface NumberFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
}

export function NumberField<T extends FieldValues>({
  control,
  name,
  label,
  min,
  max,
  step,
}: NumberFieldProps<T>) {
  const { field, fieldState } = useController({ control, name });

  return (
    <View className="gap-1.5">
      {label && <ThemedText type="smallBold">{label}</ThemedText>}
      <NumberInput
        className={fieldState.error ? 'border-destructive' : undefined}
        value={(field.value as number | undefined) ?? min ?? 0}
        onValueChange={field.onChange}
        min={min}
        max={max}
        step={step}
      />
      {fieldState.error?.message && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {fieldState.error.message}
        </ThemedText>
      )}
    </View>
  );
}
