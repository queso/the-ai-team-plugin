import * as React from "react";
import type { MissionTokenUsageData } from "@/types";

// ============================================================================
// Utility functions
// ============================================================================

/**
 * Format a token count into a human-readable string.
 * Values below 1000 are returned as-is.
 * Values in the thousands are formatted as "X.XK".
 * Values in the millions are formatted as "X.XM".
 */
export function formatTokenCount(count: number): string {
  if (count === 0) return "0";
  if (count < 1000) return String(count);
  if (count < 1_000_000) return `${(count / 1000).toFixed(1)}K`;
  return `${(count / 1_000_000).toFixed(1)}M`;
}

/**
 * Format a USD cost value as a dollar string with exactly 2 decimal places.
 */
export function formatCostUsd(cost: number): string {
  return `$${cost.toFixed(2)}`;
}

// ============================================================================
// Component types
// ============================================================================

export interface TokenUsagePanelProps {
  agents: MissionTokenUsageData[];
  totals: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
    estimatedCostUsd: number;
  };
}

// ============================================================================
// Sub-components
// ============================================================================

function EmptyState() {
  return (
    <div data-testid="token-usage-empty" className="text-center text-gray-400 py-8">
      No token data available
    </div>
  );
}

function CostBar({ widthPercent }: { widthPercent: number }) {
  return (
    <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
      <div
        data-testid="token-usage-cost-bar"
        data-width={String(widthPercent)}
        className="bg-blue-500 h-1.5 rounded-full"
        style={{ width: `${widthPercent}%` }}
      />
    </div>
  );
}

interface AgentRowProps {
  agent: MissionTokenUsageData;
  barWidthPercent: number;
}

function AgentRow({ agent, barWidthPercent }: AgentRowProps) {
  return (
    <tr data-testid="token-usage-agent-row">
      <td className="py-2 pr-4 font-medium">{agent.agentName}</td>
      <td className="py-2 pr-4 text-gray-400 text-sm">{agent.model}</td>
      <td className="py-2 pr-4 text-right text-sm">{formatTokenCount(agent.inputTokens)}</td>
      <td className="py-2 pr-4 text-right text-sm">{formatTokenCount(agent.outputTokens)}</td>
      <td className="py-2 pr-4 text-right text-sm">{formatTokenCount(agent.cacheCreationTokens)}</td>
      <td className="py-2 pr-4 text-right text-sm">{formatTokenCount(agent.cacheReadTokens)}</td>
      <td className="py-2 min-w-[120px]">
        <div className="text-right text-sm font-medium">{formatCostUsd(agent.estimatedCostUsd)}</div>
        <CostBar widthPercent={barWidthPercent} />
      </td>
    </tr>
  );
}

// ============================================================================
// Main component
// ============================================================================

export function TokenUsagePanel({ agents, totals }: TokenUsagePanelProps) {
  if (agents.length === 0) {
    return <EmptyState />;
  }

  const sortedAgents = [...agents].sort(
    (a, b) => b.estimatedCostUsd - a.estimatedCostUsd
  );

  const maxCost = sortedAgents[0].estimatedCostUsd;

  function barWidthFor(cost: number): number {
    if (maxCost === 0) return 0;
    return Math.round((cost / maxCost) * 100);
  }

  return (
    <div className="p-4">
      {/* Total cost summary */}
      <div className="mb-4">
        <span className="text-gray-400 text-sm mr-2">Total mission cost:</span>
        <span
          data-testid="token-usage-total-cost"
          className="text-white font-bold text-lg"
        >
          {formatCostUsd(totals.estimatedCostUsd)}
        </span>
      </div>

      {/* Per-agent breakdown table */}
      <table data-testid="token-usage-table" className="w-full text-white text-sm">
        <thead>
          <tr className="text-gray-400 border-b border-gray-700">
            <th className="text-left pb-2 pr-4">Agent</th>
            <th className="text-left pb-2 pr-4">Model</th>
            <th className="text-right pb-2 pr-4">Input</th>
            <th className="text-right pb-2 pr-4">Output</th>
            <th className="text-right pb-2 pr-4">Cache Write</th>
            <th className="text-right pb-2 pr-4">Cache Read</th>
            <th className="text-right pb-2">Cost</th>
          </tr>
        </thead>
        <tbody>
          {sortedAgents.map((agent, index) => (
            <AgentRow
              key={`${agent.agentName}-${index}`}
              agent={agent}
              barWidthPercent={barWidthFor(agent.estimatedCostUsd)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
