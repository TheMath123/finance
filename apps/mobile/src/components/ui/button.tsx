import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  children: string;
  loading?: boolean;
  variant?: 'primary' | 'ghost';
}

export function Button({ children, loading, variant = 'primary', disabled, ...props }: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      disabled={isDisabled}
      className={
        variant === 'primary'
          ? `items-center justify-center rounded-xl bg-brand-600 py-3.5 active:bg-brand-700 ${isDisabled ? 'opacity-50' : ''}`
          : `items-center justify-center rounded-xl py-3.5 active:opacity-60 ${isDisabled ? 'opacity-50' : ''}`
      }
      {...props}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : undefined} />
      ) : (
        <ThemedText
          type="smallBold"
          themeColor={variant === 'primary' ? undefined : 'text'}
          style={variant === 'primary' ? { color: '#FFFFFF' } : undefined}>
          {children}
        </ThemedText>
      )}
    </Pressable>
  );
}
