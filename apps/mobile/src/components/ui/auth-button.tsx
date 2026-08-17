import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, Text } from 'react-native';

import { cn } from '@/lib/cn';

/** Mesmo teal da marca (`primary` do global.css), com um tom mais claro e um mais escuro pra dar profundidade ao gradiente — nunca uma cor fora da paleta. */
const GRADIENT_COLORS = ['#3FE0CE', '#2ec4b6', '#1B7F76'] as const;

export interface AuthButtonProps {
  children: string;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  className?: string;
}

/**
 * CTA principal das telas de autenticação — pill grande com gradiente (a
 * única cor "chapada" da tela vira gradiente aqui, de propósito: um único
 * momento de destaque, não espalhado pelos outros elementos). Mesma API do
 * `Button` (`loading`, `onPress`, `children` string) pra trocar direto nos
 * forms sem mexer na lógica de submit.
 */
export function AuthButton({
  children,
  loading,
  disabled,
  onPress,
  className,
}: AuthButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      className={cn(
        'overflow-hidden rounded-full active:opacity-85',
        isDisabled && 'opacity-50',
        className
      )}
    >
      <LinearGradient
        colors={GRADIENT_COLORS}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          height: 56,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-base font-semibold text-white">{children}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}
