import { CaretDownIcon, CheckIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '../../lib/cn';
import { PickerSheet } from './picker-sheet';

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

/** Paleta curada (mesma amplitude do Tailwind) pra escolha rápida — o hex manual cobre o resto. */
const PRESET_COLORS = [
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#EAB308',
  '#84CC16',
  '#22C55E',
  '#10B981',
  '#14B8A6',
  '#06B6D4',
  '#0EA5E9',
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#A855F7',
  '#D946EF',
  '#EC4899',
  '#F43F5E',
  '#78716C',
  '#6B7280',
  '#1F2937',
];

export interface ColorInputProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Campo de cor de verdade (bolinha de preview + paleta + hex manual), em vez
 * de um `<select>` com 8 nomes fixos — RN não tem `<input type="color">`
 * nativo, então isso é o equivalente aqui: grade de swatches pra escolha
 * rápida, com input hex pra qualquer cor fora da paleta.
 */
export function ColorInput({
  value,
  onValueChange,
  placeholder = 'Selecione a cor',
  className,
}: ColorInputProps) {
  const [open, setOpen] = useState(false);
  const [hexDraft, setHexDraft] = useState(value ?? '');
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const caret = dark ? '#fafafa' : '#18181b';

  const isValidDraft = HEX_PATTERN.test(hexDraft);

  const openPicker = () => {
    setHexDraft(value ?? '');
    setOpen(true);
  };

  const pick = (color: string) => {
    onValueChange(color);
    setOpen(false);
  };

  const applyDraft = () => {
    if (!isValidDraft) return;
    pick(hexDraft.toUpperCase());
  };

  return (
    <View className={className}>
      <Pressable
        className="h-12 flex-row items-center gap-2 rounded-lg border border-input bg-background px-4 active:bg-accent/30"
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={placeholder}
      >
        <View
          className="h-6 w-6 rounded-full border border-border"
          style={{ backgroundColor: value || 'transparent' }}
        />
        <Text
          className={cn(
            'flex-1 text-base',
            value ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {value ?? placeholder}
        </Text>
        <CaretDownIcon size={14} color={theme.textSecondary} />
      </Pressable>

      <PickerSheet
        visible={open}
        onClose={() => setOpen(false)}
        sheetStyle={{
          paddingHorizontal: 16,
          paddingBottom: 32,
          paddingTop: 16,
          gap: 16,
        }}
      >
        <Text className="text-base font-semibold text-foreground">
          Escolher cor
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10 }}
        >
          {PRESET_COLORS.map((color) => {
            const selected = color.toLowerCase() === value?.toLowerCase();
            return (
              <Pressable
                key={color}
                onPress={() => pick(color)}
                accessibilityRole="button"
                accessibilityLabel={color}
                className="h-11 w-11 items-center justify-center rounded-full"
                style={{
                  backgroundColor: color,
                  borderWidth: selected ? 2 : 0,
                  borderColor: theme.text,
                }}
              >
                {selected && (
                  <CheckIcon size={16} color="#FFFFFF" weight="bold" />
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        <Text className="text-sm text-muted-foreground">
          Ou digite o código hex
        </Text>
        <View className="flex-row items-center gap-3">
          <View
            className="h-11 w-11 rounded-full border border-border"
            style={{
              backgroundColor: isValidDraft ? hexDraft : 'transparent',
            }}
          />
          <TextInput
            value={hexDraft}
            onChangeText={setHexDraft}
            placeholder="#22C55E"
            placeholderTextColor={dark ? '#a1a1aa' : '#71717a'}
            keyboardAppearance={dark ? 'dark' : 'light'}
            selectionColor={caret}
            cursorColor={caret}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={7}
            className="h-11 flex-1 rounded-lg border border-input bg-background px-3 text-base text-foreground"
          />
          <Pressable
            onPress={applyDraft}
            disabled={!isValidDraft}
            className={cn(
              'h-11 items-center justify-center rounded-lg px-4',
              isValidDraft ? 'bg-primary active:opacity-80' : 'bg-muted'
            )}
          >
            <Text
              className={cn(
                'text-sm font-semibold',
                isValidDraft
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground'
              )}
            >
              Aplicar
            </Text>
          </Pressable>
        </View>
      </PickerSheet>
    </View>
  );
}
