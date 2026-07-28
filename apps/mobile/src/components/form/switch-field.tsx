import {
  type Control,
  type FieldValues,
  type Path,
  useController,
} from 'react-hook-form';
import { Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BrandColors } from '@/constants/theme';

export interface SwitchFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
}

export function SwitchField<T extends FieldValues>({
  control,
  name,
  label,
}: SwitchFieldProps<T>) {
  const { field } = useController({ control, name });

  return (
    <View className="flex-row items-center justify-between gap-3 py-1">
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <Switch
        value={Boolean(field.value)}
        onValueChange={field.onChange}
        trackColor={{ false: '#d4d4d8', true: BrandColors.primary }}
      />
    </View>
  );
}
