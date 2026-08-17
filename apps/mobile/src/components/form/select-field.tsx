import {
  type Control,
  type FieldValues,
  type Path,
  useController,
} from 'react-hook-form';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Select, type SelectOption } from '@/components/ui/select';

export interface SelectFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  searchable?: boolean;
  searchPlaceholder?: string;
}

export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  options,
  searchable,
  searchPlaceholder,
}: SelectFieldProps<T>) {
  const { field, fieldState } = useController({ control, name });

  return (
    <View className="gap-1.5">
      {label && <ThemedText type="smallBold">{label}</ThemedText>}
      <Select
        className={fieldState.error ? 'border-destructive' : undefined}
        placeholder={placeholder}
        options={options}
        value={field.value as string | undefined}
        onValueChange={field.onChange}
        searchable={searchable}
        searchPlaceholder={searchPlaceholder}
      />
      {fieldState.error?.message && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {fieldState.error.message}
        </ThemedText>
      )}
    </View>
  );
}
