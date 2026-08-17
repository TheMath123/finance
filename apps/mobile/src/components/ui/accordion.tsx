import { CaretDownIcon } from 'phosphor-react-native';
import type React from 'react';
import { useState } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/cn';

/** Seção retrátil genérica (cabeçalho + chevron animado); usada onde uma lista pode ficar longa e não precisa estar sempre visível — ex.: fórmulas fixadas em Transações. */
export function Accordion({
  title,
  defaultOpen = false,
  className,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const theme = useTheme();
  const rotation = useSharedValue(defaultOpen ? 180 : 0);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const toggle = () => {
    const next = !open;
    setOpen(next);
    rotation.value = withTiming(next ? 180 : 0, { duration: 200 });
  };

  return (
    <Animated.View
      layout={LinearTransition}
      className={cn('w-full gap-2', className)}
    >
      <Pressable
        onPress={toggle}
        className="w-full flex-row items-center justify-between active:opacity-70"
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <ThemedText type="small" themeColor="textSecondary">
          {title}
        </ThemedText>
        <Animated.View style={chevronStyle}>
          <CaretDownIcon size={14} color={theme.textSecondary} />
        </Animated.View>
      </Pressable>
      {open && (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(150)}
        >
          {children}
        </Animated.View>
      )}
    </Animated.View>
  );
}
