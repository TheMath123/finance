import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { CheckboxField } from '@/components/form/checkbox-field';
import { PasswordField } from '@/components/form/password-field';
import { TextField } from '@/components/form/text-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { GoogleAuthButton } from '@/components/ui/google-auth-button';
import { useSession } from '@/context/session';
import { ApiError } from '@/lib/api-client';
import { authApi } from '@/lib/auth-api';
import { googleAuthAvailable } from '@/lib/hooks/use-google-auth';
import { usePersistEmailField } from '@/lib/hooks/use-persist-email-field';
import { type RegisterInput, registerSchema } from '@/lib/schemas/auth';
import { lastEmailStore } from '@/lib/secure-store';

export function RegisterForm() {
  const { signIn } = useSession();
  const [googleError, setGoogleError] = useState<string | null>(null);
  const { control, handleSubmit, setValue } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
    defaultValues: { name: '', email: '', password: '', termsAccepted: false },
  });

  // Pré-preenche com o último e-mail usado em login/cadastro/esqueci senha.
  useEffect(() => {
    lastEmailStore.getEmail().then((email) => {
      if (email) setValue('email', email);
    });
  }, [setValue]);

  usePersistEmailField(control, 'email');

  const mutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: signIn,
  });

  return (
    <View className="gap-4">
      <TextField
        control={control}
        name="name"
        label="Nome"
        placeholder="Seu nome"
        autoComplete="name"
      />
      <TextField
        control={control}
        name="email"
        label="E-mail"
        placeholder="voce@exemplo.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <PasswordField
        control={control}
        name="password"
        label="Senha"
        placeholder="Crie uma senha"
        autoComplete="new-password"
        showRequirements
      />
      <CheckboxField
        control={control}
        name="termsAccepted"
        label="Aceito os termos de uso"
      />

      {mutation.isError && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {mutation.error instanceof ApiError
            ? mutation.error.message
            : 'Erro inesperado'}
        </ThemedText>
      )}

      <Button
        loading={mutation.isPending}
        onPress={handleSubmit((input) => mutation.mutate(input))}
      >
        Criar conta
      </Button>

      {googleAuthAvailable && (
        <>
          <View className="flex-row items-center gap-3">
            <View className="h-px flex-1 bg-border" />
            <ThemedText type="small" themeColor="textSecondary">
              ou
            </ThemedText>
            <View className="h-px flex-1 bg-border" />
          </View>
          <GoogleAuthButton
            label="Continuar com Google"
            onIdToken={async (idToken) => {
              setGoogleError(null);
              const session = await authApi.googleSignIn(idToken);
              await signIn(session);
            }}
            onError={setGoogleError}
          />
          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={{ textAlign: 'center' }}
          >
            Ao continuar, você concorda com nossos Termos de Uso.
          </ThemedText>
          {googleError && (
            <ThemedText type="small" style={{ color: '#DC2626' }}>
              {googleError}
            </ThemedText>
          )}
        </>
      )}

      <Link href="/login" className="pt-2 text-center">
        <ThemedText type="linkPrimary">Já tenho conta</ThemedText>
      </Link>
    </View>
  );
}
