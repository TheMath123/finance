import { LockKeyIcon } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { BrandColors } from '@/constants/theme';
import { useBiometricLock } from '@/context/biometric-lock';

/** Tela cheia exibida por cima do app quando travado (M2-12) — não substitui login, só uma trava a mais sobre a sessão. */
export function BiometricLockScreen() {
  const { unlock } = useBiometricLock();
  // Começa true porque a tentativa automática dispara já no mount (effect abaixo).
  const [authenticating, setAuthenticating] = useState(true);
  const [failed, setFailed] = useState(false);

  const attempt = async () => {
    setAuthenticating(true);
    setFailed(false);
    try {
      const success = await unlock();
      if (!success) setFailed(true);
    } finally {
      setAuthenticating(false);
    }
  };

  // Tenta autenticar assim que a tela aparece — evita exigir um toque extra
  // antes do primeiro prompt. Os setState acontecem só depois do await (nunca
  // sincronamente dentro do effect); o ref garante uma única tentativa
  // automática mesmo se `unlock` trocar de identidade.
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        const success = await unlock();
        if (!success) setFailed(true);
      } finally {
        setAuthenticating(false);
      }
    })();
  }, [unlock]);

  return (
    <Screen center className="items-center gap-6">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <LockKeyIcon size={28} color={BrandColors.primary} />
      </View>
      <View className="items-center gap-1">
        <ThemedText type="subtitle">App travado</ThemedText>
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={{ textAlign: 'center' }}
        >
          {failed
            ? 'Não foi possível confirmar sua identidade. Tente de novo.'
            : 'Confirme sua identidade pra continuar.'}
        </ThemedText>
      </View>
      <Button loading={authenticating} onPress={attempt}>
        Desbloquear
      </Button>
    </Screen>
  );
}
