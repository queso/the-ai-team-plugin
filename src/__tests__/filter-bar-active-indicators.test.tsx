import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterBar } from '../components/filter-bar';
import type { TypeFilter, AgentFilter, StatusFilter } from '../types';

// Default props factory - all filters at default values
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
    onClearFilters: vi.fn(),
    ...overrides,
  };
}

describe('FilterBar - Active Filter Indicators', () => {
  describe('active dropdown styling', () => {
    it('should not show green tint on type dropdown when set to default', () => {
      render(<FilterBar {...createProps({ typeFilter: 'All Types' })} />);

      const typeDropdown = screen.getByTestId('type-filter-dropdown');
      expect(typeDropdown).not.toHaveClass('bg-green-500/10');
      expect(typeDropdown).not.toHaveClass('border-green-500');
    });

    it('should show green tint on type dropdown when filter is active', () => {
      render(<FilterBar {...createProps({ typeFilter: 'feature' })} />);

      const typeDropdown = screen.getByTestId('type-filter-dropdown');
      // #22c55e20 = green-500 at 20% opacity (bg-green-500/20 or similar)
      expect(typeDropdown).toHaveClass('bg-green-500/20');
      expect(typeDropdown).toHaveClass('border-green-500');
    });

    it('should show green tint on agent dropdown when filter is active', () => {
      render(<FilterBar {...createProps({ agentFilter: 'Murdock' })} />);

      const agentDropdown = screen.getByTestId('agent-filter-dropdown');
      expect(agentDropdown).toHaveClass('bg-green-500/20');
      expect(agentDropdown).toHaveClass('border-green-500');
    });

    it('should show green tint on status dropdown when filter is active', () => {
      render(<FilterBar {...createProps({ statusFilter: 'Blocked' })} />);

      const statusDropdown = screen.getByTestId('status-filter-dropdown');
      expect(statusDropdown).toHaveClass('bg-green-500/20');
      expect(statusDropdown).toHaveClass('border-green-500');
    });

    it('should show green tint on multiple dropdowns when multiple filters are active', () => {
      render(<FilterBar {...createProps({
        typeFilter: 'bug',
        agentFilter: 'B.A.',
        statusFilter: 'Active',
      })} />);

      expect(screen.getByTestId('type-filter-dropdown')).toHaveClass('bg-green-500/20');
      expect(screen.getByTestId('agent-filter-dropdown')).toHaveClass('bg-green-500/20');
      expect(screen.getByTestId('status-filter-dropdown')).toHaveClass('bg-green-500/20');
    });
  });

  describe('clear filters button visibility', () => {
    it('should not show clear filters button when all filters are at default', () => {
      render(<FilterBar {...createProps()} />);

      const clearButton = screen.queryByTestId('clear-filters-button');
      expect(clearButton).not.toBeInTheDocument();
    });

    it('should show clear filters button when type filter is non-default', () => {
      render(<FilterBar {...createProps({ typeFilter: 'feature' })} />);

      const clearButton = screen.getByTestId('clear-filters-button');
      expect(clearButton).toBeInTheDocument();
    });

    it('should show clear filters button when agent filter is non-default', () => {
      render(<FilterBar {...createProps({ agentFilter: 'Hannibal' })} />);

      const clearButton = screen.getByTestId('clear-filters-button');
      expect(clearButton).toBeInTheDocument();
    });

    it('should show clear filters button when status filter is non-default', () => {
      render(<FilterBar {...createProps({ statusFilter: 'Active' })} />);

      const clearButton = screen.getByTestId('clear-filters-button');
      expect(clearButton).toBeInTheDocument();
    });

    it('should show clear filters button when search has value', () => {
      render(<FilterBar {...createProps({ searchQuery: 'test' })} />);

      const clearButton = screen.getByTestId('clear-filters-button');
      expect(clearButton).toBeInTheDocument();
    });

    it('should show clear filters button when any combination of filters is active', () => {
      render(<FilterBar {...createProps({
        typeFilter: 'bug',
        searchQuery: 'search text',
      })} />);

      const clearButton = screen.getByTestId('clear-filters-button');
      expect(clearButton).toBeInTheDocument();
    });
  });

  describe('clear filters button styling', () => {
    it('should be styled as text button with gray color (#6b7280)', () => {
      render(<FilterBar {...createProps({ typeFilter: 'feature' })} />);

      const clearButton = screen.getByTestId('clear-filters-button');
      // text-gray-500 maps to #6b7280
      expect(clearButton).toHaveClass('text-gray-500');
    });

    it('should change to white on hover', () => {
      render(<FilterBar {...createProps({ typeFilter: 'feature' })} />);

      const clearButton = screen.getByTestId('clear-filters-button');
      expect(clearButton).toHaveClass('hover:text-white');
    });

    it('should use lucide-react X icon at 12px (w-3 h-3)', () => {
      render(<FilterBar {...createProps({ typeFilter: 'feature' })} />);

      const clearIcon = screen.getByTestId('clear-filters-icon');
      expect(clearIcon).toBeInTheDocument();
      expect(clearIcon).toHaveClass('w-3');
      expect(clearIcon).toHaveClass('h-3');
    });

    it('should display "Clear filters" text', () => {
      render(<FilterBar {...createProps({ typeFilter: 'feature' })} />);

      expect(screen.getByText('Clear filters')).toBeInTheDocument();
    });
  });

  describe('clear filters functionality', () => {
    it('should call onClearFilters when clear button is clicked', () => {
      const onClearFilters = vi.fn();
      render(<FilterBar {...createProps({
        typeFilter: 'feature',
        onClearFilters,
      })} />);

      const clearButton = screen.getByTestId('clear-filters-button');
      fireEvent.click(clearButton);

      expect(onClearFilters).toHaveBeenCalled();
    });

    it('should reset all filters when clear is clicked (via callbacks)', () => {
      const onTypeFilterChange = vi.fn();
      const onAgentFilterChange = vi.fn();
      const onStatusFilterChange = vi.fn();
      const onSearchQueryChange = vi.fn();
      const onClearFilters = vi.fn();

      render(<FilterBar {...createProps({
        typeFilter: 'bug',
        agentFilter: 'Murdock',
        statusFilter: 'Blocked',
        searchQuery: 'test',
        onTypeFilterChange,
        onAgentFilterChange,
        onStatusFilterChange,
        onSearchQueryChange,
        onClearFilters,
      })} />);

      const clearButton = screen.getByTestId('clear-filters-button');
      fireEvent.click(clearButton);

      // Should call the clear filters handler
      expect(onClearFilters).toHaveBeenCalled();
    });
  });

  describe('clear filters button position', () => {
    it('should appear after the dropdowns in the filter bar', () => {
      render(<FilterBar {...createProps({ typeFilter: 'feature' })} />);

      const filterBar = screen.getByTestId('filter-bar');

      // Clear button should come after status dropdown
      const children = Array.from(filterBar.querySelectorAll('[data-testid]'));
      const statusIndex = children.findIndex(el => el.getAttribute('data-testid') === 'status-filter-dropdown');
      const clearIndex = children.findIndex(el => el.getAttribute('data-testid') === 'clear-filters-button');

      expect(clearIndex).toBeGreaterThan(statusIndex);
    });
  });

  describe('Unassigned agent filter', () => {
    it('should show green tint when Unassigned is selected', () => {
      render(<FilterBar {...createProps({ agentFilter: 'Unassigned' })} />);

      const agentDropdown = screen.getByTestId('agent-filter-dropdown');
      expect(agentDropdown).toHaveClass('bg-green-500/20');
    });

    it('should show clear button when Unassigned is selected', () => {
      render(<FilterBar {...createProps({ agentFilter: 'Unassigned' })} />);

      const clearButton = screen.getByTestId('clear-filters-button');
      expect(clearButton).toBeInTheDocument();
    });
  });
});
