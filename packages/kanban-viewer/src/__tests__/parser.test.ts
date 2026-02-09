import { describe, it, expect } from 'vitest';
import { parseWorkItem } from '../lib/parser';
import type { WorkItem } from '../types';

describe('parseWorkItem', () => {
  describe('valid input', () => {
    it('should parse complete work item with all fields', () => {
      const content = `---
id: "001"
title: "Test feature"
type: feature
status: ready
assigned_agent: Hannibal
rejection_count: 0
dependencies: ["002", "003"]
outputs:
  test: "src/__tests__/feature.test.ts"
  impl: "src/lib/feature.ts"
  types: "src/types/feature.ts"
created_at: "2026-01-15T00:00:00Z"
updated_at: "2026-01-15T00:00:00Z"
stage: briefings
---

This is the markdown body content.`;

      const result = parseWorkItem(content);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('001');
      expect(result?.title).toBe('Test feature');
      expect(result?.type).toBe('feature');
      expect(result?.status).toBe('ready');
      expect(result?.assigned_agent).toBe('Hannibal');
      expect(result?.rejection_count).toBe(0);
      expect(result?.dependencies).toEqual(['002', '003']);
      expect(result?.outputs.test).toBe('src/__tests__/feature.test.ts');
      expect(result?.outputs.impl).toBe('src/lib/feature.ts');
      expect(result?.outputs.types).toBe('src/types/feature.ts');
      expect(result?.created_at).toBe('2026-01-15T00:00:00Z');
      expect(result?.updated_at).toBe('2026-01-15T00:00:00Z');
      expect(result?.stage).toBe('briefings');
      expect(result?.content).toBe('This is the markdown body content.');
    });

    it('should handle work item without optional assigned_agent', () => {
      const content = `---
id: "002"
title: "Unassigned task"
type: task
status: ready
rejection_count: 0
dependencies: []
outputs: {}
created_at: "2026-01-15T00:00:00Z"
updated_at: "2026-01-15T00:00:00Z"
stage: briefings
---

Task description here.`;

      const result = parseWorkItem(content);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('002');
      expect(result?.assigned_agent).toBeUndefined();
      expect(result?.content).toBe('Task description here.');
    });

    it('should handle empty outputs object', () => {
      const content = `---
id: "003"
title: "No outputs"
type: bug
status: ready
rejection_count: 0
dependencies: []
outputs: {}
created_at: "2026-01-15T00:00:00Z"
updated_at: "2026-01-15T00:00:00Z"
stage: briefings
---

Bug description.`;

      const result = parseWorkItem(content);

      expect(result).not.toBeNull();
      expect(result?.outputs).toEqual({});
    });

    it('should handle outputs with only some fields', () => {
      const content = `---
id: "004"
title: "Partial outputs"
type: enhancement
status: ready
rejection_count: 0
dependencies: []
outputs:
  impl: "src/lib/enhancement.ts"
created_at: "2026-01-15T00:00:00Z"
updated_at: "2026-01-15T00:00:00Z"
stage: briefings
---

Enhancement details.`;

      const result = parseWorkItem(content);

      expect(result).not.toBeNull();
      expect(result?.outputs.impl).toBe('src/lib/enhancement.ts');
      expect(result?.outputs.test).toBeUndefined();
      expect(result?.outputs.types).toBeUndefined();
    });

    it('should handle empty dependencies array', () => {
      const content = `---
id: "005"
title: "No dependencies"
type: task
status: ready
rejection_count: 0
dependencies: []
outputs: {}
created_at: "2026-01-15T00:00:00Z"
updated_at: "2026-01-15T00:00:00Z"
stage: briefings
---

Content.`;

      const result = parseWorkItem(content);

      expect(result).not.toBeNull();
      expect(result?.dependencies).toEqual([]);
    });

    it('should handle multiline content', () => {
      const content = `---
id: "006"
title: "Multiline content"
type: feature
status: ready
rejection_count: 0
dependencies: []
outputs: {}
created_at: "2026-01-15T00:00:00Z"
updated_at: "2026-01-15T00:00:00Z"
stage: briefings
---

This is line one.

This is line two with a blank line above.

- Bullet point
- Another point`;

      const result = parseWorkItem(content);

      expect(result).not.toBeNull();
      expect(result?.content).toContain('This is line one.');
      expect(result?.content).toContain('This is line two');
      expect(result?.content).toContain('- Bullet point');
    });

    it('should handle empty content body', () => {
      const content = `---
id: "007"
title: "Empty body"
type: task
status: ready
rejection_count: 0
dependencies: []
outputs: {}
created_at: "2026-01-15T00:00:00Z"
updated_at: "2026-01-15T00:00:00Z"
stage: briefings
---
`;

      const result = parseWorkItem(content);

      expect(result).not.toBeNull();
      expect(result?.content).toBe('');
    });
  });

  describe('missing required fields', () => {
    it('should return null when id is missing', () => {
      const content = `---
title: "No ID"
type: feature
status: ready
rejection_count: 0
dependencies: []
outputs: {}
created_at: "2026-01-15T00:00:00Z"
updated_at: "2026-01-15T00:00:00Z"
stage: briefings
---

Content.`;

      const result = parseWorkItem(content);

      expect(result).toBeNull();
    });

    it('should return null when title is missing', () => {
      const content = `---
id: "008"
type: feature
status: ready
rejection_count: 0
dependencies: []
outputs: {}
created_at: "2026-01-15T00:00:00Z"
updated_at: "2026-01-15T00:00:00Z"
stage: briefings
---

Content.`;

      const result = parseWorkItem(content);

      expect(result).toBeNull();
    });

    it('should return null when type is missing', () => {
      const content = `---
id: "009"
title: "No type"
status: ready
rejection_count: 0
dependencies: []
outputs: {}
created_at: "2026-01-15T00:00:00Z"
updated_at: "2026-01-15T00:00:00Z"
stage: briefings
---

Content.`;

      const result = parseWorkItem(content);

      expect(result).toBeNull();
    });
  });

  describe('malformed YAML', () => {
    it('should return null for invalid YAML syntax', () => {
      const content = `---
id: "010"
title: "Bad YAML
type: feature
---

Content.`;

      const result = parseWorkItem(content);

      expect(result).toBeNull();
    });

    it('should return null for missing frontmatter delimiters', () => {
      const content = `id: "011"
title: "No delimiters"
type: feature

Content.`;

      const result = parseWorkItem(content);

      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = parseWorkItem('');

      expect(result).toBeNull();
    });

    it('should return null for malformed frontmatter structure', () => {
      const content = `---
this is not valid yaml structure at all
---

Content.`;

      const result = parseWorkItem(content);

      expect(result).toBeNull();
    });
  });

  describe('missing optional fields', () => {
    it('should handle work item without dependencies field (defaults to empty array)', () => {
      // This is the exact format used by item 001 in e2e-regression.sh
      // which was causing it to be invisible on the board
      const content = `---
id: '001'
title: User authentication system
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/auth.test.ts
  impl: src/services/auth.ts
---
## Objective

Implement user authentication with JWT tokens.`;

      const result = parseWorkItem(content);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('001');
      expect(result?.title).toBe('User authentication system');
      expect(result?.dependencies).toEqual([]);
    });

    it('should handle work item without outputs field (defaults to empty object)', () => {
      const content = `---
id: '002'
title: Simple task
type: task
status: pending
rejection_count: 0
dependencies: []
---
Simple task content.`;

      const result = parseWorkItem(content);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('002');
      expect(result?.outputs).toEqual({});
    });
  });

  describe('edge cases', () => {
    it('should handle rejection_count of 0', () => {
      const content = `---
id: "012"
title: "Zero rejections"
type: task
status: ready
rejection_count: 0
dependencies: []
outputs: {}
created_at: "2026-01-15T00:00:00Z"
updated_at: "2026-01-15T00:00:00Z"
stage: briefings
---

Content.`;

      const result = parseWorkItem(content);

      expect(result).not.toBeNull();
      expect(result?.rejection_count).toBe(0);
    });

    it('should handle all work item types', () => {
      const types: WorkItem['type'][] = ['feature', 'bug', 'enhancement', 'task'];

      types.forEach((type) => {
        const content = `---
id: "013"
title: "Test type"
type: ${type}
status: ready
rejection_count: 0
dependencies: []
outputs: {}
created_at: "2026-01-15T00:00:00Z"
updated_at: "2026-01-15T00:00:00Z"
stage: briefings
---

Content.`;

        const result = parseWorkItem(content);

        expect(result).not.toBeNull();
        expect(result?.type).toBe(type);
      });
    });

    it('should handle all stage values', () => {
      const stages: WorkItem['stage'][] = [
        'briefings',
        'ready',
        'testing',
        'implementing',
        'review',
        'done',
        'blocked',
      ];

      stages.forEach((stage) => {
        const content = `---
id: "014"
title: "Test stage"
type: task
status: ready
rejection_count: 0
dependencies: []
outputs: {}
created_at: "2026-01-15T00:00:00Z"
updated_at: "2026-01-15T00:00:00Z"
stage: ${stage}
---

Content.`;

        const result = parseWorkItem(content);

        expect(result).not.toBeNull();
        expect(result?.stage).toBe(stage);
      });
    });
  });
});
