const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
/** Limite da API do Expo por request (spec deles) — só relevante em escala, hoje sempre 1 chamada. */
const MAX_MESSAGES_PER_REQUEST = 100;

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound: "default";
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/**
 * Envia push via Expo Push Service — funciona hoje em iOS Expo Go e em
 * qualquer dev build/standalone (Android precisa de dev build desde SDK 53
 * do Expo, não funciona no Expo Go).
 */
export async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  const messages: ExpoPushMessage[] = tokens.map((to) => ({ to, title, body, data, sound: "default" }));

  for (const batch of chunk(messages, MAX_MESSAGES_PER_REQUEST)) {
    await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(batch),
    });
  }
}
