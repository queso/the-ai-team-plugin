import { AlertTriangle } from 'lucide-react';

export interface RejectionBadgeProps {
  count: number;
}

export function RejectionBadge({ count }: RejectionBadgeProps) {
  if (count <= 0) {
    return null;
  }

  return (
    <div
      data-testid="rejection-badge"
      className="flex items-center gap-1 text-amber-500 text-xs"
    >
      <AlertTriangle className="h-3 w-3" />
      <span className="font-medium">{count}</span>
    </div>
  );
}
