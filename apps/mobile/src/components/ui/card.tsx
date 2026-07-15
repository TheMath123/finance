import { ThemedView, type ThemedViewProps } from '@/components/themed-view';
import { cn } from '@/lib/cn';

export function Card({ className, ...props }: ThemedViewProps) {
  return <ThemedView type="backgroundElement" className={cn('rounded-2xl p-4', className)} {...props} />;
}
