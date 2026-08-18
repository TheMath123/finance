import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Modal, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export interface PickerSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  sheetStyle?: StyleProp<ViewStyle>;
}

/**
 * Bottom sheet usado por ColorInput/IconPicker (e qualquer picker parecido).
 * `Modal` nativo do RN com `animationType="slide"` anima o MODAL INTEIRO —
 * backdrop incluso — deslizando junto de baixo pra cima, produzindo o efeito
 * estranho de "a tela toda sobe" (bug real relatado em produção). Aqui o
 * Modal em si não anima (`animationType="none"`); o fade do backdrop e a
 * folha usam Reanimated, desacoplados um do outro — backdrop só some/aparece,
 * a folha sobe uma distância pequena e tasteful (não a tela inteira).
 */
export function PickerSheet({
  visible,
  onClose,
  children,
  sheetStyle,
}: PickerSheetProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [visible, progress]);

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));
  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 24 }],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
          backdropAnimatedStyle,
        ]}
        className="bg-black/50"
      />
      <Pressable
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        onPress={onClose}
      />
      <Animated.View
        className="mt-auto rounded-t-2xl border-t border-border bg-card"
        style={[sheetStyle, sheetAnimatedStyle]}
      >
        {children}
      </Animated.View>
    </Modal>
  );
}
