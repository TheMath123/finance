/**
 * Assets de marca hospedados no CDN público (cdn.marcelus.app) — únicas URLs
 * que servem em contexto que não executa JS do nosso domínio e por isso
 * precisa de imagem pública/absoluta de verdade (cliente de e-mail, OG/link
 * preview, favicon, etc.). NUNCA usar o bucket de storage privado
 * (packages/storage) pra isso — exige autenticação pra servir objeto, o que
 * quebra silenciosamente em qualquer client que não seja o nosso próprio app
 * (foi exatamente o que quebrou o logo do e-mail antes desse arquivo
 * existir). Mantido aqui como fonte única — evita cada app hardcodar sua
 * própria cópia da URL e elas divergirem com o tempo.
 */
export const BRAND_ASSETS = {
  /** Mascote (avatar), cor teal viva da marca, fundo transparente. */
  avatar: 'https://cdn.marcelus.app/avatar-marcelus.png',
  /** Logo cor sólida escura (#114A45-ish) — legível sobre fundo claro/branco. */
  logoLight: 'https://cdn.marcelus.app/marcelus-logo-light.png',
  /** Logo na cor original (teal vivo) da marca. */
  logo: 'https://cdn.marcelus.app/marcelus-logo.png',
  /** Logo preto sólido — legível sobre fundo claro. */
  logoBlack: 'https://cdn.marcelus.app/marcelus-logo-black.png',
  /** Logo branco sólido — só legível sobre fundo escuro. */
  logoWhite: 'https://cdn.marcelus.app/marcelus-logo-white.png',
} as const;
