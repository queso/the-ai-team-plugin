/**
 * Shared Zod-to-JSON-Schema conversion utilities.
 *
 * Provides a unified implementation that handles all Zod types used
 * across the MCP tool modules: ZodString, ZodNumber, ZodBoolean,
 * ZodEnum, ZodArray, ZodObject, ZodEffects, ZodOptional, ZodDefault.
 */
import { z } from 'zod';
/**
 * Converts a Zod schema to JSON Schema format for MCP tool registration.
 */
export declare function zodToJsonSchema(schema: z.ZodType): object;
/**
 * Checks if a Zod schema is optional (ZodOptional or ZodDefault).
 */
export declare function isOptional(schema: z.ZodTypeAny): boolean;
/**
 * Gets the JSON Schema representation of a Zod property.
 * Handles: ZodString, ZodNumber, ZodBoolean, ZodEnum, ZodArray,
 * ZodObject, ZodEffects, ZodOptional, ZodDefault.
 */
export declare function getPropertySchema(schema: z.ZodTypeAny): object;
//# sourceMappingURL=schema-utils.d.ts.map