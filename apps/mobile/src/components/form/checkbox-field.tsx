import {
  type Control,
  type FieldValues,
  type Path,
  useController,
} from 'react-hook-form';
import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Checkbox } from '@/components/ui/checkbox';

export interface CheckboxFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
}

export function CheckboxField<T extends FieldValues>({
  control,
  name,
  label,
}: CheckboxFieldProps<T>) {
  const { field, fieldState } = useController({ control, name });
  const checked = Boolean(field.value);

  return (
    <View className="gap-1.5">
      <Pressable
        className="flex-row items-center gap-2"
        onPress={() => field.onChange(!checked)}
      >
        {/* onCheckedChange fica de fora de propósito — o toque é tratado pelo Pressable
            de fora, que cobre a linha inteira (caixinha + label), não só a caixinha. */}
        <Checkbox checked={checked} />
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
      </Pressable>
      {fieldState.error?.message && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {fieldState.error.message}
        </ThemedText>
      )}
    </View>
  );
}
