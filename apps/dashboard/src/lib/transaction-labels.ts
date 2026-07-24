import type { AccountView } from './server/account-api';
import type { CardView } from './server/card-api';
import type { TransactionView } from './server/transaction-api';

const METHOD_LABELS: Record<string, string> = {
	pix: 'Pix',
	debit: 'Débito',
	cash: 'Dinheiro',
	credit: 'Crédito',
	transfer: 'Transferência'
};

/**
 * Prioriza o nome do cartão/conta quando dá pra identificar, senão cai no
 * método genérico — mesma regra do app mobile (transactionSourceLabel).
 */
export function transactionSourceLabel(
	transaction: TransactionView,
	cardById: Map<string, CardView>,
	accountById: Map<string, AccountView>
): string {
	if (transaction.cardId) {
		const card = cardById.get(transaction.cardId);
		if (card) return card.name;
	}
	if (transaction.accountId) {
		const account = accountById.get(transaction.accountId);
		if (account) return account.name;
	}
	return METHOD_LABELS[transaction.method] ?? transaction.method;
}

export function formatTransactionDate(date: string): string {
	return date.split('-').reverse().join('/');
}
