import { evaluateFormula } from '@finance/formula';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BackspaceIcon } from 'phosphor-react-native';
import { useController, useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';

import { SelectField } from '@/components/form/select-field';
import { SwitchField } from '@/components/form/switch-field';
import { TextField } from '@/components/form/text-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useSession } from '@/context/session';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { formulaApi, type SavedFormula } from '@/lib/formula-api';
import { buildClientFormulaCatalog } from '@/lib/formula-catalog';
import { formatCents } from '@/lib/money';
import {
  type SavedFormulaInput,
  savedFormulaSchema,
} from '@/lib/schemas/finance';
import { summaryApi } from '@/lib/summary-api';

const DISPLAY_FORMAT_OPTIONS = [
  { label: 'Moeda', value: 'currency' },
  { label: 'Número', value: 'number' },
];

type KeypadKey = {
  label: string;
  action: 'clear' | 'backspace' | 'insert';
  key?: string;
  kind: 'action' | 'operator' | 'digit';
  span?: number;
};

/**
 * Grid de 4 colunas, organizado em linhas explícitas (em vez de `flex-wrap` +
 * `calc()` no width) — RN não resolve `calc()` em estilo, então cada linha é
 * um `flex-row` próprio e "0" ganha `flex-[2]` pra ocupar o dobro do espaço
 * dos outros. Espelha KEYPAD_KEYS do dashboard.
 */
const KEYPAD_ROWS: KeypadKey[][] = [
  [
    { label: '(', action: 'insert', key: '(', kind: 'operator' },
    { label: ')', action: 'insert', key: ')', kind: 'operator' },
    { label: 'C', action: 'clear', kind: 'action' },
    { label: 'DEL', action: 'backspace', kind: 'action' },
  ],
  [
    { label: '7', action: 'insert', key: '7', kind: 'digit' },
    { label: '8', action: 'insert', key: '8', kind: 'digit' },
    { label: '9', action: 'insert', key: '9', kind: 'digit' },
    { label: '÷', action: 'insert', key: '/', kind: 'operator' },
  ],
  [
    { label: '4', action: 'insert', key: '4', kind: 'digit' },
    { label: '5', action: 'insert', key: '5', kind: 'digit' },
    { label: '6', action: 'insert', key: '6', kind: 'digit' },
    { label: '×', action: 'insert', key: '*', kind: 'operator' },
  ],
  [
    { label: '1', action: 'insert', key: '1', kind: 'digit' },
    { label: '2', action: 'insert', key: '2', kind: 'digit' },
    { label: '3', action: 'insert', key: '3', kind: 'digit' },
    { label: '−', action: 'insert', key: '-', kind: 'operator' },
  ],
  [
    { label: '0', action: 'insert', key: '0', kind: 'digit', span: 2 },
    { label: ',', action: 'insert', key: '.', kind: 'digit' },
    { label: '+', action: 'insert', key: '+', kind: 'operator' },
  ],
];

const KEY_STYLES: Record<KeypadKey['kind'], string> = {
  action: 'bg-destructive/10',
  operator: 'bg-primary/10',
  digit: 'bg-muted',
};
const KEY_TEXT_STYLES: Record<KeypadKey['kind'], string> = {
  action: 'text-destructive',
  operator: 'text-primary',
  digit: 'text-foreground',
};

/**
 * Formulário de criação e edição de fórmula. Passe `formula` pra editar uma
 * já existente (preenche defaultValues e usa PATCH); sem ele, cria uma nova.
 * Diferente do dashboard (campo de texto com teclado físico), aqui a
 * expressão só é editável pelo teclado numérico on-screen — sem digitação
 * livre, pra manter a "cara de calculadora" no celular.
 */
export function FormulaForm({
  formula,
  onDone,
}: {
  formula?: SavedFormula;
  onDone: () => void;
}) {
  const { workspaceId } = useSession();
  const queryClient = useQueryClient();
  const isEditing = Boolean(formula);
  const now = new Date();

  const { data: summary } = useQuery({
    queryKey: ['summary', workspaceId, now.getFullYear(), now.getMonth() + 1],
    queryFn: () =>
      summaryApi.getMonthly(
        workspaceId!,
        now.getFullYear(),
        now.getMonth() + 1
      ),
    enabled: Boolean(workspaceId),
  });

  const { values, variables } = summary
    ? buildClientFormulaCatalog(summary)
    : { values: {}, variables: [] };

  const { control, handleSubmit, watch, setValue } = useForm<SavedFormulaInput>(
    {
      resolver: zodResolver(savedFormulaSchema),
      mode: 'onTouched',
      defaultValues: {
        name: formula?.name ?? '',
        expression: formula?.expression ?? '',
        displayFormat: formula?.displayFormat ?? 'currency',
        pinnedHome: formula?.pinnedHome ?? false,
        pinnedTransactions: formula?.pinnedTransactions ?? false,
      },
    }
  );
  const { fieldState: expressionFieldState } = useController({
    control,
    name: 'expression',
  });
  const expression = watch('expression');
  const displayFormat = watch('displayFormat');

  const preview = expression.trim()
    ? evaluateFormula(expression, values)
    : null;

  function appendKey(key: string) {
    setValue('expression', expression + key, { shouldValidate: true });
  }
  function backspace() {
    setValue('expression', expression.slice(0, -1), { shouldValidate: true });
  }
  function clearAll() {
    setValue('expression', '', { shouldValidate: true });
  }
  function pressKey(k: KeypadKey) {
    if (k.action === 'clear') clearAll();
    else if (k.action === 'backspace') backspace();
    else if (k.key) appendKey(k.key);
  }
  /** Variáveis são identificadores inteiros — precisam de espaço antes pra não colar num token anterior. */
  function insertVariable(token: string) {
    setValue(
      'expression',
      expression.trim() ? `${expression.trim()} ${token} ` : `${token} `,
      { shouldValidate: true }
    );
  }

  const mutation = useMutation({
    mutationFn: (input: SavedFormulaInput) =>
      isEditing
        ? formulaApi.update(workspaceId!, formula!.id, input)
        : formulaApi.create(workspaceId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['saved-formulas', workspaceId],
      });
      onDone();
    },
  });

  return (
    <View className="gap-4">
      <View className="items-end gap-1 rounded-lg bg-muted/50 p-3">
        <Text className="w-full text-right font-mono text-lg text-foreground">
          {expression || '0'}
        </Text>
        <Text className="w-full text-right font-mono text-xs text-muted-foreground">
          {preview
            ? preview.ok
              ? `= ${displayFormat === 'currency' ? formatCents(Math.round(preview.value * 100)) : preview.value}`
              : 'fórmula inválida'
            : ' '}
        </Text>
      </View>
      {expressionFieldState.error?.message && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {expressionFieldState.error.message}
        </ThemedText>
      )}

      <View className="gap-1.5">
        {KEYPAD_ROWS.map((row, rowIndex) => (
          <View key={rowIndex} className="flex-row gap-1.5">
            {row.map((k) => (
              <Pressable
                key={k.label}
                onPress={() => pressKey(k)}
                className={cn(
                  'items-center justify-center rounded-lg py-3 active:opacity-70',
                  KEY_STYLES[k.kind],
                  k.span === 2 ? 'flex-[2]' : 'flex-1'
                )}
                accessibilityLabel={
                  k.action === 'backspace'
                    ? 'Apagar último caractere'
                    : undefined
                }
              >
                {k.action === 'backspace' ? (
                  <BackspaceIcon size={16} color="#71717a" />
                ) : (
                  <Text className={cn('font-bold', KEY_TEXT_STYLES[k.kind])}>
                    {k.label}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        ))}
      </View>

      <View className="gap-1.5">
        <ThemedText type="small" themeColor="textSecondary">
          Variáveis
        </ThemedText>
        <View className="flex-row flex-wrap gap-1.5">
          {variables.map((variable) => (
            <Pressable
              key={variable.token}
              onPress={() => insertVariable(variable.token)}
              className="rounded-full border border-border px-2.5 py-1.5 active:opacity-70"
            >
              <ThemedText type="small">{variable.label}</ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      <TextField
        control={control}
        name="name"
        label="Nome"
        placeholder="Ex.: Sobra do mês"
      />
      <SelectField
        control={control}
        name="displayFormat"
        label="Formato"
        options={DISPLAY_FORMAT_OPTIONS}
      />

      <View className="gap-1 rounded-lg border border-border p-3">
        <ThemedText type="smallBold">Fixar como widget em</ThemedText>
        <SwitchField control={control} name="pinnedHome" label="Início" />
        <SwitchField
          control={control}
          name="pinnedTransactions"
          label="Transações"
        />
      </View>

      {mutation.isError && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {mutation.error instanceof ApiError
            ? mutation.error.message
            : 'Erro inesperado'}
        </ThemedText>
      )}
      <Button
        loading={mutation.isPending}
        onPress={handleSubmit((input) => mutation.mutate(input))}
      >
        {isEditing ? 'Salvar alterações' : 'Salvar fórmula'}
      </Button>
    </View>
  );
}
