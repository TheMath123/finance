import { router } from 'expo-router';
import { ArrowLeftIcon } from 'phosphor-react-native';
import { Pressable, View } from 'react-native';

import { ChangeEmailForm } from '@/components/forms/change-email-form';
import { ChangePasswordForm } from '@/components/forms/change-password-form';
import { EditNameForm } from '@/components/forms/edit-name-form';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';

export default function EditProfileScreen() {
  return (
    <Screen className="gap-6 pb-28">
      <View className="flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} hitSlop={8} className="active:opacity-60">
          <ArrowLeftIcon size={22} />
        </Pressable>
        <ThemedText type="subtitle">Editar perfil</ThemedText>
      </View>

      <Card className="gap-4">
        <ThemedText type="smallBold">Nome</ThemedText>
        <EditNameForm />
      </Card>

      <Card className="gap-4">
        <ThemedText type="smallBold">E-mail</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Trocar o e-mail exige confirmar um código enviado para o endereço novo.
        </ThemedText>
        <ChangeEmailForm />
      </Card>

      <Card className="gap-4">
        <ThemedText type="smallBold">Senha</ThemedText>
        <ChangePasswordForm />
      </Card>
    </Screen>
  );
}
