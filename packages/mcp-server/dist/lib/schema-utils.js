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
export function zodToJsonSchema(schema) {
    if (schema instanceof z.ZodObject) {
        const shape = schema.shape;
        const properties = {};
        const required = [];
        for (const [key, value] of Object.entries(shape)) {
            const zodValue = value;
            properties[key] = getPropertySchema(zodValue);
            if (!isOptional(zodValue)) {
                required.push(key);
            }
        }
        return {
            type: 'object',
            properties,
            required: required.length > 0 ? required : undefined,
        };
    }
    return { type: 'object', properties: {} };
}
/**
 * Checks if a Zod schema is optional (ZodOptional or ZodDefault).
 */
export function isOptional(schema) {
    if (schema instanceof z.ZodOptional)
        return true;
    if (schema instanceof z.ZodDefault)
        return true;
    if (schema._def?.typeName === 'ZodOptional')
        return true;
    if (schema._def?.typeName === 'ZodDefault')
        return true;
    return false;
}
/**
 * Gets the JSON Schema representation of a Zod property.
 * Handles: ZodString, ZodNumber, ZodBoolean, ZodEnum, ZodArray,
 * ZodObject, ZodEffects, ZodOptional, ZodDefault.
 */
export function getPropertySchema(schema) {
    // Unwrap optional and default types
    let unwrapped = schema;
    if (unwrapped instanceof z.ZodOptional) {
        unwrapped = unwrapped.unwrap();
    }
    if (unwrapped instanceof z.ZodDefault) {
        unwrapped = unwrapped._def.innerType;
    }
    if (unwrapped instanceof z.ZodString) {
        return { type: 'string' };
    }
    if (unwrapped instanceof z.ZodNumber) {
        return { type: 'number' };
    }
    if (unwrapped instanceof z.ZodBoolean) {
        return { type: 'boolean' };
    }
    if (unwrapped instanceof z.ZodEnum) {
        return { type: 'string', enum: unwrapped.options };
    }
    if (unwrapped instanceof z.ZodArray) {
        return {
            type: 'array',
            items: getPropertySchema(unwrapped.element),
        };
    }
    if (unwrapped instanceof z.ZodObject) {
        return zodToJsonSchema(unwrapped);
    }
    // For refined types (like AgentNameSchema), recurse into the inner type
    if (unwrapped instanceof z.ZodEffects) {
        return getPropertySchema(unwrapped.innerType());
    }
    return { type: 'string' };
}
//# sourceMappingURL=schema-utils.js.map