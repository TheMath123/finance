import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { EnvelopeSimpleIcon } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { PasswordField } from '@/components/form/password-field';
import { TextField } from '@/components/form/text-field';
import { ThemedText } from '@/components/themed-text';
import { AuthButton } from '@/components/ui/auth-button';
import { GoogleAuthButton } from '@/components/ui/google-auth-button';
import { useSession } from '@/context/session';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api-client';
import { authApi } from '@/lib/auth-api';
import { AUTH_FIELD_CLASSNAME } from '@/lib/auth-field-style';
import { googleAuthAvailable } from '@/lib/hooks/use-google-auth';
import { usePersistEmailField } from '@/lib/hooks/use-persist-email-field';
import { type LoginInput, loginSchema } from '@/lib/schemas/auth';
import { lastEmailStore } from '@/lib/secure-store';

export function LoginForm() {
  const { signIn } = useSession();
  const theme = useTheme();
  const [googleError, setGoogleError] = useState<string | null>(null);
  const { control, handleSubmit, setValue } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  });

  // Pré-preenche com o último e-mail usado em login/cadastro/esqueci senha.
  useEffect(() => {
    lastEmailStore.getEmail().then((email) => {
      if (email) setValue('email', email);
    });
  }, [setValue]);

  usePersistEmailField(control, 'email');

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: signIn,
  });

  const onSubmit = handleSubmit((input) => mutation.mutate(input));

  return (
    <View className="gap-4">
      <TextField
        control={control}
        name="email"
        placeholder="E-mail"
        className={AUTH_FIELD_CLASSNAME}
        trailingIcon={
          <EnvelopeSimpleIcon size={18} color={theme.textSecondary} />
        }
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        returnKeyType="next"
      />
      <PasswordField
        control={control}
        name="password"
        placeholder="Senha"
        className={AUTH_FIELD_CLASSNAME}
        autoComplete="password"
        returnKeyType="done"
        onSubmitEditing={onSubmit}
      />

      {mutation.isError && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {mutation.error instanceof ApiError
            ? mutation.error.message
            : 'Erro inesperado'}
        </ThemedText>
      )}

      <AuthButton loading={mutation.isPending} onPress={onSubmit}>
        Entrar
      </AuthButton>

      <Link href="/forgot-password" className="text-center">
        <ThemedText type="linkPrimary">Esqueci minha senha</ThemedText>
      </Link>

      {googleAuthAvailable && (
        <>
          <View className="flex-row items-center gap-3 py-1">
            <View className="h-px flex-1 bg-border" />
            <ThemedText type="small" themeColor="textSecondary">
              ou
            </ThemedText>
            <View className="h-px flex-1 bg-border" />
          </View>
          <GoogleAuthButton
            className="h-14 rounded-full"
            onIdToken={async (idToken) => {
              setGoogleError(null);
              const session = await authApi.googleSignIn(idToken);
              await signIn(session);
            }}
            onError={setGoogleError}
          />
          {googleError && (
            <ThemedText type="small" style={{ color: '#DC2626' }}>
              {googleError}
            </ThemedText>
          )}
        </>
      )}

      <Link href="/register" className="pt-2 text-center">
        <ThemedText type="small" themeColor="textSecondary">
          Ainda não tem conta?{' '}
          <ThemedText type="linkPrimary">Criar conta</ThemedText>
        </ThemedText>
      </Link>
    </View>
  );
}
