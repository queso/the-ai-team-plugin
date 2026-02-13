import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterBar } from '../components/filter-bar';
import type { TypeFilter, AgentFilter, StatusFilter } from '../types';

// Default props factory
function createProps(overrides: Partial<React.ComponentProps<typeof FilterBar>> = {}) {
  return {
    typeFilter: 'All Types' as TypeFilter,
    agentFilter: 'All Agents' as AgentFilter,
    statusFilter: 'All Status' as StatusFilter,
    searchQuery: '',
    onTypeFilterChange: vi.fn(),
    onAgentFilterChange: vi.fn(),
    onStatusFilterChange: vi.fn(),
    onSearchQueryChange: vi.fn(),
    ...overrides,
  };
}

describe('FilterBar', () => {
  describe('rendering', () => {
    it('should render the filter bar container', () => {
      render(<FilterBar {...createProps()} />);

      const filterBar = screen.getByTestId('filter-bar');
      expect(filterBar).toBeInTheDocument();
    });

    it('should have correct height (48px)', () => {
      render(<FilterBar {...createProps()} />);

      const filterBar = screen.getByTestId('filter-bar');
      // Check for h-12 class (which is 48px in Tailwind)
      expect(filterBar).toHaveClass('h-12');
    });

    it('should have correct background color (#1f2937)', () => {
      render(<FilterBar {...createProps()} />);

      const filterBar = screen.getByTestId('filter-bar');
      // This maps to bg-gray-800 in Tailwind
      expect(filterBar).toHaveClass('bg-gray-800');
    });

    it('should display "Filter by:" label', () => {
      render(<FilterBar {...createProps()} />);

      expect(screen.getByText('Filter by:')).toBeInTheDocument();
    });
  });

  describe('Type dropdown', () => {
    it('should render type dropdown with current value', () => {
      render(<FilterBar {...createProps({ typeFilter: 'All Types' })} />);

      const typeDropdown = screen.getByTestId('type-filter-dropdown');
      expect(typeDropdown).toBeInTheDocument();
      expect(typeDropdown).toHaveTextContent('All Types');
    });

    it('should display all type filter options', () => {
      render(<FilterBar {...createProps()} />);

      const typeDropdown = screen.getByTestId('type-filter-dropdown');
      fireEvent.click(typeDropdown);

      const expectedOptions = [
        'All Types',
        'implementation',
        'test',
        'interface',
        'integration',
        'feature',
        'bug',
        'enhancement',
      ];

      expectedOptions.forEach((option) => {
        expect(screen.getByRole('option', { name: option })).toBeInTheDocument();
      });
    });

    it('should call onTypeFilterChange when option selected', () => {
      const onTypeFilterChange = vi.fn();
      render(<FilterBar {...createProps({ onTypeFilterChange })} />);

      const typeDropdown = screen.getByTestId('type-filter-dropdown');
      fireEvent.click(typeDropdown);

      const bugOption = screen.getByRole('option', { name: 'bug' });
      fireEvent.click(bugOption);

      expect(onTypeFilterChange).toHaveBeenCalledWith('bug');
    });

    it('should show selected type filter value', () => {
      render(<FilterBar {...createProps({ typeFilter: 'feature' })} />);

      const typeDropdown = screen.getByTestId('type-filter-dropdown');
      expect(typeDropdown).toHaveTextContent('feature');
    });
  });

  describe('Agent dropdown', () => {
    it('should render agent dropdown with current value', () => {
      render(<FilterBar {...createProps({ agentFilter: 'All Agents' })} />);

      const agentDropdown = screen.getByTestId('agent-filter-dropdown');
      expect(agentDropdown).toBeInTheDocument();
      expect(agentDropdown).toHaveTextContent('All Agents');
    });

    it('should display all agent filter options', () => {
      render(<FilterBar {...createProps()} />);

      const agentDropdown = screen.getByTestId('agent-filter-dropdown');
      fireEvent.click(agentDropdown);

      const expectedOptions = [
        'All Agents',
        'Hannibal',
        'Face',
        'Murdock',
        'B.A.',
        'Amy',
        'Lynch',
        'Unassigned',
      ];

      expectedOptions.forEach((option) => {
        expect(screen.getByRole('option', { name: option })).toBeInTheDocument();
      });
    });

    it('should call onAgentFilterChange when option selected', () => {
      const onAgentFilterChange = vi.fn();
      render(<FilterBar {...createProps({ onAgentFilterChange })} />);

      const agentDropdown = screen.getByTestId('agent-filter-dropdown');
      fireEvent.click(agentDropdown);

      const murdockOption = screen.getByRole('option', { name: 'Murdock' });
      fireEvent.click(murdockOption);

      expect(onAgentFilterChange).toHaveBeenCalledWith('Murdock');
    });

    it('should show selected agent filter value', () => {
      render(<FilterBar {...createProps({ agentFilter: 'B.A.' })} />);

      const agentDropdown = screen.getByTestId('agent-filter-dropdown');
      expect(agentDropdown).toHaveTextContent('B.A.');
    });

    it('should include Unassigned option', () => {
      render(<FilterBar {...createProps()} />);

      const agentDropdown = screen.getByTestId('agent-filter-dropdown');
      fireEvent.click(agentDropdown);

      expect(screen.getByRole('option', { name: 'Unassigned' })).toBeInTheDocument();
    });
  });

  describe('Status dropdown', () => {
    it('should render status dropdown with current value', () => {
      render(<FilterBar {...createProps({ statusFilter: 'All Status' })} />);

      const statusDropdown = screen.getByTestId('status-filter-dropdown');
      expect(statusDropdown).toBeInTheDocument();
      expect(statusDropdown).toHaveTextContent('All Status');
    });

    it('should display all status filter options', () => {
      render(<FilterBar {...createProps()} />);

      const statusDropdown = screen.getByTestId('status-filter-dropdown');
      fireEvent.click(statusDropdown);

      const expectedOptions = [
        'All Status',
        'Active',
        'Blocked',
        'Has Rejections',
        'Has Dependencies',
        'Completed',
      ];

      expectedOptions.forEach((option) => {
        expect(screen.getByRole('option', { name: option })).toBeInTheDocument();
      });
    });

    it('should call onStatusFilterChange when option selected', () => {
      const onStatusFilterChange = vi.fn();
      render(<FilterBar {...createProps({ onStatusFilterChange })} />);

      const statusDropdown = screen.getByTestId('status-filter-dropdown');
      fireEvent.click(statusDropdown);

      const blockedOption = screen.getByRole('option', { name: 'Blocked' });
      fireEvent.click(blockedOption);

      expect(onStatusFilterChange).toHaveBeenCalledWith('Blocked');
    });

    it('should show selected status filter value', () => {
      render(<FilterBar {...createProps({ statusFilter: 'Active' })} />);

      const statusDropdown = screen.getByTestId('status-filter-dropdown');
      expect(statusDropdown).toHaveTextContent('Active');
    });
  });

  describe('dropdown styling', () => {
    it('should have correct dropdown background styling', () => {
      render(<FilterBar {...createProps()} />);

      const typeDropdown = screen.getByTestId('type-filter-dropdown');
      // bg-gray-700 maps to #374151
      expect(typeDropdown).toHaveClass('bg-gray-700');
    });

    it('should have rounded borders on dropdowns', () => {
      render(<FilterBar {...createProps()} />);

      const typeDropdown = screen.getByTestId('type-filter-dropdown');
      expect(typeDropdown).toHaveClass('rounded-md');
    });

    it('should have minimum width on dropdowns', () => {
      render(<FilterBar {...createProps()} />);

      const typeDropdown = screen.getByTestId('type-filter-dropdown');
      expect(typeDropdown).toHaveClass('min-w-[120px]');
    });
  });

  describe('selected option styling', () => {
    it('should show checkmark on selected option', () => {
      render(<FilterBar {...createProps({ typeFilter: 'feature' })} />);

      const typeDropdown = screen.getByTestId('type-filter-dropdown');
      fireEvent.click(typeDropdown);

      const featureOption = screen.getByRole('option', { name: 'feature' });
      const checkIcon = featureOption.querySelector('[data-testid="check-icon"]');
      expect(checkIcon).toBeInTheDocument();
    });

    it('should apply green text color to selected option', () => {
      render(<FilterBar {...createProps({ typeFilter: 'feature' })} />);

      const typeDropdown = screen.getByTestId('type-filter-dropdown');
      fireEvent.click(typeDropdown);

      const featureOption = screen.getByRole('option', { name: 'feature' });
      // text-green-500 maps to #22c55e
      expect(featureOption).toHaveClass('text-green-500');
    });
  });

  describe('dropdown hover state', () => {
    it('should change background on hover', () => {
      render(<FilterBar {...createProps()} />);

      const typeDropdown = screen.getByTestId('type-filter-dropdown');
      // hover:bg-gray-600 maps to #4b5563
      expect(typeDropdown).toHaveClass('hover:bg-gray-600');
    });
  });

  describe('filter label styling', () => {
    it('should have correct text styling for filter label', () => {
      render(<FilterBar {...createProps()} />);

      const label = screen.getByText('Filter by:');
      // Font size 12px = text-xs, medium weight = font-medium, #6b7280 = text-gray-500
      expect(label).toHaveClass('text-xs');
      expect(label).toHaveClass('font-medium');
      expect(label).toHaveClass('text-gray-500');
    });
  });

  describe('layout', () => {
    it('should use flexbox for horizontal layout', () => {
      render(<FilterBar {...createProps()} />);

      const filterBar = screen.getByTestId('filter-bar');
      expect(filterBar).toHaveClass('flex');
      expect(filterBar).toHaveClass('items-center');
    });

    it('should have gap between elements', () => {
      render(<FilterBar {...createProps()} />);

      const filterBar = screen.getByTestId('filter-bar');
      expect(filterBar).toHaveClass('gap-4');
    });

    it('should have horizontal padding', () => {
      render(<FilterBar {...createProps()} />);

      const filterBar = screen.getByTestId('filter-bar');
      expect(filterBar).toHaveClass('px-4');
    });
  });

  describe('dropdown icons', () => {
    it('should render ChevronDown icon in dropdowns', () => {
      render(<FilterBar {...createProps()} />);

      const typeDropdown = screen.getByTestId('type-filter-dropdown');
      const chevronIcon = typeDropdown.querySelector('[data-testid="chevron-down-icon"]');
      expect(chevronIcon).toBeInTheDocument();
    });
  });

  describe('three dropdowns requirement', () => {
    it('should render exactly three filter dropdowns', () => {
      render(<FilterBar {...createProps()} />);

      expect(screen.getByTestId('type-filter-dropdown')).toBeInTheDocument();
      expect(screen.getByTestId('agent-filter-dropdown')).toBeInTheDocument();
      expect(screen.getByTestId('status-filter-dropdown')).toBeInTheDocument();
    });

    it('should render dropdowns in correct order: Type, Agent, Status', () => {
      render(<FilterBar {...createProps()} />);

      const filterBar = screen.getByTestId('filter-bar');
      const dropdowns = filterBar.querySelectorAll('[data-testid$="-filter-dropdown"]');

      expect(dropdowns[0]).toHaveAttribute('data-testid', 'type-filter-dropdown');
      expect(dropdowns[1]).toHaveAttribute('data-testid', 'agent-filter-dropdown');
      expect(dropdowns[2]).toHaveAttribute('data-testid', 'status-filter-dropdown');
    });
  });
});
