import { useState, useRef, useEffect, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WorkItemCard } from '@/components/work-item-card';
import type { WorkItem, Stage, CardAnimationState, CardAnimationDirection } from '@/types';
import { cn } from '@/lib/utils';

export interface BoardColumnProps {
  stage: Stage;
  items: WorkItem[];
  wipLimit?: number | null;
  onItemClick?: (item: WorkItem) => void;
  animatingItems?: Map<string, { state: CardAnimationState; direction: CardAnimationDirection }>;
  onAnimationEnd?: (itemId: string) => void;
  onWipLimitChange?: (stageId: string, newLimit: number | null) => void;
}

function getWipDisplayColor(itemCount: number, wipLimit: number | null | undefined): string {
  // Unlimited columns always show muted
  if (wipLimit === null || wipLimit === undefined) {
    return 'text-muted-foreground';
  }

  if (itemCount > wipLimit) {
    return 'text-red-500';
  }

  if (itemCount === wipLimit) {
    return 'text-yellow-500';
  }

  return 'text-muted-foreground';
}

export function BoardColumn({
  stage,
  items,
  wipLimit,
  onItemClick,
  animatingItems,
  onAnimationEnd,
  onWipLimitChange,
}: BoardColumnProps) {
  const itemCount = items.length;
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const limitDisplay = wipLimit === null || wipLimit === undefined ? '\u221E' : String(wipLimit);
  const wipColorClass = getWipDisplayColor(itemCount, wipLimit);

  const handleLimitClick = useCallback(() => {
    if (!onWipLimitChange) return;

    setEditValue(wipLimit === null || wipLimit === undefined ? '' : String(wipLimit));
    setIsEditing(true);
  }, [onWipLimitChange, wipLimit]);

  const handleSave = useCallback(() => {
    const trimmed = editValue.trim();
    const numValue = trimmed === '' || trimmed === '0' ? null : parseInt(trimmed, 10);
    onWipLimitChange?.(stage, numValue);
    setIsEditing(false);
  }, [editValue, onWipLimitChange, stage]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  }, [handleSave, handleCancel]);

  const handleBlur = useCallback(() => {
    handleSave();
  }, [handleSave]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  return (
    <div
      data-testid="board-column"
      className="flex flex-col h-full rounded-lg min-w-[200px] bg-muted/30"
    >
      {/* Header */}
      <div
        data-testid="column-header"
        className="p-3 border-b border-border"
      >
        <div className="flex justify-between items-center">
          <span className="font-semibold text-sm tracking-wide">
            {stage.toUpperCase()}
          </span>
          <span
            data-testid="wip-display"
            className={cn('text-sm font-medium', wipColorClass)}
          >
            {itemCount}/
            {isEditing ? (
              <input
                ref={inputRef}
                data-testid="wip-limit-input"
                type="number"
                min="0"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                className="w-12 px-1 bg-background border border-border rounded text-sm"
              />
            ) : (
              <span
                data-testid="wip-limit-value"
                onClick={handleLimitClick}
                className={cn(onWipLimitChange && 'cursor-pointer hover:underline')}
              >
                {limitDisplay}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Scrollable card area */}
      <ScrollArea
        data-testid="column-scroll-area"
        className="flex-1"
      >
        <div
          data-testid="card-container"
          className="p-2 space-y-2"
        >
          {items.map((item) => {
            const animationInfo = animatingItems?.get(item.id);
            const isAnimating = animationInfo && animationInfo.state !== 'idle';

            return (
              <div
                key={item.id}
                data-testid={`card-wrapper-${item.id}`}
                className={cn(
                  'card-layout-shift',
                  isAnimating && 'will-change-transform'
                )}
              >
                <WorkItemCard
                  item={item}
                  onClick={onItemClick ? () => onItemClick(item) : undefined}
                  animationState={animationInfo?.state}
                  animationDirection={animationInfo?.direction}
                  onAnimationEnd={
                    onAnimationEnd ? () => onAnimationEnd(item.id) : undefined
                  }
                />
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
