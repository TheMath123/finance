import { cva, type VariantProps } from 'class-variance-authority';
import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { cn } from '@/lib/cn';

const button = cva('items-center justify-center rounded-xl py-3.5', {
  variants: {
    variant: {
      primary: 'bg-brand-600 active:bg-brand-700',
      ghost: 'active:opacity-60',
    },
    disabled: {
      true: 'opacity-50',
    },
  },
  defaultVariants: {
    variant: 'primary',
  },
});

export interface ButtonProps
  extends Omit<PressableProps, 'children' | 'disabled'>,
    VariantProps<typeof button> {
  children: string;
  loading?: boolean;
  disabled?: boolean;
}

export function Button({ children, loading, variant = 'primary', disabled, className, ...props }: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      disabled={isDisabled}
      className={cn(button({ variant, disabled: isDisabled }), className)}
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
