import { useEffect } from 'react';
import type { Control, FieldValues, Path } from 'react-hook-form';
import { useWatch } from 'react-hook-form';

import { lastEmailStore } from '@/lib/secure-store';

const DEBOUNCE_MS = 500;

/** Salva o e-mail digitado (debounced) pra pré-preencher login/cadastro/esqueci senha da próxima vez. */
export function usePersistEmailField<T extends FieldValues>(
  control: Control<T>,
  name: Path<T>
) {
  const email = useWatch({ control, name }) as unknown as string;

  useEffect(() => {
    if (!email) return;
    const timer = setTimeout(() => {
      lastEmailStore.setEmail(email);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [email]);
}
