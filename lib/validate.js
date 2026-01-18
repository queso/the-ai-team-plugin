/**
 * Input validation utilities for CLI scripts.
 * Provides schema validation with clear error messages.
 */

export const STAGES = ['briefings', 'ready', 'testing', 'implementing', 'review', 'probing', 'done', 'blocked'];
export const AGENTS = ['hannibal', 'face', 'murdock', 'ba', 'lynch', 'amy'];
export const ITEM_TYPES = ['feature', 'bug', 'enhancement', 'task', 'implementation', 'integration', 'interface', 'test'];

/**
 * Validation schemas for each script input.
 */
export const schemas = {
  boardMove: {
    required: ['itemId', 'to'],
    properties: {
      itemId: { type: 'string' },
      to: { type: 'string', enum: STAGES },
      agent: { type: 'string' },
      task_id: { type: 'string' }
    }
  },

  boardClaim: {
    required: ['itemId', 'agent'],
    properties: {
      itemId: { type: 'string' },
      agent: { type: 'string', enum: AGENTS },
      task_id: { type: 'string' }
    }
  },

  boardRelease: {
    required: ['itemId'],
    properties: {
      itemId: { type: 'string' },
      agent: { type: 'string' },
      reason: { type: 'string' }
    }
  },

  itemCreate: {
    required: ['title', 'type', 'objective', 'acceptance', 'outputs'],
    properties: {
      id: { type: 'string', pattern: /^\d{3}$/ },
      title: { type: 'string', minLength: 1 },
      type: { type: 'string', enum: ITEM_TYPES },
      objective: { type: 'string', minLength: 1 },
      acceptance: { type: 'array', items: { type: 'string' } },
      outputs: {
        type: 'object',
        required: ['test', 'impl'],
        properties: {
          test: { type: 'string', minLength: 1 },
          impl: { type: 'string', minLength: 1 },
          types: { type: 'string' }
        }
      },
      dependencies: { type: 'array', items: { type: 'string' } },
      parallel_group: { type: 'string' },
      context: { type: 'string' },
      estimate: { type: 'string' }
    }
  },

  itemUpdate: {
    required: ['itemId'],
    properties: {
      itemId: { type: 'string' },
      updates: { type: 'object' }
    }
  },

  itemReject: {
    required: ['itemId', 'reason'],
    properties: {
      itemId: { type: 'string' },
      agent: { type: 'string' },
      reason: { type: 'string', minLength: 1 },
      issues: { type: 'array', items: { type: 'string' } }
    }
  },

  itemComplete: {
    required: ['itemId', 'agent', 'status'],
    properties: {
      itemId: { type: 'string' },
      agent: { type: 'string', enum: AGENTS },
      status: { type: 'string', enum: ['success', 'failed'] },
      message: { type: 'string' }
    }
  }
};

/**
 * Validates a value against a property schema.
 * @param {*} value - Value to validate
 * @param {object} propSchema - Property schema
 * @param {string} path - Property path for error messages
 * @returns {string[]} Array of error messages
 */
function validateProperty(value, propSchema, path) {
  const errors = [];

  if (propSchema.type === 'string') {
    if (typeof value !== 'string') {
      errors.push(`${path} must be a string`);
      return errors;
    }
    if (propSchema.minLength && value.length < propSchema.minLength) {
      errors.push(`${path} must not be empty`);
    }
    if (propSchema.pattern && !propSchema.pattern.test(value)) {
      errors.push(`${path} has invalid format`);
    }
    if (propSchema.enum && !propSchema.enum.includes(value.toLowerCase())) {
      errors.push(`${path} must be one of: ${propSchema.enum.join(', ')}`);
    }
  }

  if (propSchema.type === 'array') {
    if (!Array.isArray(value)) {
      errors.push(`${path} must be an array`);
      return errors;
    }
    if (propSchema.items) {
      value.forEach((item, i) => {
        errors.push(...validateProperty(item, propSchema.items, `${path}[${i}]`));
      });
    }
  }

  if (propSchema.type === 'object') {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      errors.push(`${path} must be an object`);
      return errors;
    }
    // Check required fields within the object
    if (propSchema.required) {
      for (const field of propSchema.required) {
        if (value[field] === undefined || value[field] === null || value[field] === '') {
          errors.push(`${path}.${field} is required`);
        }
      }
    }
    if (propSchema.properties) {
      for (const [key, subSchema] of Object.entries(propSchema.properties)) {
        if (value[key] !== undefined) {
          errors.push(...validateProperty(value[key], subSchema, `${path}.${key}`));
        }
      }
    }
  }

  return errors;
}

/**
 * Validates input data against a schema.
 * @param {object} data - Input data to validate
 * @param {string} schemaName - Name of schema in schemas object
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validate(data, schemaName) {
  const schema = schemas[schemaName];
  if (!schema) {
    return { valid: false, errors: [`Unknown schema: ${schemaName}`] };
  }

  const errors = [];

  // Check required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (data[field] === undefined || data[field] === null) {
        errors.push(`Missing required field: ${field}`);
      }
    }
  }

  // Validate properties
  if (schema.properties) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (data[key] !== undefined) {
        errors.push(...validateProperty(data[key], propSchema, key));
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates input and throws if invalid.
 * @param {object} data - Input data to validate
 * @param {string} schemaName - Name of schema
 * @throws {Error} Validation error with exitCode
 */
export function assertValid(data, schemaName) {
  const result = validate(data, schemaName);
  if (!result.valid) {
    const error = new Error(`Validation failed: ${result.errors.join('; ')}`);
    error.code = 'INVALID_INPUT';
    error.exitCode = 11;
    error.errors = result.errors;
    throw error;
  }
}

/**
 * Reads and parses JSON from stdin.
 * @returns {Promise<object>}
 */
export async function readJsonInput() {
  return new Promise((resolve, reject) => {
    let data = '';

    // Check for --input flag in argv
    const inputFlagIndex = process.argv.findIndex(arg => arg.startsWith('--input'));
    if (inputFlagIndex !== -1) {
      let jsonStr;
      if (process.argv[inputFlagIndex].includes('=')) {
        jsonStr = process.argv[inputFlagIndex].split('=')[1];
      } else {
        jsonStr = process.argv[inputFlagIndex + 1];
      }
      try {
        resolve(JSON.parse(jsonStr));
      } catch (err) {
        const error = new Error('Invalid JSON in --input flag');
        error.code = 'INVALID_INPUT';
        error.exitCode = 10;
        reject(error);
      }
      return;
    }

    // Read from stdin
    process.stdin.setEncoding('utf8');

    process.stdin.on('readable', () => {
      let chunk;
      while ((chunk = process.stdin.read()) !== null) {
        data += chunk;
      }
    });

    process.stdin.on('end', () => {
      if (!data.trim()) {
        // Empty input is valid for some scripts (like board-read)
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        const error = new Error('Invalid JSON input');
        error.code = 'INVALID_INPUT';
        error.exitCode = 10;
        reject(error);
      }
    });

    process.stdin.on('error', reject);
  });
}

/**
 * Writes JSON result to stdout.
 * @param {object} result - Result object
 */
export function writeJsonOutput(result) {
  console.log(JSON.stringify(result, null, 2));
}

/**
 * Writes error to stderr and exits.
 * @param {Error} error - Error object
 */
export function writeError(error) {
  const output = {
    error: error.code || 'UNKNOWN_ERROR',
    message: error.message
  };
  if (error.itemId) output.itemId = error.itemId;
  if (error.errors) output.errors = error.errors;

  console.error(JSON.stringify(output, null, 2));
  process.exit(error.exitCode || 1);
}
