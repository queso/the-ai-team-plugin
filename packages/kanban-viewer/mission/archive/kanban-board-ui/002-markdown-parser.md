---
id: "002"
title: "Markdown file parser with YAML frontmatter"
type: "feature"
status: "pending"
dependencies: ["001"]
parallel_group: "data-layer"
rejection_count: 0
outputs:
  types: "src/lib/parser.ts"
  test: "src/__tests__/parser.test.ts"
  impl: "src/lib/parser.ts"
---

## Objective

Create a utility function to parse markdown files with YAML frontmatter into WorkItem objects using the gray-matter library.

## Acceptance Criteria

- [ ] parseWorkItem function accepts file content string and returns WorkItem
- [ ] Correctly extracts all YAML frontmatter fields
- [ ] Correctly extracts markdown body as content field
- [ ] Handles missing optional fields gracefully (assigned_agent, outputs.types)
- [ ] Returns error or null for malformed YAML (no crash)
- [ ] Validates required fields are present (id, title, type)
- [ ] Uses gray-matter library for parsing

## Context

The parser is a critical path function - if it breaks, the entire app breaks. It must handle:

1. Valid markdown with complete frontmatter
2. Markdown with missing optional fields
3. Malformed YAML (should not crash)
4. Empty content body

Example input:
```yaml
---
id: "001"
title: "Example item"
type: "feature"
status: "ready"
dependencies: []
rejection_count: 0
outputs:
  impl: "src/example.ts"
---

# Notes
Some markdown content here.
```
