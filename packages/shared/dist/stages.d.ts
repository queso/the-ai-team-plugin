export declare const ALL_STAGES: readonly ["briefings", "ready", "testing", "implementing", "review", "probing", "done", "blocked"];
export type StageId = (typeof ALL_STAGES)[number];
export declare const TRANSITION_MATRIX: Record<StageId, readonly StageId[]>;
export declare function isValidTransition(from: StageId, to: StageId): boolean;
export declare function getValidNextStages(from: StageId): readonly StageId[];
