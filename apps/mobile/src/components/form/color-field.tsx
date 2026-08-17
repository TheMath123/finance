import {
  type Control,
  type FieldValues,
  type Path,
  useController,
} from 'react-hook-form';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ColorInput } from '@/components/ui/color-input';

export interface ColorFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  placeholder?: string;
}

export function ColorField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
}: ColorFieldProps<T>) {
  const { field, fieldState } = useController({ control, name });

  return (
    <View className="gap-1.5">
      {label && <ThemedText type="smallBold">{label}</ThemedText>}
      <ColorInput
        placeholder={placeholder}
        value={field.value as string | undefined}
        onValueChange={field.onChange}
      />
      {fieldState.error?.message && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {fieldState.error.message}
        </ThemedText>
      )}
    </View>
  );
}
