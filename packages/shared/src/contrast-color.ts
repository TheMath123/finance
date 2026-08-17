import { wcagContrast } from 'culori';

/**
 * Escolhe preto ou branco pra texto/ícone em cima de uma cor de fundo
 * qualquer (ex.: a bolinha colorida de uma categoria), pelo contraste WCAG
 * real — não uma heurística de luminância aproximada. Usado em toda UI que
 * desenha ícone/texto sobre uma cor dinâmica escolhida pelo usuário
 * (dashboard e mobile), pra nunca cair num ícone branco ilegível numa cor
 * clara (ou preto ilegível numa cor escura). `culori` calcula os dois
 * contrastes de verdade (`wcagContrast`) em vez de estimar por HSL — cores
 * "no meio" (like o teal da marca) não seguem uma regra simples de "clara
 * vs escura" por matiz/saturação isolada.
 */
export function pickContrastColor(background: string): '#000000' | '#FFFFFF' {
  const contrastWithWhite = wcagContrast(background, '#FFFFFF');
  const contrastWithBlack = wcagContrast(background, '#000000');
  return contrastWithWhite >= contrastWithBlack ? '#FFFFFF' : '#000000';
}
