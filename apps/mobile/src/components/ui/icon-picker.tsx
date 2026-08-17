import { CaretDownIcon, MagnifyingGlassIcon } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import {
  CATEGORY_ICON_OPTIONS,
  resolveCategoryIcon,
} from '@/lib/category-icons';
import { cn } from '../../lib/cn';

const NUM_COLUMNS = 5;

export interface IconPickerProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
}

/**
 * Campo de ícone com listagem buscável de todos os ~1500 ícones do Phosphor
 * instalado (mesma fonte de verdade do CATEGORY_ICON_OPTIONS do dashboard) —
 * grade virtualizada (FlatList) porque a lista completa não cabe num
 * ScrollView sem custo de render. Substitui o texto livre ("Ex.:
 * shopping-cart") que exigia o usuário adivinhar o slug do ícone.
 */
export function IconPicker({
  value,
  onValueChange,
  placeholder = 'Selecione um ícone',
  searchPlaceholder = 'Buscar ícone (ex.: carrinho, casa...)',
  className,
}: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const caret = dark ? '#fafafa' : '#18181b';

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return CATEGORY_ICON_OPTIONS;
    return CATEGORY_ICON_OPTIONS.filter((slug) => slug.includes(query));
  }, [search]);

  const SelectedIcon = value ? resolveCategoryIcon(value) : null;

  const close = () => {
    setOpen(false);
    setSearch('');
  };

  const pick = (slug: string) => {
    onValueChange(slug);
    close();
  };

  return (
    <View className={className}>
      <Pressable
        className="h-12 flex-row items-center gap-2 rounded-lg border border-input bg-background px-4 active:bg-accent/30"
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={placeholder}
      >
        {SelectedIcon && (
          <View className="h-6 w-6 items-center justify-center rounded-full bg-primary/15">
            {/* resolveCategoryIcon escolhe entre ícones Phosphor já existentes (não cria nada novo); trocar de ícone conforme o valor selecionado é intencional, sem estado interno a perder. */}
            {/* eslint-disable-next-line react-hooks/static-components */}
            <SelectedIcon size={14} color={theme.text} />
          </View>
        )}
        <Text
          className={cn(
            'flex-1 text-base',
            value ? 'text-foreground' : 'text-muted-foreground'
          )}
          numberOfLines={1}
        >
          {value ?? placeholder}
        </Text>
        <CaretDownIcon size={14} color={theme.textSecondary} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={close}
      >
        <Pressable
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          className="bg-black/50"
          onPress={close}
        />
        <View
          className="mt-auto rounded-t-2xl border-t border-border bg-card"
          style={{ height: '78%' }}
        >
          <View className="gap-3 px-4 pb-3 pt-4">
            <Text className="text-base font-semibold text-foreground">
              Escolher ícone
            </Text>
            <View className="h-11 flex-row items-center gap-2 rounded-lg border border-input bg-background px-3">
              <MagnifyingGlassIcon size={16} color={theme.textSecondary} />
              <TextInput
                autoFocus
                value={search}
                onChangeText={setSearch}
                placeholder={searchPlaceholder}
                placeholderTextColor={dark ? '#a1a1aa' : '#71717a'}
                keyboardAppearance={dark ? 'dark' : 'light'}
                selectionColor={caret}
                cursorColor={caret}
                autoCapitalize="none"
                autoCorrect={false}
                className="flex-1 p-0 text-base text-foreground"
              />
            </View>
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(slug) => slug}
            numColumns={NUM_COLUMNS}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 12, gap: 8 }}
            columnWrapperStyle={{ gap: 8 }}
            renderItem={({ item: slug }) => {
              const Icon = resolveCategoryIcon(slug);
              const selected = slug === value;
              return (
                <Pressable
                  onPress={() => pick(slug)}
                  className={cn(
                    'h-12 flex-1 items-center justify-center rounded-lg',
                    selected ? 'bg-primary' : 'bg-muted/40 active:bg-accent/60'
                  )}
                >
                  <Icon
                    size={20}
                    color={selected ? '#FFFFFF' : theme.textSecondary}
                  />
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <Text className="py-8 text-center text-muted-foreground">
                Nenhum ícone encontrado.
              </Text>
            }
          />
        </View>
      </Modal>
    </View>
  );
}
