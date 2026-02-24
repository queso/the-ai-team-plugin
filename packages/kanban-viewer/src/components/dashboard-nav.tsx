"use client";

import { cn } from "@/lib/utils";

export type DashboardView = 'board' | 'agents';

export interface DashboardNavProps {
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
}

export function DashboardNav({ currentView, onViewChange }: DashboardNavProps) {
  return (
    <nav className="border-b border-border bg-card">
      <div className="flex gap-1 px-4">
        <button
          role="button"
          data-active={currentView === 'board' ? 'true' : 'false'}
          onClick={() => onViewChange('board')}
          className={cn(
            "px-4 py-3 text-sm font-medium transition-colors relative",
            currentView === 'board'
              ? "text-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Mission Board
          {currentView === 'board' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>

        <button
          role="button"
          data-active={currentView === 'agents' ? 'true' : 'false'}
          onClick={() => onViewChange('agents')}
          className={cn(
            "px-4 py-3 text-sm font-medium transition-colors relative",
            currentView === 'agents'
              ? "text-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Raw Agent View
          {currentView === 'agents' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
      </div>
    </nav>
  );
}
