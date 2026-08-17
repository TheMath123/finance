import { Image } from 'expo-image';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

/** Mascote oficial do app (mesma arte do ícone Android/splash) — cor original, sem badge nem tint em volta. */
const MASCOT_ICON = require('../../../assets/images/android-icon-foreground.png');

/**
 * Cabeçalho das 5 telas de autenticação (login, cadastro, esqueci senha,
 * confirmar código, nova senha) — a mascote real do app (não um ícone
 * genérico do Phosphor, nem dentro de nenhum badge/quadrado), selo
 * "Marcelus" pequeno acima, título grande e subtítulo.
 */
export function AuthHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View className="items-center gap-4 pb-2">
      <Image
        source={MASCOT_ICON}
        contentFit="contain"
        style={{ width: 84, height: 84 }}
      />
      <View className="items-center gap-1.5">
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={{
            fontWeight: '700',
            letterSpacing: 2,
            textTransform: 'uppercase',
            fontSize: 11,
          }}
        >
          Marcelus
        </ThemedText>
        <ThemedText type="subtitle" style={{ textAlign: 'center' }}>
          {title}
        </ThemedText>
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={{ textAlign: 'center', maxWidth: 280 }}
        >
          {subtitle}
        </ThemedText>
      </View>
    </View>
  );
}
