import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ParsedBankNotification } from '@/lib/bank-notification-parser';

const STORAGE_KEY = 'notification-listener.pending-suggestions';
/** Só interessa o mais recente — evita a lista crescer sem limite entre confirmações do usuário. */
const MAX_ENTRIES = 30;

export interface PendingSuggestion extends ParsedBankNotification {
  /** `packageName-postTime`, estável o bastante pra dedupe (o listener nativo às vezes reentrega a mesma notificação). */
  id: string;
}

function toId(item: ParsedBankNotification): string {
  return `${item.packageName}-${item.postTime}`;
}

async function readAll(): Promise<PendingSuggestion[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PendingSuggestion[];
  } catch {
    return [];
  }
}

async function writeAll(items: PendingSuggestion[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export const pendingTransactionStore = {
  list: readAll,

  /** Ignora silenciosamente se já existir uma sugestão com o mesmo id (mesma notificação reentregue). */
  add: async (item: ParsedBankNotification): Promise<void> => {
    const items = await readAll();
    const id = toId(item);
    if (items.some((existing) => existing.id === id)) return;
    const next = [{ ...item, id }, ...items].slice(0, MAX_ENTRIES);
    await writeAll(next);
  },

  remove: async (id: string): Promise<void> => {
    const items = await readAll();
    await writeAll(items.filter((item) => item.id !== id));
  },

  clear: (): Promise<void> => AsyncStorage.removeItem(STORAGE_KEY),
};
