import { ThemedView, type ThemedViewProps } from '@/components/themed-view';

export function Card({ className = '', ...props }: ThemedViewProps) {
  return <ThemedView type="backgroundElement" className={`rounded-2xl p-4 ${className}`} {...props} />;
}
