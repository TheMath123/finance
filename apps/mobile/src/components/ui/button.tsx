import { cva, type VariantProps } from 'class-variance-authority';
import type React from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { useTheme } from '../../hooks/use-theme';
import { cn } from '../../lib/cn';

const buttonVariants = cva(
  'flex-row items-center justify-center rounded-md min-h-12 min-w-12',
  {
    variants: {
      variant: {
        default: 'bg-primary',
        secondary: 'bg-secondary',
        outline: 'border border-input bg-transparent',
        ghost: 'bg-transparent',
        destructive: 'bg-destructive',
        success: 'bg-success',
        link: 'bg-transparent',
      },
      size: {
        sm: 'px-3 py-1.5 gap-1.5',
        md: 'px-4 py-2.5 gap-2',
        lg: 'px-6 py-3.5 gap-2.5',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  }
);

const buttonTextVariants = cva('text-center font-medium', {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      secondary: 'text-secondary-foreground',
      outline: 'text-foreground',
      ghost: 'text-foreground',
      destructive: 'text-destructive-foreground',
      success: 'text-success-foreground',
      link: 'text-primary underline',
    },
    size: { sm: 'text-sm', md: 'text-base', lg: 'text-lg', icon: 'text-sm' },
  },
  defaultVariants: { variant: 'default', size: 'md' },
});

export interface ButtonProps
  extends React.ComponentPropsWithoutRef<typeof Pressable>,
    VariantProps<typeof buttonVariants> {
  className?: string;
  textClassName?: string;
  children?: string;
  icon?: React.ReactNode;
  iconAfter?: React.ReactNode;
  loading?: boolean;
}

export function Button({
  variant,
  size,
  className,
  textClassName,
  children,
  icon,
  iconAfter,
  loading,
  disabled,
  ...props
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;
  const light =
    variant === 'default' || variant === 'destructive' || variant === 'success';

  return (
    <Pressable
      className={cn(
        buttonVariants({ variant, size }),
        isDisabled && 'opacity-50',
        'active:opacity-80',
        className
      )}
      accessibilityRole="button"
      accessible={true}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        // Fundos "light" (default/destructive/success) são o mesmo tom saturado
        // nos dois temas — branco fixo continua certo. Os demais (outline/ghost/
        // secondary/link) têm fundo neutro que muda com o tema — sem isso o
        // spinner ficava preto fixo (#18181b), quase invisível num fundo escuro.
        <ActivityIndicator
          size="small"
          color={light ? '#fafafa' : theme.text}
        />
      ) : (
        (icon ?? null)
      )}
      {children ? (
        <Text
          className={cn(buttonTextVariants({ variant, size }), textClassName)}
        >
          {children}
        </Text>
      ) : null}
      {!loading && iconAfter ? iconAfter : null}
    </Pressable>
  );
}
