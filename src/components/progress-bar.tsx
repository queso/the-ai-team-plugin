"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressBarProps {
  completed: number;
  total: number;
  className?: string;
}

function calculatePercentage(completed: number, total: number): number {
  if (total <= 0) return 0;
  const percentage = (completed / total) * 100;
  // Clamp between 0 and 100
  return Math.max(0, Math.min(100, percentage));
}

export function ProgressBar({ completed, total, className }: ProgressBarProps) {
  const percentage = calculatePercentage(completed, total);
  const roundedPercentage = Math.round(percentage);
  // Show green when at 100% (completed >= total and total > 0)
  const isComplete = total > 0 && completed >= total;

  return (
    <div
      data-testid="progress-bar"
      className={cn("flex items-center gap-2", className)}
    >
      <div
        data-testid="progress-container"
        role="progressbar"
        aria-valuenow={roundedPercentage}
        aria-valuemin={0}
        aria-valuemax={100}
        className="bg-muted relative h-2 w-20 overflow-hidden rounded-full"
      >
        <div
          data-testid="progress-fill"
          className={cn(
            "h-full rounded-full transition-all",
            isComplete ? "bg-success" : "bg-primary"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="font-mono text-sm text-foreground">
        {completed}/{total}
      </span>
    </div>
  );
}
