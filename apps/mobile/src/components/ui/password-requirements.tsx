import { PASSWORD_STRONG_REQUIREMENTS } from '@finance/shared';
import { CheckCircleIcon, CircleIcon } from 'phosphor-react-native';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BrandColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Checklist visual dos requisitos da senha `strong` (política única em
 * @finance/shared, mesma usada no schema Zod e na API) — reage a cada tecla
 * digitada. Mesmo componente/conceito do PasswordRequirements do dashboard.
 * Só feedback incremental de UI: quem valida de verdade no submit continua
 * sendo o schema Zod.
 */
export function PasswordRequirements({ password = '' }: { password?: string }) {
  const theme = useTheme();

  return (
    <View className="mt-1.5 gap-1">
      {PASSWORD_STRONG_REQUIREMENTS.map((requirement) => {
        const met = requirement.test(password);
        return (
          <View key={requirement.key} className="flex-row items-center gap-1.5">
            {met ? (
              <CheckCircleIcon
                size={14}
                weight="fill"
                color={BrandColors.success}
              />
            ) : (
              <CircleIcon size={14} color={theme.textSecondary} />
            )}
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={met ? { color: BrandColors.success } : undefined}
            >
              {requirement.label}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}
