import { cn } from '@/lib/utils';
import type { NotificationDotProps } from '@/types';

export function NotificationDot({ visible, count, className }: NotificationDotProps) {
  if (!visible) return null;

  return (
    <span
      data-testid="notification-dot"
      className={cn(
        "flex items-center justify-center",
        "rounded-full bg-amber-500",
        count && count > 0 ? "min-w-4 h-4 text-xs text-white font-medium" : "w-2 h-2",
        "animate-pulse",
        className
      )}
    >
      {count && count > 0 ? count : null}
    </span>
  );
}
