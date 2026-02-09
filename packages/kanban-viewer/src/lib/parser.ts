/**
 * Markdown parser for work items with YAML frontmatter
 */

import matter from 'gray-matter';
import type { WorkItem, WorkItemFrontmatterType, Stage, AgentName } from '../types';

/**
 * Parses a markdown file content string into a WorkItem object
 *
 * @param fileContent - Raw markdown file content with YAML frontmatter
 * @returns Parsed WorkItem object, or null if parsing fails or required fields are missing
 */
export function parseWorkItem(fileContent: string): WorkItem | null {
  try {
    // Parse the frontmatter and content using gray-matter
    const parsed = matter(fileContent);
    const frontmatter = parsed.data;
    const content = parsed.content.trim();

    // Validate required fields are present
    if (!frontmatter.id || !frontmatter.title || !frontmatter.type) {
      return null;
    }

    // Validate required fields that could be missing
    // Note: dependencies and outputs are optional and default to empty
    if (
      frontmatter.status === undefined ||
      frontmatter.rejection_count === undefined
    ) {
      return null;
    }

    // Default optional fields
    const dependencies = frontmatter.dependencies ?? [];
    const outputs = frontmatter.outputs ?? {};

    // Default values for optional timestamp and stage fields
    const now = new Date().toISOString();
    const created_at = frontmatter.created_at || now;
    const updated_at = frontmatter.updated_at || now;
    const stage = (frontmatter.stage as Stage) || 'briefings';

    // Construct the WorkItem object
    const workItem: WorkItem = {
      id: frontmatter.id,
      title: frontmatter.title,
      type: frontmatter.type as WorkItemFrontmatterType,
      status: frontmatter.status,
      rejection_count: frontmatter.rejection_count,
      dependencies,
      outputs: {
        test: outputs.test,
        impl: outputs.impl,
        types: outputs.types,
      },
      created_at,
      updated_at,
      stage,
      content,
    };

    // Add optional assigned_agent if present
    if (frontmatter.assigned_agent) {
      workItem.assigned_agent = frontmatter.assigned_agent as AgentName;
    }

    return workItem;
  } catch {
    // Return null for any parsing errors (malformed YAML, etc.)
    return null;
  }
}
