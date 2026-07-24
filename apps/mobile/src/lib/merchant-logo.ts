/**
 * Match automático por palavra-chave (Fase 3 do plano de migração de UI —
 * decisão de 2026-07-23: lista curada, comparada com a descrição da
 * transação, case-insensitive; sem match cai no ícone da categoria). Slugs
 * confirmados manualmente contra `https://thesvg.org/icons/{slug}/default.svg`
 * (2026-07-24) — projeto open-source auditado, MIT, sem API key. Mesma
 * lista do dashboard web (`apps/dashboard/src/lib/merchant-logo.ts`).
 *
 * Ressalva legal (não técnica): a licença MIT cobre o formato SVG/código,
 * não o uso comercial da marca em si — os logos continuam propriedade de
 * cada empresa. Enhancement visual não-crítico, nunca dependência
 * obrigatória (fallback garantido pro ícone da categoria).
 */
const MERCHANT_LOGOS: Record<string, string> = {
  netflix: 'netflix',
  spotify: 'spotify',
  'uber eats': 'uber-eats',
  uber: 'uber',
  ifood: 'ifood',
  amazon: 'amazon',
  aliexpress: 'aliexpress',
  nubank: 'nubank',
  shopee: 'shopee',
  steam: 'steam',
  playstation: 'playstation',
  xbox: 'xbox',
  disney: 'disney-plus',
  hbo: 'hbo-max',
  'google play': 'google-play',
  microsoft: 'microsoft',
  whatsapp: 'whatsapp',
  telegram: 'telegram',
  youtube: 'youtube',
  picpay: 'picpay',
  itau: 'itau',
  itaú: 'itau',
  bradesco: 'bradesco',
  santander: 'santander',
  zoom: 'zoom',
};

/** Slugs mais específicos (com espaço) primeiro, senão "uber eats" também bateria em "uber". */
const KEYWORDS = Object.keys(MERCHANT_LOGOS).sort(
  (a, b) => b.length - a.length
);

export function getMerchantLogoUrl(description: string): string | null {
  const normalized = description.toLowerCase();
  const keyword = KEYWORDS.find((k) => normalized.includes(k));
  if (!keyword) return null;
  return `https://thesvg.org/icons/${MERCHANT_LOGOS[keyword]}/default.svg`;
}
