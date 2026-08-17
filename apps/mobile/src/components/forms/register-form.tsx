import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { EnvelopeSimpleIcon, UserIcon } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { CheckboxField } from '@/components/form/checkbox-field';
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
import { type RegisterInput, registerSchema } from '@/lib/schemas/auth';
import { lastEmailStore } from '@/lib/secure-store';

export function RegisterForm() {
  const { signIn } = useSession();
  const theme = useTheme();
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
        placeholder="Nome"
        className={AUTH_FIELD_CLASSNAME}
        trailingIcon={<UserIcon size={18} color={theme.textSecondary} />}
        autoComplete="name"
      />
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
      />
      <PasswordField
        control={control}
        name="password"
        placeholder="Crie uma senha"
        className={AUTH_FIELD_CLASSNAME}
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

      <AuthButton
        loading={mutation.isPending}
        onPress={handleSubmit((input) => mutation.mutate(input))}
      >
        Criar conta
      </AuthButton>

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
            label="Continuar com Google"
            className="h-14 rounded-full"
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
        <ThemedText type="small" themeColor="textSecondary">
          Já tem uma conta? <ThemedText type="linkPrimary">Entrar</ThemedText>
        </ThemedText>
      </Link>
    </View>
  );
}
