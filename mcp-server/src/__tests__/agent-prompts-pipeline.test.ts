import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Tests for WI-114: Pipeline stage skipping in Hannibal and Lynch agent prompts
 *
 * Bug: hannibal.md shows Lynch APPROVED -> done, skipping mandatory probing stage.
 * Bug: lynch.md has "Deep Investigation" for per-feature review, duplicating Amy's probing.
 *
 * The correct flow is: Lynch APPROVED -> probing (Amy) -> done
 */

const AGENTS_DIR = resolve(__dirname, '..', '..', '..', 'agents');
const hannibalPath = resolve(AGENTS_DIR, 'hannibal.md');
const lynchPath = resolve(AGENTS_DIR, 'lynch.md');

function readAgentFile(path: string): string {
  return readFileSync(path, 'utf-8');
}

describe('Agent prompts enforce mandatory pipeline stages', () => {
  describe('hannibal.md: No direct review->done transitions', () => {
    it('should not have board_move to "done" in the "Handling Approvals" section', () => {
      const content = readAgentFile(hannibalPath);

      // Extract the "Handling Approvals" section (## Handling Approvals ... next ## heading)
      const approvalsSectionMatch = content.match(
        /## Handling Approvals\n([\s\S]*?)(?=\n## |\n---\n|$)/
      );
      expect(approvalsSectionMatch).not.toBeNull();
      const approvalsSection = approvalsSectionMatch![1];

      // The approvals section should NOT contain board_move to "done" as the
      // immediate next step after Lynch approves. It should move to "probing".
      // Check for any board_move that goes directly to "done" in this section.
      const directToDone = /board_move\([^)]*to:\s*["']done["']/g;
      const matches = approvalsSection.match(directToDone);

      expect(matches).toBeNull();
    });

    it('should show probing stage between review and done in the "Handling Approvals" section', () => {
      const content = readAgentFile(hannibalPath);

      // Extract the "Handling Approvals" section
      const approvalsSectionMatch = content.match(
        /## Handling Approvals\n([\s\S]*?)(?=\n## |\n---\n|$)/
      );
      expect(approvalsSectionMatch).not.toBeNull();
      const approvalsSection = approvalsSectionMatch![1];

      // The section should reference moving to "probing" after Lynch approves
      const movesToProbing = /board_move\([^)]*to:\s*["']probing["']/;
      expect(approvalsSection).toMatch(movesToProbing);
    });

    it('should show probing stage in the concrete example (dependency waves section)', () => {
      const content = readAgentFile(hannibalPath);

      // Extract the concrete example section
      const concreteMatch = content.match(
        /### Concrete Example[^\n]*\n([\s\S]*?)(?=\n## |\n### [A-Z]|\n---\n|$)/
      );
      expect(concreteMatch).not.toBeNull();
      const concreteExample = concreteMatch![1];

      // The concrete example shows Lynch approving items then using board_move.
      // The pattern uses = for args: board_move(itemId="001", to="done")
      // After fix, the first move after Lynch approval should go to "probing",
      // not directly to "done".
      //
      // Find all instances where Lynch approves and check the NEXT board_move
      // for that item goes to "probing", not "done".

      // Match: "(Lynch approved" followed by board_move with to="<stage>"
      // The concrete example uses = syntax: to="done" or to="probing"
      const approvalMoves = [
        ...concreteExample.matchAll(
          /Lynch approved[^)]*\)\s*\n\s*.*?board_move\([^)]*to=["'](\w+)["']/g
        ),
      ];

      expect(approvalMoves.length).toBeGreaterThan(0);

      // Every Lynch approval should move to "probing", not "done"
      for (const match of approvalMoves) {
        expect(match[1]).toBe('probing');
      }
    });
  });

  describe('lynch.md: Deep Investigation scoped to Final Mission Review only', () => {
    it('should not have a per-feature Deep Investigation section that spawns Amy', () => {
      const content = readAgentFile(lynchPath);

      // The file has two conceptual parts:
      // 1. Per-feature review (before "# Final Mission Review")
      // 2. Final Mission Review (after "# Final Mission Review")
      //
      // The "Deep Investigation (Optional)" section that spawns Amy should NOT
      // exist in the per-feature review part. Amy is dispatched by Hannibal's
      // pipeline in the mandatory probing stage, so Lynch spawning Amy during
      // per-feature review creates duplicate investigation.

      const finalReviewHeading = content.indexOf('# Final Mission Review');
      expect(finalReviewHeading).toBeGreaterThan(-1);

      const perFeatureSection = content.slice(0, finalReviewHeading);

      // The per-feature section should NOT contain a "Deep Investigation" heading
      // that instructs Lynch to spawn Amy
      const hasDeepInvestigation = /## Deep Investigation/i.test(perFeatureSection);
      expect(hasDeepInvestigation).toBe(false);
    });
  });
});
