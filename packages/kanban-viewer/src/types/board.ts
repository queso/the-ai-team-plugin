/**
 * Board-related types for the API layer.
 *
 * These types define the board structure, stages, and WIP status
 * for the new API layer as specified in PRD 013-mcp-interface.md.
 */

import type { StageId } from '@ai-team/shared';
import type { ItemWithRelations } from './item';
import type { AgentClaim } from './agent';
import type { Mission } from './mission';

// Re-export StageId for backward compatibility
export type { StageId };

/**
 * Stage configuration including display name, ordering, and WIP limits.
 */
export interface Stage {
  id: StageId;
  name: string;
  order: number;
  wipLimit: number | null;
}

/**
 * Complete board state including stages, items, claims, and current mission.
 */
export interface BoardState {
  stages: Stage[];
  items: ItemWithRelations[];
  claims: AgentClaim[];
  currentMission: Mission | null;
}

/**
 * WIP (Work In Progress) status for a specific stage.
 * Tracks current usage against configured limits.
 */
export interface WipStatus {
  stageId: StageId;
  limit: number | null;
  current: number;
  available: number | null;
}
