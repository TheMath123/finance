import type React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { cn } from '../../lib/cn';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
    >
      <View className="flex-1 items-center justify-center bg-black/50">
        <Pressable
          className="absolute inset-0"
          onPress={() => onOpenChange(false)}
        />
        {children}
      </View>
    </Modal>
  );
}

export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof View> & {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <View
      className={cn('mx-6 w-80 rounded-lg bg-card p-6 shadow-xl', className)}
      style={{ maxHeight: '85%' }}
      accessibilityRole="alert"
      accessible={true}
      {...props}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function DialogHeader({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof View> & { className?: string }) {
  return <View className={cn('pb-4', className)} {...props} />;
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Text> & { className?: string }) {
  return (
    <Text
      className={cn('text-lg font-semibold text-card-foreground', className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Text> & { className?: string }) {
  return (
    <Text
      className={cn('text-sm text-muted-foreground mt-1', className)}
      {...props}
    />
  );
}

export function DialogFooter({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof View> & { className?: string }) {
  return (
    <View
      className={cn('flex-row justify-end gap-3 pt-4', className)}
      {...props}
    />
  );
}

export function DialogTrigger({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function DialogClose({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
