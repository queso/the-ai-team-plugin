export const ALL_STAGES = [
  'briefings',
  'ready',
  'testing',
  'implementing',
  'review',
  'probing',
  'done',
  'blocked',
] as const;

export type StageId = (typeof ALL_STAGES)[number];

export const TRANSITION_MATRIX: Record<StageId, readonly StageId[]> = {
  briefings: ['ready', 'blocked'],
  ready: ['testing', 'implementing', 'probing', 'blocked', 'briefings'],
  testing: ['review', 'blocked'],
  implementing: ['review', 'blocked'],
  probing: ['ready', 'done', 'blocked'],
  review: ['done', 'testing', 'implementing', 'probing', 'blocked'],
  done: [],
  blocked: ['ready'],
};

export function isValidTransition(from: StageId, to: StageId): boolean {
  return TRANSITION_MATRIX[from].includes(to);
}

export function getValidNextStages(from: StageId): readonly StageId[] {
  return TRANSITION_MATRIX[from];
}
