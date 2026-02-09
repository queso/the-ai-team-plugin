import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkItemModal } from '../components/work-item-modal';
import type { WorkItem, RejectionHistoryEntry } from '../types';

const createWorkItem = (overrides: Partial<WorkItem> = {}): WorkItem => ({
  id: '042',
  title: 'Implement Authentication Flow',
  type: 'feature',
  status: 'implementing',
  assigned_agent: 'B.A.',
  rejection_count: 0,
  dependencies: ['001', '003'],
  outputs: {
    impl: 'src/services/auth.ts',
    test: 'src/__tests__/auth.test.ts',
    types: 'src/types/auth.ts',
  },
  created_at: '2026-01-15T10:30:00Z',
  updated_at: '2026-01-15T14:20:00Z',
  stage: 'implementing',
  content: '## Objective\n\nImplement secure authentication flow.\n\n## Acceptance Criteria\n\n- [ ] User can login with email/password\n- [ ] Token refresh works automatically\n- [x] Logout clears all session data',
  ...overrides,
});

const createRejectionHistory = (): RejectionHistoryEntry[] => [
  { number: 1, reason: 'Missing unit tests for edge cases', agent: 'Murdock' },
  { number: 2, reason: 'Security vulnerability in token storage', agent: 'Hannibal' },
];

