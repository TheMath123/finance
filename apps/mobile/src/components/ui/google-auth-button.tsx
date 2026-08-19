import { GoogleLogoIcon } from 'phosphor-react-native';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api-client';
import { signInWithGoogle } from '@/lib/hooks/use-google-auth';

/**
 * Botão "Continuar com Google" — abre o seletor nativo (ver
 * lib/hooks/use-google-auth.ts), e quando um `idToken` vem (usuário não
 * cancelou), repassa pro chamador decidir o que fazer com ele (login,
 * cadastro ou vínculo — mesmo idToken, endpoints diferentes). Erros do
 * seletor nativo E da chamada `onIdToken` caem no mesmo `onError`, pro
 * chamador ter um único lugar de exibir mensagem.
 */
export function GoogleAuthButton({
  label = 'Continuar com Google',
  size = 'md',
  className,
  onIdToken,
  onError,
}: {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onIdToken: (idToken: string) => Promise<void>;
  onError?: (message: string) => void;
}) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    setLoading(true);
    try {
      const idToken = await signInWithGoogle();
      if (idToken) await onIdToken(idToken);
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof Error
          ? error.message
          : 'Erro inesperado';
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size={size}
      className={className}
      loading={loading}
      icon={<GoogleLogoIcon size={18} weight="bold" color={theme.text} />}
      onPress={handlePress}
    >
      {label}
    </Button>
  );
}
