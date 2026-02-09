import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type {
  FinalReviewStatus,
  PostChecksStatus,
  DocumentationStatus,
  CheckResult,
  Mission,
} from '@/types';

import { MissionCompletionPanel, type MissionCompletionPanelProps } from '../components/mission-completion-panel';

// Factory functions for creating test data
function createMission(overrides: Partial<Mission> = {}): Mission {
  return {
    name: 'Test Mission',
    status: 'active',
    started_at: '2026-01-15T10:00:00Z',
    ...overrides,
  };
}

function createFinalReviewStatus(overrides: Partial<FinalReviewStatus> = {}): FinalReviewStatus {
  return {
    started_at: '2026-01-15T14:20:00Z',
    passed: false,
    agent: 'Lynch',
    rejections: 0,
    ...overrides,
  };
}

function createCheckResult(overrides: Partial<CheckResult> = {}): CheckResult {
  return {
    status: 'pending',
    ...overrides,
  };
}

function createPostChecksStatus(overrides: Partial<PostChecksStatus> = {}): PostChecksStatus {
  return {
    started_at: '2026-01-15T14:25:05Z',
    passed: false,
    results: {
      lint: createCheckResult(),
      typecheck: createCheckResult(),
      test: createCheckResult(),
      build: createCheckResult(),
    },
    ...overrides,
  };
}

function createDocumentationStatus(overrides: Partial<DocumentationStatus> = {}): DocumentationStatus {
  return {
    started_at: '2026-01-15T14:26:47Z',
    completed: false,
    agent: 'Tawnia',
    files_modified: [],
    ...overrides,
  };
}

function createProps(overrides: Partial<MissionCompletionPanelProps> = {}): MissionCompletionPanelProps {
  return {
    mission: createMission({ status: 'final_review' }),
    activeTab: 'completion',
    onTabChange: vi.fn(),
    ...overrides,
  };
}

