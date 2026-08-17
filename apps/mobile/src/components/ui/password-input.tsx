import { cva, type VariantProps } from 'class-variance-authority';
import { EyeIcon, EyeSlashIcon } from 'phosphor-react-native';
import React, { useState } from 'react';
import { Pressable, TextInput, useColorScheme, View } from 'react-native';
import { cn } from '../../lib/cn';

const passwordVariants = cva(
  'flex-row items-center rounded-md border py-2 text-foreground',
  {
    variants: {
      variant: {
        default: 'border-input bg-background',
        ghost: 'border-transparent bg-transparent',
      },
      size: {
        sm: 'min-h-9 px-3',
        md: 'min-h-12 px-4',
        lg: 'min-h-14 px-5',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  }
);

export interface PasswordInputProps
  extends Omit<
      React.ComponentPropsWithoutRef<typeof TextInput>,
      'secureTextEntry'
    >,
    VariantProps<typeof passwordVariants> {
  className?: string;
}

/** Input de senha com olhinho pra alternar visibilidade — mesma casca do PasswordInput do dashboard, sem lógica de força embutida (ver PasswordRequirements). */
export const PasswordInput = React.forwardRef<
  React.ElementRef<typeof TextInput>,
  PasswordInputProps
>(function PasswordInput({ variant, size, className, ...props }, ref) {
  const [visible, setVisible] = useState(false);
  const dark = useColorScheme() === 'dark';
  const caret = dark ? '#fafafa' : '#18181b';

  return (
    <View className={cn(passwordVariants({ variant, size }), className)}>
      <TextInput
        ref={ref}
        className="flex-1 text-foreground p-0 text-base"
        placeholderTextColor={dark ? '#a1a1aa' : '#71717a'}
        keyboardAppearance={dark ? 'dark' : 'light'}
        selectionColor={caret}
        cursorColor={caret}
        secureTextEntry={!visible}
        accessibilityLabel="Password"
        {...props}
      />
      <Pressable
        onPress={() => setVisible(!visible)}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Ocultar senha' : 'Mostrar senha'}
        accessibilityState={{ selected: visible }}
        className="ms-2 min-h-8 min-w-8 items-center justify-center"
      >
        {visible ? (
          <EyeSlashIcon size={20} color="#71717a" />
        ) : (
          <EyeIcon size={20} color="#71717a" />
        )}
      </Pressable>
    </View>
  );
});
