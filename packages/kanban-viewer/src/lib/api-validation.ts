/**
 * Validation helpers that throw on unexpected types instead of silently defaulting.
 * This surfaces data corruption early in the pipeline.
 */

export class ValidationError extends Error {
  constructor(message: string, public readonly value: unknown) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const VALID_ITEM_TYPES = ['feature', 'bug', 'enhancement', 'task'] as const;
export const VALID_AGENT_NAMES = ['Hannibal', 'Face', 'Murdock', 'B.A.', 'Lynch', 'Amy', 'Tawnia'] as const;
export const VALID_STAGE_IDS = ['briefings', 'ready', 'testing', 'implementing', 'probing', 'review', 'done', 'blocked'] as const;

export type ValidItemType = typeof VALID_ITEM_TYPES[number];
export type ValidAgentName = typeof VALID_AGENT_NAMES[number];

/**
 * Type guard to check if a string is a valid AgentName.
 */
export function isAgentName(value: string): value is ValidAgentName {
  return VALID_AGENT_NAMES.includes(value as ValidAgentName);
}

/**
 * Type guard to check if a string is a valid StageId.
 */
export function isStageId(value: string): value is typeof VALID_STAGE_IDS[number] {
  return VALID_STAGE_IDS.includes(value as typeof VALID_STAGE_IDS[number]);
}

/**
 * Validates that a value is a valid item type.
 * @throws ValidationError if the value is not a valid item type
 */
export function validateItemType(value: unknown): ValidItemType {
  if (typeof value !== 'string' || !VALID_ITEM_TYPES.includes(value as ValidItemType)) {
    console.error(`Invalid item type: ${value}`);
    throw new ValidationError(`Invalid item type: ${value}`, value);
  }
  return value as ValidItemType;
}

/**
 * Validates that a value is a valid agent name.
 * @throws ValidationError if the value is not a valid agent name
 */
export function validateAgentName(value: unknown): ValidAgentName {
  if (typeof value !== 'string' || !VALID_AGENT_NAMES.includes(value as ValidAgentName)) {
    console.error(`Invalid agent name: ${value}`);
    throw new ValidationError(`Invalid agent name: ${value}`, value);
  }
  return value as ValidAgentName;
}

/**
 * Validates that a value is a valid date.
 * Accepts Date objects, ISO date strings, and numeric timestamps.
 * @throws ValidationError if the value cannot be converted to a valid Date
 */
export function validateDate(value: unknown): Date {
  if (value === null || value === undefined) {
    console.error(`Invalid date: ${value}`);
    throw new ValidationError(`Invalid date: ${value}`, value);
  }

  let date: Date;

  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'number') {
    if (isNaN(value)) {
      console.error(`Invalid date: ${value}`);
      throw new ValidationError(`Invalid date: ${value}`, value);
    }
    date = new Date(value);
  } else if (typeof value === 'string') {
    date = new Date(value);
  } else {
    console.error(`Invalid date: ${value}`);
    throw new ValidationError(`Invalid date: ${value}`, value);
  }

  if (isNaN(date.getTime())) {
    console.error(`Invalid date: ${value}`);
    throw new ValidationError(`Invalid date: ${value}`, value);
  }

  return date;
}
