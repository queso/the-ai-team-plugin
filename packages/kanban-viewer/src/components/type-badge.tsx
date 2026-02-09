import type { WorkItemFrontmatterType } from '@/types';

export interface TypeBadgeProps {
  type: WorkItemFrontmatterType;
}

const TYPE_COLORS: Record<WorkItemFrontmatterType, string> = {
  feature: 'bg-cyan-500',
  bug: 'bg-red-500',
  enhancement: 'bg-blue-500',
  task: 'bg-green-500',
};

export function TypeBadge({ type }: TypeBadgeProps) {
  const colorClass = TYPE_COLORS[type] || 'bg-gray-500';

  return (
    <span
      data-testid="type-badge"
      className={`
        inline-flex items-center
        px-2 py-0.5
        rounded-full
        text-xs text-white
        ${colorClass}
      `}
    >
      {type}
    </span>
  );
}
