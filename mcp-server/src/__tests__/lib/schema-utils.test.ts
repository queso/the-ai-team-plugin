import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  zodToJsonSchema,
  isOptional,
  getPropertySchema,
} from '../../lib/schema-utils.js';

describe('schema-utils', () => {
  // ---------------------------------------------------------------------------
  // zodToJsonSchema
  // ---------------------------------------------------------------------------
  describe('zodToJsonSchema', () => {
    it('converts a ZodObject with required string fields', () => {
      const schema = z.object({
        name: z.string(),
      });

      const result = zodToJsonSchema(schema);
      expect(result).toEqual({
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      });
    });

    it('marks optional fields as not required', () => {
      const schema = z.object({
        id: z.string(),
        label: z.string().optional(),
      });

      const result = zodToJsonSchema(schema);
      expect(result).toEqual({
        type: 'object',
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
        },
        required: ['id'],
      });
    });

    it('omits required array when all fields are optional', () => {
      const schema = z.object({
        a: z.string().optional(),
        b: z.number().optional(),
      });

      const result = zodToJsonSchema(schema);
      expect(result).toEqual({
        type: 'object',
        properties: {
          a: { type: 'string' },
          b: { type: 'number' },
        },
        required: undefined,
      });
    });

    it('returns empty object schema for non-object Zod types', () => {
      const schema = z.string();
      const result = zodToJsonSchema(schema);
      expect(result).toEqual({ type: 'object', properties: {} });
    });
  });

  // ---------------------------------------------------------------------------
  // getPropertySchema - primitive types
  // ---------------------------------------------------------------------------
  describe('getPropertySchema', () => {
    it('converts ZodString to { type: "string" }', () => {
      expect(getPropertySchema(z.string())).toEqual({ type: 'string' });
    });

    it('converts ZodNumber to { type: "number" }', () => {
      expect(getPropertySchema(z.number())).toEqual({ type: 'number' });
    });

    it('converts ZodBoolean to { type: "boolean" }', () => {
      expect(getPropertySchema(z.boolean())).toEqual({ type: 'boolean' });
    });

    it('converts ZodEnum to { type: "string", enum: [...] }', () => {
      const schema = z.enum(['feature', 'bug', 'task']);
      expect(getPropertySchema(schema)).toEqual({
        type: 'string',
        enum: ['feature', 'bug', 'task'],
      });
    });

    // -------------------------------------------------------------------------
    // getPropertySchema - compound types
    // -------------------------------------------------------------------------
    it('converts ZodArray of strings', () => {
      const schema = z.array(z.string());
      expect(getPropertySchema(schema)).toEqual({
        type: 'array',
        items: { type: 'string' },
      });
    });

    it('converts ZodArray of numbers', () => {
      const schema = z.array(z.number());
      expect(getPropertySchema(schema)).toEqual({
        type: 'array',
        items: { type: 'number' },
      });
    });

    it('converts nested ZodObject', () => {
      const schema = z.object({
        test: z.string(),
        impl: z.string(),
      });
      expect(getPropertySchema(schema)).toEqual({
        type: 'object',
        properties: {
          test: { type: 'string' },
          impl: { type: 'string' },
        },
        required: ['test', 'impl'],
      });
    });

    // -------------------------------------------------------------------------
    // getPropertySchema - wrapper types (Optional, Default)
    // -------------------------------------------------------------------------
    it('unwraps ZodOptional and returns inner type', () => {
      const schema = z.string().optional();
      expect(getPropertySchema(schema)).toEqual({ type: 'string' });
    });

    it('unwraps ZodDefault and returns inner type', () => {
      const schema = z.string().default('hello');
      expect(getPropertySchema(schema)).toEqual({ type: 'string' });
    });

    it('unwraps ZodOptional wrapping ZodNumber', () => {
      const schema = z.number().optional();
      expect(getPropertySchema(schema)).toEqual({ type: 'number' });
    });

    it('unwraps ZodDefault wrapping ZodBoolean', () => {
      const schema = z.boolean().default(false);
      expect(getPropertySchema(schema)).toEqual({ type: 'boolean' });
    });

    it('unwraps ZodOptional wrapping ZodEnum', () => {
      const schema = z.enum(['a', 'b']).optional();
      expect(getPropertySchema(schema)).toEqual({
        type: 'string',
        enum: ['a', 'b'],
      });
    });

    it('unwraps ZodDefault wrapping ZodArray', () => {
      const schema = z.array(z.string()).default([]);
      expect(getPropertySchema(schema)).toEqual({
        type: 'array',
        items: { type: 'string' },
      });
    });

    // -------------------------------------------------------------------------
    // getPropertySchema - ZodEffects (refined types)
    // -------------------------------------------------------------------------
    it('handles ZodEffects (refined string)', () => {
      const schema = z.string().refine((v) => v.length > 0);
      expect(getPropertySchema(schema)).toEqual({ type: 'string' });
    });

    it('handles ZodEffects wrapping a number', () => {
      const schema = z.number().refine((v) => v > 0);
      expect(getPropertySchema(schema)).toEqual({ type: 'number' });
    });

    it('handles ZodEffects wrapping an enum', () => {
      const schema = z.enum(['low', 'high']).refine((v) => v !== 'low');
      expect(getPropertySchema(schema)).toEqual({
        type: 'string',
        enum: ['low', 'high'],
      });
    });

    // -------------------------------------------------------------------------
    // getPropertySchema - fallback
    // -------------------------------------------------------------------------
    it('falls back to { type: "string" } for unknown types', () => {
      // z.any() is not explicitly handled, should fall through
      expect(getPropertySchema(z.any())).toEqual({ type: 'string' });
    });
  });

  // ---------------------------------------------------------------------------
  // isOptional
  // ---------------------------------------------------------------------------
  describe('isOptional', () => {
    it('returns true for ZodOptional', () => {
      expect(isOptional(z.string().optional())).toBe(true);
    });

    it('returns true for ZodDefault', () => {
      expect(isOptional(z.string().default('x'))).toBe(true);
    });

    it('returns false for required ZodString', () => {
      expect(isOptional(z.string())).toBe(false);
    });

    it('returns false for required ZodNumber', () => {
      expect(isOptional(z.number())).toBe(false);
    });

    it('returns false for required ZodEnum', () => {
      expect(isOptional(z.enum(['a', 'b']))).toBe(false);
    });

    it('returns false for required ZodArray', () => {
      expect(isOptional(z.array(z.string()))).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Integration: zodToJsonSchema with mixed field types
  // ---------------------------------------------------------------------------
  describe('zodToJsonSchema integration', () => {
    it('handles a realistic work item schema', () => {
      const schema = z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        type: z.enum(['feature', 'bug', 'task', 'enhancement']),
        priority: z.enum(['critical', 'high', 'medium', 'low']),
        status: z.string().default('pending'),
        dependencies: z.array(z.string()).default([]),
        outputs: z.object({
          impl: z.string(),
          test: z.string(),
          types: z.string().optional(),
        }).optional(),
      });

      const result = zodToJsonSchema(schema);
      expect(result).toEqual({
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          type: { type: 'string', enum: ['feature', 'bug', 'task', 'enhancement'] },
          priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          status: { type: 'string' },
          dependencies: { type: 'array', items: { type: 'string' } },
          outputs: {
            type: 'object',
            properties: {
              impl: { type: 'string' },
              test: { type: 'string' },
              types: { type: 'string' },
            },
            required: ['impl', 'test'],
          },
        },
        required: ['title', 'description', 'type', 'priority'],
      });
    });

    it('handles schema with ZodEffects fields', () => {
      const AgentNameSchema = z.string().refine(
        (v) => ['murdock', 'ba', 'lynch', 'amy', 'tawnia'].includes(v),
        { message: 'Invalid agent name' }
      );

      const schema = z.object({
        agent: AgentNameSchema,
        itemId: z.string().min(1),
        verbose: z.boolean().optional(),
      });

      const result = zodToJsonSchema(schema);
      expect(result).toEqual({
        type: 'object',
        properties: {
          agent: { type: 'string' },
          itemId: { type: 'string' },
          verbose: { type: 'boolean' },
        },
        required: ['agent', 'itemId'],
      });
    });
  });
});
