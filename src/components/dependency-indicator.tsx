import { Link } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface DependencyIndicatorProps {
  blockerIds: string[];
  /** For testing: force tooltip to be open */
  defaultOpen?: boolean;
}

export function DependencyIndicator({ blockerIds, defaultOpen }: DependencyIndicatorProps) {
  // Return null when no blockers
  if (!blockerIds || blockerIds.length === 0) {
    return null;
  }

  return (
    <Tooltip defaultOpen={defaultOpen}>
      <TooltipTrigger asChild>
        <div
          data-testid="dependency-indicator"
          className="flex items-center gap-1 text-muted-foreground text-xs cursor-default"
        >
          <Link className="h-3 w-3" />
          <span>{blockerIds.length}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-sm">
          <div className="font-medium">Blocked by:</div>
          <ul className="mt-1">
            {blockerIds.map((id) => (
              <li key={id}>- {id}</li>
            ))}
          </ul>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