describe('WorkItemModal', () => {
  describe('open/close behavior', () => {
    it('should render modal content when isOpen is true', () => {
      const item = createWorkItem();
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      expect(screen.getByText('Implement Authentication Flow')).toBeInTheDocument();
    });

    it('should not render modal content when isOpen is false', () => {
      const item = createWorkItem();
      render(<WorkItemModal isOpen={false} onClose={() => {}} item={item} />);

      expect(screen.queryByText('Implement Authentication Flow')).not.toBeInTheDocument();
    });

    it('should call onClose when close button (X) is clicked', () => {
      const handleClose = vi.fn();
      const item = createWorkItem();
      render(<WorkItemModal isOpen={true} onClose={handleClose} item={item} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when clicking outside modal (overlay)', () => {
      const handleClose = vi.fn();
      const item = createWorkItem();
      render(<WorkItemModal isOpen={true} onClose={handleClose} item={item} />);

      const overlay = document.querySelector('[data-slot="dialog-overlay"]');
      expect(overlay).toBeInTheDocument();
      fireEvent.click(overlay!);

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when ESC key is pressed', () => {
      const handleClose = vi.fn();
      const item = createWorkItem();
      render(<WorkItemModal isOpen={true} onClose={handleClose} item={item} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('header section', () => {
    it('should display work item ID formatted with leading zeros', () => {
      const item = createWorkItem({ id: '7' });
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      expect(screen.getByText(/007/)).toBeInTheDocument();
    });

    it('should display work item ID for larger numbers', () => {
      const item = createWorkItem({ id: '142' });
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      expect(screen.getByText(/142/)).toBeInTheDocument();
    });

    it('should display type tag with correct text', () => {
      const item = createWorkItem({ type: 'feature' });
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      expect(screen.getByText('feature')).toBeInTheDocument();
    });

    it('should display type tag for bug type', () => {
      const item = createWorkItem({ type: 'bug' });
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      expect(screen.getByText('bug')).toBeInTheDocument();
    });

    it('should display current status', () => {
      const item = createWorkItem({ status: 'implementing' });
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      expect(screen.getByText(/implementing/i)).toBeInTheDocument();
    });

    it('should render close button in header', () => {
      const item = createWorkItem();
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });
  });

  describe('title bar section', () => {
    it('should display the work item title', () => {
      const item = createWorkItem({ title: 'Auth Service Implementation' });
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      expect(screen.getByText('Auth Service Implementation')).toBeInTheDocument();
    });

    it('should display assigned agent name', () => {
      const item = createWorkItem({ assigned_agent: 'B.A.' });
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      expect(screen.getByText(/B\.A\./)).toBeInTheDocument();
    });

    it('should display agent status dot when agent is assigned', () => {
      const item = createWorkItem({ assigned_agent: 'Murdock' });
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      const agentDot = screen.getByTestId('agent-status-dot');
      expect(agentDot).toBeInTheDocument();
    });

    it('should not display agent section when no agent assigned', () => {
      const item = createWorkItem({ assigned_agent: undefined });
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      expect(screen.queryByTestId('agent-status-dot')).not.toBeInTheDocument();
    });

    it('should display rejection count badge when rejections > 0', () => {
      const item = createWorkItem({ rejection_count: 3 });
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      const rejectionBadge = screen.getByTestId('rejection-count-badge');
      expect(rejectionBadge).toBeInTheDocument();
      expect(rejectionBadge).toHaveTextContent('3');
    });

    it('should not display rejection count badge when rejections is 0', () => {
      const item = createWorkItem({ rejection_count: 0 });
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      expect(screen.queryByTestId('rejection-count-badge')).not.toBeInTheDocument();
    });
  });

  describe('objective section', () => {
    it('should display objective section heading', () => {
      const item = createWorkItem();
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      expect(screen.getByText('Objective')).toBeInTheDocument();
    });

    it('should render content description', () => {
      const item = createWorkItem({ content: '## Objective\n\nImplement secure authentication flow.' });
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      expect(screen.getByText(/Implement secure authentication flow/)).toBeInTheDocument();
    });

    it('should handle empty content gracefully', () => {
      const item = createWorkItem({ content: '' });
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      expect(screen.getByText('Implement Authentication Flow')).toBeInTheDocument();
    });
  });

  describe('acceptance criteria section', () => {
    it('should display acceptance criteria section when present in content', () => {
      const item = createWorkItem({
        content: '## Acceptance Criteria\n\n- [ ] First criterion\n- [x] Second criterion',
      });
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      expect(screen.getByText('Acceptance Criteria')).toBeInTheDocument();
    });

    it('should render unchecked checklist items', () => {
      const item = createWorkItem({
        content: '## Acceptance Criteria\n\n- [ ] User can login with email/password',
      });
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      expect(screen.getByText(/User can login with email\/password/)).toBeInTheDocument();
    });

    it('should render checked checklist items', () => {
      const item = createWorkItem({
        content: '## Acceptance Criteria\n\n- [x] Logout clears all session data',
      });
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      expect(screen.getByText(/Logout clears all session data/)).toBeInTheDocument();
    });

    it('should visually distinguish checked from unchecked items', () => {
      const item = createWorkItem({
        content: '## Acceptance Criteria\n\n- [ ] Unchecked item\n- [x] Checked item',
      });
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThanOrEqual(2);

      // One should be checked, one unchecked
      const checkedItems = checkboxes.filter((cb) => (cb as HTMLInputElement).checked);
      const uncheckedItems = checkboxes.filter((cb) => !(cb as HTMLInputElement).checked);
      expect(checkedItems).toHaveLength(1);
      expect(uncheckedItems).toHaveLength(1);
    });

    it('should handle content without acceptance criteria section', () => {
      const item = createWorkItem({
        content: '## Objective\n\nJust an objective, no criteria.',
      });
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      expect(screen.queryByText('Acceptance Criteria')).not.toBeInTheDocument();
    });
  });

  describe('rejection history section', () => {
    it('should display rejection history table when rejections > 0', () => {
      const rejectionHistory = createRejectionHistory();
      const item = createWorkItem({
        rejection_count: 2,
        rejection_history: rejectionHistory,
      });
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      expect(screen.getByTestId('rejection-history-table')).toBeInTheDocument();
    });

    it('should not display rejection history table when rejections is 0', () => {
      const item = createWorkItem({
        rejection_count: 0,
        rejection_history: [],
      });
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      expect(screen.queryByTestId('rejection-history-table')).not.toBeInTheDocument();
    });

    it('should display rejection history section heading', () => {
      const item = createWorkItem({
        rejection_count: 1,
        rejection_history: [{ number: 1, reason: 'Test failure', agent: 'Murdock' }],
      });
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      expect(screen.getByText(/Rejection History/i)).toBeInTheDocument();
    });

    it('should display table columns: number, reason, agent', () => {
      const item = createWorkItem({
        rejection_count: 1,
        rejection_history: [{ number: 1, reason: 'Test failure', agent: 'Murdock' }],
      });
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      expect(screen.getByText('#')).toBeInTheDocument();
      expect(screen.getByText('Reason')).toBeInTheDocument();
      expect(screen.getByText('Agent')).toBeInTheDocument();
    });

    it('should display rejection number in table', () => {
      const item = createWorkItem({
        rejection_count: 2,
        rejection_history: createRejectionHistory(),
      });
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should display rejection reason in table', () => {
      const item = createWorkItem({
        rejection_count: 1,
        rejection_history: [{ number: 1, reason: 'Missing unit tests for edge cases', agent: 'Murdock' }],
      });
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      expect(screen.getByText('Missing unit tests for edge cases')).toBeInTheDocument();
    });

    it('should display agent name in rejection table', () => {
      const item = createWorkItem({
        rejection_count: 1,
        rejection_history: [{ number: 1, reason: 'Some reason', agent: 'Hannibal' }],
      });
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      const table = screen.getByTestId('rejection-history-table');
      expect(table).toHaveTextContent('Hannibal');
    });

    it('should display multiple rejection entries in chronological order', () => {
      const item = createWorkItem({
        rejection_count: 2,
        rejection_history: createRejectionHistory(),
      });
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      const rows = screen.getAllByTestId('rejection-history-row');
      expect(rows).toHaveLength(2);
      expect(rows[0]).toHaveTextContent('1');
      expect(rows[0]).toHaveTextContent('Murdock');
      expect(rows[1]).toHaveTextContent('2');
      expect(rows[1]).toHaveTextContent('Hannibal');
    });
  });

  describe('current status section', () => {
    it('should display current status section', () => {
      const item = createWorkItem();
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      expect(screen.getByTestId('current-status-section')).toBeInTheDocument();
    });

    it('should show assigned agent in status section', () => {
      const item = createWorkItem({ assigned_agent: 'Face', status: 'implementing' });
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      const statusSection = screen.getByTestId('current-status-section');
      expect(statusSection).toHaveTextContent('Face');
    });

    it('should show progress indicator for in-progress items', () => {
      const item = createWorkItem({ status: 'implementing', stage: 'implementing' });
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      const progressIndicator = screen.getByTestId('progress-indicator');
      expect(progressIndicator).toBeInTheDocument();
    });

    it('should indicate completed status', () => {
      const item = createWorkItem({ status: 'done', stage: 'done' });
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      expect(screen.getByText(/done/i)).toBeInTheDocument();
    });

    it('should show unassigned state when no agent', () => {
      const item = createWorkItem({ assigned_agent: undefined, status: 'ready' });
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      const statusSection = screen.getByTestId('current-status-section');
      expect(statusSection).toHaveTextContent(/unassigned/i);
    });
  });

  describe('dialog structure', () => {
    it('should use shadcn Dialog component', () => {
      const item = createWorkItem();
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      const dialogContent = document.querySelector('[data-slot="dialog-content"]');
      expect(dialogContent).toBeInTheDocument();
    });

    it('should have backdrop overlay', () => {
      const item = createWorkItem();
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      const overlay = document.querySelector('[data-slot="dialog-overlay"]');
      expect(overlay).toBeInTheDocument();
    });

    it('should have testid for modal container', () => {
      const item = createWorkItem();
      render(<WorkItemModal isOpen={true} onClose={() => {}} item={item} />);

      expect(screen.getByTestId('work-item-modal')).toBeInTheDocument();
    });
  });
});