describe('MissionCompletionPanel', () => {
  describe('panel rendering conditions', () => {
    it('should render when mission.status is final_review', () => {
      const props = createProps({
        mission: createMission({ status: 'final_review' }),
      });
      render(<MissionCompletionPanel {...props} />);

      expect(screen.getByTestId('mission-completion-panel')).toBeInTheDocument();
    });

    it('should render when mission.status is post_checks', () => {
      const props = createProps({
        mission: createMission({ status: 'post_checks' }),
      });
      render(<MissionCompletionPanel {...props} />);

      expect(screen.getByTestId('mission-completion-panel')).toBeInTheDocument();
    });

    it('should render when mission.status is documentation', () => {
      const props = createProps({
        mission: createMission({ status: 'documentation' }),
      });
      render(<MissionCompletionPanel {...props} />);

      expect(screen.getByTestId('mission-completion-panel')).toBeInTheDocument();
    });

    it('should render when mission.status is complete', () => {
      const props = createProps({
        mission: createMission({ status: 'complete' }),
      });
      render(<MissionCompletionPanel {...props} />);

      expect(screen.getByTestId('mission-completion-panel')).toBeInTheDocument();
    });

    it('should not render panel content when mission.status is active', () => {
      const props = createProps({
        mission: createMission({ status: 'active' }),
      });
      render(<MissionCompletionPanel {...props} />);

      expect(screen.queryByTestId('mission-completion-panel')).not.toBeInTheDocument();
    });
  });

  describe('three-phase pipeline visualization', () => {
    it('should display Final Review phase', () => {
      const props = createProps({
        mission: createMission({ status: 'final_review' }),
        finalReview: createFinalReviewStatus(),
      });
      render(<MissionCompletionPanel {...props} />);

      expect(screen.getByTestId('phase-final-review')).toBeInTheDocument();
      expect(screen.getByText(/Final Review/i)).toBeInTheDocument();
    });

    it('should display Post-Checks phase', () => {
      const props = createProps({
        mission: createMission({ status: 'post_checks' }),
        postChecks: createPostChecksStatus(),
      });
      render(<MissionCompletionPanel {...props} />);

      expect(screen.getByTestId('phase-post-checks')).toBeInTheDocument();
      expect(screen.getByText(/Post-Checks/i)).toBeInTheDocument();
    });

    it('should display Documentation phase', () => {
      const props = createProps({
        mission: createMission({ status: 'documentation' }),
        documentation: createDocumentationStatus(),
      });
      render(<MissionCompletionPanel {...props} />);

      expect(screen.getByTestId('phase-documentation')).toBeInTheDocument();
      expect(screen.getByText(/Documentation/i)).toBeInTheDocument();
    });

    it('should display all three phases in correct order', () => {
      const props = createProps({
        mission: createMission({ status: 'final_review' }),
      });
      render(<MissionCompletionPanel {...props} />);

      const phases = screen.getAllByTestId(/^phase-/);
      expect(phases).toHaveLength(3);

      // Verify order by checking test IDs
      expect(phases[0]).toHaveAttribute('data-testid', 'phase-final-review');
      expect(phases[1]).toHaveAttribute('data-testid', 'phase-post-checks');
      expect(phases[2]).toHaveAttribute('data-testid', 'phase-documentation');
    });

    it('should show arrows connecting phases', () => {
      const props = createProps({
        mission: createMission({ status: 'final_review' }),
      });
      render(<MissionCompletionPanel {...props} />);

      // Expect visual connectors between phases
      expect(screen.getAllByTestId('pipeline-connector')).toHaveLength(2);
    });
  });

  describe('phase status display', () => {
    it('should show Final Review phase as pending when not started', () => {
      const props = createProps({
        mission: createMission({ status: 'final_review' }),
        // No finalReview data provided
      });
      render(<MissionCompletionPanel {...props} />);

      const phase = screen.getByTestId('phase-final-review');
      expect(phase).toHaveAttribute('data-status', 'pending');
    });

    it('should show Final Review phase as active when in progress', () => {
      const props = createProps({
        mission: createMission({ status: 'final_review' }),
        finalReview: createFinalReviewStatus({
          started_at: '2026-01-15T14:20:00Z',
          passed: false,
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      const phase = screen.getByTestId('phase-final-review');
      expect(phase).toHaveAttribute('data-status', 'active');
    });

    it('should show Final Review phase as complete when passed', () => {
      const props = createProps({
        mission: createMission({ status: 'post_checks' }),
        finalReview: createFinalReviewStatus({
          passed: true,
          completed_at: '2026-01-15T14:25:03Z',
          verdict: 'APPROVED',
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      const phase = screen.getByTestId('phase-final-review');
      expect(phase).toHaveAttribute('data-status', 'complete');
    });

    it('should show Final Review phase as failed when not passed and completed', () => {
      const props = createProps({
        mission: createMission({ status: 'final_review' }),
        finalReview: createFinalReviewStatus({
          passed: false,
          completed_at: '2026-01-15T14:25:03Z',
          verdict: 'REJECTED',
          rejections: 2,
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      const phase = screen.getByTestId('phase-final-review');
      expect(phase).toHaveAttribute('data-status', 'failed');
    });

    it('should show Post-Checks phase as pending before post_checks phase', () => {
      const props = createProps({
        mission: createMission({ status: 'final_review' }),
      });
      render(<MissionCompletionPanel {...props} />);

      const phase = screen.getByTestId('phase-post-checks');
      expect(phase).toHaveAttribute('data-status', 'pending');
    });

    it('should show Post-Checks phase as active during post_checks phase', () => {
      const props = createProps({
        mission: createMission({ status: 'post_checks' }),
        postChecks: createPostChecksStatus(),
      });
      render(<MissionCompletionPanel {...props} />);

      const phase = screen.getByTestId('phase-post-checks');
      expect(phase).toHaveAttribute('data-status', 'active');
    });

    it('should show Post-Checks phase as complete when all checks pass', () => {
      const props = createProps({
        mission: createMission({ status: 'documentation' }),
        postChecks: createPostChecksStatus({
          passed: true,
          completed_at: '2026-01-15T14:26:45Z',
          results: {
            lint: createCheckResult({ status: 'passed' }),
            typecheck: createCheckResult({ status: 'passed' }),
            test: createCheckResult({ status: 'passed' }),
            build: createCheckResult({ status: 'passed' }),
          },
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      const phase = screen.getByTestId('phase-post-checks');
      expect(phase).toHaveAttribute('data-status', 'complete');
    });

    it('should show Post-Checks phase as failed when any check fails', () => {
      const props = createProps({
        mission: createMission({ status: 'post_checks' }),
        postChecks: createPostChecksStatus({
          passed: false,
          completed_at: '2026-01-15T14:26:45Z',
          results: {
            lint: createCheckResult({ status: 'passed' }),
            typecheck: createCheckResult({ status: 'failed' }),
            test: createCheckResult({ status: 'pending' }),
            build: createCheckResult({ status: 'pending' }),
          },
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      const phase = screen.getByTestId('phase-post-checks');
      expect(phase).toHaveAttribute('data-status', 'failed');
    });

    it('should show Documentation phase as pending before documentation phase', () => {
      const props = createProps({
        mission: createMission({ status: 'post_checks' }),
      });
      render(<MissionCompletionPanel {...props} />);

      const phase = screen.getByTestId('phase-documentation');
      expect(phase).toHaveAttribute('data-status', 'pending');
    });

    it('should show Documentation phase as active during documentation phase', () => {
      const props = createProps({
        mission: createMission({ status: 'documentation' }),
        documentation: createDocumentationStatus({
          started_at: '2026-01-15T14:26:47Z',
          completed: false,
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      const phase = screen.getByTestId('phase-documentation');
      expect(phase).toHaveAttribute('data-status', 'active');
    });

    it('should show Documentation phase as complete when finished', () => {
      const props = createProps({
        mission: createMission({ status: 'complete' }),
        documentation: createDocumentationStatus({
          completed: true,
          completed_at: '2026-01-15T14:28:12Z',
          commit: 'a1b2c3d',
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      const phase = screen.getByTestId('phase-documentation');
      expect(phase).toHaveAttribute('data-status', 'complete');
    });
  });

  describe('Final Review phase details', () => {
    it('should display Lynch as the reviewing agent', () => {
      const props = createProps({
        mission: createMission({ status: 'final_review' }),
        finalReview: createFinalReviewStatus({ agent: 'Lynch' }),
      });
      render(<MissionCompletionPanel {...props} />);

      expect(screen.getByText(/Lynch/)).toBeInTheDocument();
    });

    it('should display APPROVED verdict when passed', () => {
      const props = createProps({
        mission: createMission({ status: 'post_checks' }),
        finalReview: createFinalReviewStatus({
          passed: true,
          verdict: 'APPROVED',
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      expect(screen.getByText(/APPROVED/)).toBeInTheDocument();
    });

    it('should display REJECTED verdict when failed', () => {
      const props = createProps({
        mission: createMission({ status: 'final_review' }),
        finalReview: createFinalReviewStatus({
          passed: false,
          verdict: 'REJECTED',
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      expect(screen.getByText(/REJECTED/)).toBeInTheDocument();
    });

    it('should display rejection count when items were rejected', () => {
      const props = createProps({
        mission: createMission({ status: 'final_review' }),
        finalReview: createFinalReviewStatus({
          passed: false,
          verdict: 'REJECTED',
          rejections: 3,
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      expect(screen.getByTestId('rejection-count')).toHaveTextContent('3');
    });

    it('should display "reviewing..." text when in progress', () => {
      const props = createProps({
        mission: createMission({ status: 'final_review' }),
        finalReview: createFinalReviewStatus({
          started_at: '2026-01-15T14:20:00Z',
          passed: false,
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      expect(screen.getByText(/reviewing/i)).toBeInTheDocument();
    });

    it('should display completion timestamp when complete', () => {
      const props = createProps({
        mission: createMission({ status: 'post_checks' }),
        finalReview: createFinalReviewStatus({
          passed: true,
          completed_at: '2026-01-15T14:25:03Z',
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      expect(screen.getByText(/14:25:03/)).toBeInTheDocument();
    });
  });

  describe('Post-Checks phase details', () => {
    it('should display lint check status', () => {
      const props = createProps({
        mission: createMission({ status: 'post_checks' }),
        postChecks: createPostChecksStatus({
          results: {
            lint: createCheckResult({ status: 'passed' }),
            typecheck: createCheckResult({ status: 'pending' }),
            test: createCheckResult({ status: 'pending' }),
            build: createCheckResult({ status: 'pending' }),
          },
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      expect(screen.getByTestId('check-lint')).toBeInTheDocument();
      expect(screen.getByTestId('check-lint')).toHaveAttribute('data-status', 'passed');
    });

    it('should display typecheck status', () => {
      const props = createProps({
        mission: createMission({ status: 'post_checks' }),
        postChecks: createPostChecksStatus({
          results: {
            lint: createCheckResult({ status: 'passed' }),
            typecheck: createCheckResult({ status: 'running' }),
            test: createCheckResult({ status: 'pending' }),
            build: createCheckResult({ status: 'pending' }),
          },
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      expect(screen.getByTestId('check-typecheck')).toBeInTheDocument();
      expect(screen.getByTestId('check-typecheck')).toHaveAttribute('data-status', 'running');
    });

    it('should display test check status', () => {
      const props = createProps({
        mission: createMission({ status: 'post_checks' }),
        postChecks: createPostChecksStatus({
          results: {
            lint: createCheckResult({ status: 'passed' }),
            typecheck: createCheckResult({ status: 'passed' }),
            test: createCheckResult({ status: 'running' }),
            build: createCheckResult({ status: 'pending' }),
          },
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      expect(screen.getByTestId('check-test')).toBeInTheDocument();
      expect(screen.getByTestId('check-test')).toHaveAttribute('data-status', 'running');
    });

    it('should display build check status', () => {
      const props = createProps({
        mission: createMission({ status: 'post_checks' }),
        postChecks: createPostChecksStatus({
          results: {
            lint: createCheckResult({ status: 'passed' }),
            typecheck: createCheckResult({ status: 'passed' }),
            test: createCheckResult({ status: 'passed' }),
            build: createCheckResult({ status: 'running' }),
          },
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      expect(screen.getByTestId('check-build')).toBeInTheDocument();
      expect(screen.getByTestId('check-build')).toHaveAttribute('data-status', 'running');
    });

    it('should show checkmark icon for passed checks', () => {
      const props = createProps({
        mission: createMission({ status: 'post_checks' }),
        postChecks: createPostChecksStatus({
          results: {
            lint: createCheckResult({ status: 'passed' }),
            typecheck: createCheckResult({ status: 'pending' }),
            test: createCheckResult({ status: 'pending' }),
            build: createCheckResult({ status: 'pending' }),
          },
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      const lintCheck = screen.getByTestId('check-lint');
      expect(lintCheck.querySelector('[data-icon="check"]')).toBeInTheDocument();
    });

    it('should show X icon for failed checks', () => {
      const props = createProps({
        mission: createMission({ status: 'post_checks' }),
        postChecks: createPostChecksStatus({
          passed: false,
          results: {
            lint: createCheckResult({ status: 'passed' }),
            typecheck: createCheckResult({ status: 'failed' }),
            test: createCheckResult({ status: 'pending' }),
            build: createCheckResult({ status: 'pending' }),
          },
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      const typecheckCheck = screen.getByTestId('check-typecheck');
      expect(typecheckCheck.querySelector('[data-icon="x"]')).toBeInTheDocument();
    });

    it('should show pending icon for pending checks', () => {
      const props = createProps({
        mission: createMission({ status: 'post_checks' }),
        postChecks: createPostChecksStatus({
          results: {
            lint: createCheckResult({ status: 'pending' }),
            typecheck: createCheckResult({ status: 'pending' }),
            test: createCheckResult({ status: 'pending' }),
            build: createCheckResult({ status: 'pending' }),
          },
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      const lintCheck = screen.getByTestId('check-lint');
      expect(lintCheck.querySelector('[data-icon="pending"]')).toBeInTheDocument();
    });

    it('should show running indicator for running checks', () => {
      const props = createProps({
        mission: createMission({ status: 'post_checks' }),
        postChecks: createPostChecksStatus({
          results: {
            lint: createCheckResult({ status: 'passed' }),
            typecheck: createCheckResult({ status: 'running' }),
            test: createCheckResult({ status: 'pending' }),
            build: createCheckResult({ status: 'pending' }),
          },
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      const typecheckCheck = screen.getByTestId('check-typecheck');
      expect(typecheckCheck.querySelector('[data-icon="running"]')).toBeInTheDocument();
    });
  });

  describe('Documentation phase details', () => {
    it('should display Tawnia as the documenting agent', () => {
      const props = createProps({
        mission: createMission({ status: 'documentation' }),
        documentation: createDocumentationStatus({ agent: 'Tawnia' }),
      });
      render(<MissionCompletionPanel {...props} />);

      expect(screen.getByText(/Tawnia/)).toBeInTheDocument();
    });

    it('should display "writing..." when in progress', () => {
      const props = createProps({
        mission: createMission({ status: 'documentation' }),
        documentation: createDocumentationStatus({
          completed: false,
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      expect(screen.getByText(/writing/i)).toBeInTheDocument();
    });

    it('should display list of modified files', () => {
      const props = createProps({
        mission: createMission({ status: 'complete' }),
        documentation: createDocumentationStatus({
          completed: true,
          files_modified: ['CHANGELOG.md', 'README.md', 'docs/features/auth.md'],
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      expect(screen.getByText('CHANGELOG.md')).toBeInTheDocument();
      expect(screen.getByText('README.md')).toBeInTheDocument();
      expect(screen.getByText('docs/features/auth.md')).toBeInTheDocument();
    });

    it('should display commit hash when complete', () => {
      const props = createProps({
        mission: createMission({ status: 'complete' }),
        documentation: createDocumentationStatus({
          completed: true,
          commit: 'a1b2c3d',
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      expect(screen.getByText('a1b2c3d')).toBeInTheDocument();
    });

    it('should display "COMMITTED" status when complete', () => {
      const props = createProps({
        mission: createMission({ status: 'complete' }),
        documentation: createDocumentationStatus({
          completed: true,
          commit: 'a1b2c3d',
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      expect(screen.getByText(/COMMITTED/)).toBeInTheDocument();
    });

    it('should display "waiting" when documentation phase has not started', () => {
      const props = createProps({
        mission: createMission({ status: 'post_checks' }),
      });
      render(<MissionCompletionPanel {...props} />);

      const docPhase = screen.getByTestId('phase-documentation');
      expect(docPhase).toHaveTextContent(/waiting/i);
    });
  });

  describe('failed state display', () => {
    it('should show failure card when post-checks fail', () => {
      const props = createProps({
        mission: createMission({ status: 'post_checks' }),
        postChecks: createPostChecksStatus({
          passed: false,
          completed_at: '2026-01-15T14:26:45Z',
          results: {
            lint: createCheckResult({ status: 'passed' }),
            typecheck: createCheckResult({ status: 'passed' }),
            test: createCheckResult({ status: 'failed' }),
            build: createCheckResult({ status: 'pending' }),
          },
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      expect(screen.getByTestId('failure-card')).toBeInTheDocument();
    });

    it('should display failing check name in failure card', () => {
      const props = createProps({
        mission: createMission({ status: 'post_checks' }),
        postChecks: createPostChecksStatus({
          passed: false,
          completed_at: '2026-01-15T14:26:45Z',
          results: {
            lint: createCheckResult({ status: 'passed' }),
            typecheck: createCheckResult({ status: 'passed' }),
            test: createCheckResult({ status: 'failed' }),
            build: createCheckResult({ status: 'pending' }),
          },
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      expect(screen.getByTestId('failure-card')).toHaveTextContent(/test/i);
    });

    it('should show warning icon in failure state', () => {
      const props = createProps({
        mission: createMission({ status: 'post_checks' }),
        postChecks: createPostChecksStatus({
          passed: false,
          completed_at: '2026-01-15T14:26:45Z',
          results: {
            lint: createCheckResult({ status: 'failed' }),
            typecheck: createCheckResult({ status: 'pending' }),
            test: createCheckResult({ status: 'pending' }),
            build: createCheckResult({ status: 'pending' }),
          },
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      expect(screen.getByTestId('failure-card').querySelector('[data-icon="warning"]')).toBeInTheDocument();
    });

    it('should show blocked state for Documentation when post-checks fail', () => {
      const props = createProps({
        mission: createMission({ status: 'post_checks' }),
        postChecks: createPostChecksStatus({
          passed: false,
          completed_at: '2026-01-15T14:26:45Z',
          results: {
            lint: createCheckResult({ status: 'passed' }),
            typecheck: createCheckResult({ status: 'failed' }),
            test: createCheckResult({ status: 'pending' }),
            build: createCheckResult({ status: 'pending' }),
          },
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      const docPhase = screen.getByTestId('phase-documentation');
      expect(docPhase).toHaveTextContent(/blocked/i);
    });
  });

  describe('complete state summary card', () => {
    it('should display summary card when mission is complete', () => {
      const props = createProps({
        mission: createMission({ status: 'complete', completed_at: '2026-01-15T14:28:12Z' }),
        finalReview: createFinalReviewStatus({ passed: true, verdict: 'APPROVED' }),
        postChecks: createPostChecksStatus({
          passed: true,
          results: {
            lint: createCheckResult({ status: 'passed' }),
            typecheck: createCheckResult({ status: 'passed' }),
            test: createCheckResult({ status: 'passed' }),
            build: createCheckResult({ status: 'passed' }),
          },
        }),
        documentation: createDocumentationStatus({
          completed: true,
          commit: 'a1b2c3d',
          summary: 'Updated CHANGELOG with 4 entries',
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      expect(screen.getByTestId('completion-summary-card')).toBeInTheDocument();
    });

    it('should display MISSION COMPLETE text', () => {
      const props = createProps({
        mission: createMission({ status: 'complete' }),
        documentation: createDocumentationStatus({
          completed: true,
          commit: 'a1b2c3d',
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      expect(screen.getByText(/MISSION COMPLETE/)).toBeInTheDocument();
    });

    it('should display commit hash in summary card', () => {
      const props = createProps({
        mission: createMission({ status: 'complete' }),
        documentation: createDocumentationStatus({
          completed: true,
          commit: 'a1b2c3d',
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      const summaryCard = screen.getByTestId('completion-summary-card');
      expect(summaryCard).toHaveTextContent('a1b2c3d');
    });

    it('should display documentation summary in summary card', () => {
      const props = createProps({
        mission: createMission({ status: 'complete' }),
        documentation: createDocumentationStatus({
          completed: true,
          commit: 'a1b2c3d',
          summary: 'Updated CHANGELOG with 4 entries, added feature docs',
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      const summaryCard = screen.getByTestId('completion-summary-card');
      expect(summaryCard).toHaveTextContent('Updated CHANGELOG with 4 entries');
    });

    it('should display list of documented files in summary', () => {
      const props = createProps({
        mission: createMission({ status: 'complete' }),
        documentation: createDocumentationStatus({
          completed: true,
          commit: 'a1b2c3d',
          files_modified: ['CHANGELOG.md', 'README.md'],
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      const summaryCard = screen.getByTestId('completion-summary-card');
      expect(summaryCard).toHaveTextContent('CHANGELOG.md');
      expect(summaryCard).toHaveTextContent('README.md');
    });

    it('should display checkmark icon in complete state', () => {
      const props = createProps({
        mission: createMission({ status: 'complete' }),
        documentation: createDocumentationStatus({
          completed: true,
          commit: 'a1b2c3d',
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      const summaryCard = screen.getByTestId('completion-summary-card');
      expect(summaryCard.querySelector('[data-icon="check-circle"]')).toBeInTheDocument();
    });
  });

  describe('tab integration', () => {
    it('should render as a tab with label "Completion"', () => {
      const props = createProps({
        mission: createMission({ status: 'final_review' }),
      });
      render(<MissionCompletionPanel {...props} />);

      expect(screen.getByRole('tab', { name: /Completion/i })).toBeInTheDocument();
    });

    it('should show tab as active when activeTab is completion', () => {
      const props = createProps({
        mission: createMission({ status: 'final_review' }),
        activeTab: 'completion',
      });
      render(<MissionCompletionPanel {...props} />);

      const completionTab = screen.getByRole('tab', { name: /Completion/i });
      expect(completionTab).toHaveAttribute('data-state', 'active');
    });

    it('should call onTabChange when Completion tab is clicked', () => {
      const onTabChange = vi.fn();
      const props = createProps({
        mission: createMission({ status: 'final_review' }),
        activeTab: 'live-feed',
        onTabChange,
      });
      render(<MissionCompletionPanel {...props} />);

      const completionTab = screen.getByRole('tab', { name: /Completion/i });
      completionTab.focus();
      fireEvent.keyDown(completionTab, { key: 'Enter' });

      expect(onTabChange).toHaveBeenCalledWith('completion');
    });

    it('should display panel content when activeTab is completion', () => {
      const props = createProps({
        mission: createMission({ status: 'final_review' }),
        activeTab: 'completion',
      });
      render(<MissionCompletionPanel {...props} />);

      expect(screen.getByTestId('mission-completion-panel')).toBeInTheDocument();
    });

    it('should not display panel content when activeTab is not completion', () => {
      const props = createProps({
        mission: createMission({ status: 'final_review' }),
        activeTab: 'live-feed',
      });
      render(<MissionCompletionPanel {...props} />);

      // Tab should still be visible but content should not be shown
      expect(screen.getByRole('tab', { name: /Completion/i })).toBeInTheDocument();
      expect(screen.queryByTestId('mission-completion-panel')).not.toBeInTheDocument();
    });
  });

  describe('empty state handling', () => {
    it('should handle missing finalReview data gracefully', () => {
      const props = createProps({
        mission: createMission({ status: 'final_review' }),
        finalReview: undefined,
      });

      // Should not throw
      expect(() => render(<MissionCompletionPanel {...props} />)).not.toThrow();
    });

    it('should handle missing postChecks data gracefully', () => {
      const props = createProps({
        mission: createMission({ status: 'post_checks' }),
        postChecks: undefined,
      });

      expect(() => render(<MissionCompletionPanel {...props} />)).not.toThrow();
    });

    it('should handle missing documentation data gracefully', () => {
      const props = createProps({
        mission: createMission({ status: 'documentation' }),
        documentation: undefined,
      });

      expect(() => render(<MissionCompletionPanel {...props} />)).not.toThrow();
    });
  });

  describe('visual styling', () => {
    it('should use purple color for Lynch agent indicator', () => {
      const props = createProps({
        mission: createMission({ status: 'final_review' }),
        finalReview: createFinalReviewStatus({ agent: 'Lynch' }),
      });
      render(<MissionCompletionPanel {...props} />);

      const agentIndicator = screen.getByTestId('agent-indicator-Lynch');
      // Purple is Lynch's color (#A855F7 or text-purple-*)
      expect(agentIndicator).toHaveClass(/purple/);
    });

    it('should use teal color for Tawnia agent indicator', () => {
      const props = createProps({
        mission: createMission({ status: 'documentation' }),
        documentation: createDocumentationStatus({ agent: 'Tawnia' }),
      });
      render(<MissionCompletionPanel {...props} />);

      const agentIndicator = screen.getByTestId('agent-indicator-Tawnia');
      // Teal is Tawnia's color (#14B8A6 or text-teal-*)
      expect(agentIndicator).toHaveClass(/teal/);
    });

    it('should use green color for passed/complete status', () => {
      const props = createProps({
        mission: createMission({ status: 'post_checks' }),
        finalReview: createFinalReviewStatus({
          passed: true,
          verdict: 'APPROVED',
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      const phase = screen.getByTestId('phase-final-review');
      // Green for success
      expect(phase).toHaveClass(/green/);
    });

    it('should use red color for failed status', () => {
      const props = createProps({
        mission: createMission({ status: 'post_checks' }),
        postChecks: createPostChecksStatus({
          passed: false,
          completed_at: '2026-01-15T14:26:45Z',
          results: {
            lint: createCheckResult({ status: 'failed' }),
            typecheck: createCheckResult({ status: 'pending' }),
            test: createCheckResult({ status: 'pending' }),
            build: createCheckResult({ status: 'pending' }),
          },
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      const phase = screen.getByTestId('phase-post-checks');
      expect(phase).toHaveClass(/red/);
    });

    it('should use yellow color for active/running status', () => {
      const props = createProps({
        mission: createMission({ status: 'post_checks' }),
        postChecks: createPostChecksStatus({
          results: {
            lint: createCheckResult({ status: 'running' }),
            typecheck: createCheckResult({ status: 'pending' }),
            test: createCheckResult({ status: 'pending' }),
            build: createCheckResult({ status: 'pending' }),
          },
        }),
      });
      render(<MissionCompletionPanel {...props} />);

      const lintCheck = screen.getByTestId('check-lint');
      expect(lintCheck).toHaveClass(/yellow|amber/);
    });
  });
});
