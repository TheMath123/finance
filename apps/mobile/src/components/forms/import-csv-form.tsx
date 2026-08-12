import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AccountCsvImportForm } from '@/components/forms/account-csv-import-form';
import { CsvImportForm } from '@/components/forms/csv-import-form';
import { ThemedText } from '@/components/themed-text';
import { Select } from '@/components/ui/select';
import type { Account } from '@/lib/accounts-api';
import type { Card as CardAccount } from '@/lib/cards-api';
import type { Category } from '@/lib/categories-api';

const METHOD_OPTIONS = [
  { label: 'Pix', value: 'pix' },
  { label: 'Débito', value: 'debit' },
  { label: 'Dinheiro', value: 'cash' },
];

/**
 * Wrapper do import de CSV a partir da tela de Transações: primeiro escolhe
 * entre fatura de cartão (fluxo já existente) ou transações de conta (novo),
 * depois delega pro `CsvImportForm`/`AccountCsvImportForm` já prontos.
 */
export function ImportCsvForm({
  cards,
  accounts,
  categories,
  cardCsvImportEnabled,
  accountCsvImportEnabled,
  onDone,
}: {
  cards: CardAccount[];
  accounts: Account[];
  categories: Category[];
  cardCsvImportEnabled: boolean;
  accountCsvImportEnabled: boolean;
  onDone: () => void;
}) {
  const showChoice = cardCsvImportEnabled && accountCsvImportEnabled;
  const activeCards = cards.filter((c) => !c.archivedAt);
  const activeAccounts = accounts.filter((a) => !a.archivedAt);

  const [kind, setKind] = useState<'card' | 'account' | null>(
    showChoice ? null : cardCsvImportEnabled ? 'card' : 'account'
  );
  const [selectedCardId, setSelectedCardId] = useState(
    activeCards[0]?.id ?? ''
  );
  const [selectedAccountId, setSelectedAccountId] = useState(
    activeAccounts[0]?.id ?? ''
  );
  const [selectedMethod, setSelectedMethod] = useState<
    'pix' | 'debit' | 'cash'
  >('pix');

  if (kind === null) {
    return (
      <View className="gap-3">
        <Pressable
          className="gap-1 rounded-md border border-input p-4 active:opacity-70"
          onPress={() => setKind('card')}
        >
          <ThemedText type="smallBold">Fatura de cartão</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Cartão específico, mês da fatura e detecção de parcela.
          </ThemedText>
        </Pressable>
        <Pressable
          className="gap-1 rounded-md border border-input p-4 active:opacity-70"
          onPress={() => setKind('account')}
        >
          <ThemedText type="smallBold">Transações de conta</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Direto pra uma conta bancária (extrato), sem fatura.
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  if (kind === 'card') {
    if (!selectedCardId) {
      return (
        <ThemedText type="small" themeColor="textSecondary">
          Nenhum cartão ativo neste workspace.
        </ThemedText>
      );
    }
    return (
      <View className="gap-4">
        {showChoice && (
          <Pressable onPress={() => setKind(null)}>
            <ThemedText type="small" themeColor="textSecondary">
              ← Voltar
            </ThemedText>
          </Pressable>
        )}
        <View className="gap-1">
          <ThemedText type="smallBold">Cartão</ThemedText>
          <Select
            options={activeCards.map((c) => ({ label: c.name, value: c.id }))}
            value={selectedCardId}
            onValueChange={setSelectedCardId}
            placeholder="Cartão"
          />
        </View>
        <CsvImportForm
          cardId={selectedCardId}
          categories={categories}
          onDone={onDone}
        />
      </View>
    );
  }

  if (!selectedAccountId) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        Nenhuma conta ativa neste workspace.
      </ThemedText>
    );
  }
  return (
    <View className="gap-4">
      {showChoice && (
        <Pressable onPress={() => setKind(null)}>
          <ThemedText type="small" themeColor="textSecondary">
            ← Voltar
          </ThemedText>
        </Pressable>
      )}
      <View className="gap-1">
        <ThemedText type="smallBold">Conta</ThemedText>
        <Select
          options={activeAccounts.map((a) => ({ label: a.name, value: a.id }))}
          value={selectedAccountId}
          onValueChange={setSelectedAccountId}
          placeholder="Conta"
        />
      </View>
      <View className="gap-1">
        <ThemedText type="smallBold">Método</ThemedText>
        <Select
          options={METHOD_OPTIONS}
          value={selectedMethod}
          onValueChange={(value) =>
            setSelectedMethod(value as 'pix' | 'debit' | 'cash')
          }
          placeholder="Método"
        />
        <ThemedText type="small" themeColor="textSecondary">
          Vale pro lote inteiro — o extrato não distingue método por linha.
        </ThemedText>
      </View>
      <AccountCsvImportForm
        accountId={selectedAccountId}
        method={selectedMethod}
        categories={categories}
        onDone={onDone}
      />
    </View>
  );
}
