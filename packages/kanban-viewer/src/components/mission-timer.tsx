"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

export interface MissionTimerProps {
  startedAt: string;
  status: "active" | "paused" | "blocked";
}

function formatElapsedTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function calculateElapsedSeconds(startedAt: string): number {
  if (!startedAt) {
    return 0;
  }
  const start = new Date(startedAt).getTime();
  const now = Date.now();
  const elapsed = Math.floor((now - start) / 1000);
  // Return 0 for negative elapsed time (future startedAt)
  return Math.max(0, elapsed);
}

export function MissionTimer({ startedAt, status }: MissionTimerProps) {
  const [elapsedTime, setElapsedTime] = useState(() =>
    calculateElapsedSeconds(startedAt)
  );

  useEffect(() => {
    // Recalculate when startedAt changes
    setElapsedTime(calculateElapsedSeconds(startedAt));
  }, [startedAt]);

  useEffect(() => {
    // Only run timer when mission is active
    if (status !== "active") {
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  return (
    <div data-testid="mission-timer" className="flex items-center gap-2">
      <Clock className="w-4 h-4 text-muted-foreground" />
      <span
        data-testid="mission-timer-display"
        className="font-mono text-sm text-foreground"
      >
        {formatElapsedTime(elapsedTime)}
      </span>
    </div>
  );
}
