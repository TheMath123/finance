import { z } from 'zod';

/**
 * Política de senha compartilhada entre backend, dashboard e mobile — uma
 * única fonte de verdade pras regras de complexidade, nunca duplicadas por
 * client (schema Zod usado tanto na borda da API quanto no form do client,
 * mesma convenção do resto do monorepo).
 *
 * `weak`: só presença/tamanho mínimo — login e reconfirmação de senha já
 * existente (trocar e-mail, excluir conta, senha atual antes de trocar) não
 * fazem sentido barrar por complexidade, a senha já existe e já passou por
 * uma política no momento em que foi criada.
 * `regular`: usado em toda TROCA/CRIAÇÃO de senha nova (cadastro, redefinir
 * senha esquecida, trocar senha) — letra + número, sem exigir maiúscula
 * nem caractere especial (fricção baixa o bastante pra não gerar abandono).
 * `strong`: disponível pra uso futuro (ex.: se algum fluxo precisar de mais
 * rigor), não usado em nenhum lugar hoje.
 */
export function passwordWeakValidator() {
  return z
    .string({ error: 'Informe a senha.' })
    .min(8, { error: 'A senha deve ter pelo menos 8 caracteres' });
}

export function passwordRegularValidator() {
  return z
    .string({ error: 'Informe a senha.' })
    .min(8, { error: 'A senha deve ter pelo menos 8 caracteres' })
    .regex(/[a-zA-Z]/, {
      error: 'A senha deve conter pelo menos uma letra',
    })
    .regex(/[0-9]/, { error: 'A senha deve conter pelo menos um número' });
}

export function passwordStrongValidator() {
  return z
    .string({ error: 'Informe a senha.' })
    .min(8, { error: 'A senha deve ter pelo menos 8 caracteres' })
    .regex(/[A-Z]/, {
      error: 'A senha deve conter pelo menos uma letra maiúscula',
    })
    .regex(/[a-z]/, {
      error: 'A senha deve conter pelo menos uma letra minúscula',
    })
    .regex(/[0-9]/, {
      error: 'A senha deve conter pelo menos um número',
    })
    .regex(/[^A-Za-z0-9]/, {
      error: 'A senha deve conter pelo menos um caractere especial',
    });
}

export const passwordValidatorFactory = {
  weak: passwordWeakValidator,
  regular: passwordRegularValidator,
  strong: passwordStrongValidator,
};

export type PasswordValidatorProps = Partial<{
  force: 'weak' | 'regular' | 'strong';
}>;

export function passwordValidator({
  force = 'regular',
}: PasswordValidatorProps = {}) {
  return passwordValidatorFactory[force]();
}

/**
 * Requisitos individuais da senha `regular`, com rótulo — pra checklist
 * visual que reage a cada tecla digitada (ver PasswordRequirements no
 * dashboard). Cada `test` é a mesma regra usada em `passwordRegularValidator`
 * acima, só reexposta individualmente (o Zod já valida no submit; isso aqui
 * é só feedback incremental de UI).
 */
export const PASSWORD_REGULAR_REQUIREMENTS: {
  key: string;
  label: string;
  test: (password: string) => boolean;
}[] = [
  {
    key: 'length',
    label: 'Pelo menos 8 caracteres',
    test: (p) => p.length >= 8,
  },
  {
    key: 'letter',
    label: 'Pelo menos uma letra',
    test: (p) => /[a-zA-Z]/.test(p),
  },
  {
    key: 'number',
    label: 'Pelo menos um número',
    test: (p) => /[0-9]/.test(p),
  },
];

/** Mesma ideia de `PASSWORD_REGULAR_REQUIREMENTS`, mas espelhando as regras de `passwordStrongValidator` (política em uso hoje pra toda senha nova). */
export const PASSWORD_STRONG_REQUIREMENTS: {
  key: string;
  label: string;
  test: (password: string) => boolean;
}[] = [
  {
    key: 'length',
    label: 'Pelo menos 8 caracteres',
    test: (p) => p.length >= 8,
  },
  {
    key: 'uppercase',
    label: 'Uma letra maiúscula',
    test: (p) => /[A-Z]/.test(p),
  },
  {
    key: 'lowercase',
    label: 'Uma letra minúscula',
    test: (p) => /[a-z]/.test(p),
  },
  {
    key: 'number',
    label: 'Um número',
    test: (p) => /[0-9]/.test(p),
  },
  {
    key: 'special',
    label: 'Um caractere especial',
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
];
