import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
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

describe('FilterBar - Search Input', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('search input rendering', () => {
    it('should render a search input', () => {
      render(<FilterBar {...createProps()} />);

      const searchInput = screen.getByTestId('search-input');
      expect(searchInput).toBeInTheDocument();
    });

    it('should be positioned on the right side with margin-left: auto', () => {
      render(<FilterBar {...createProps()} />);

      const searchContainer = screen.getByTestId('search-container');
      expect(searchContainer).toHaveClass('ml-auto');
    });

    it('should have 200px width', () => {
      render(<FilterBar {...createProps()} />);

      const searchContainer = screen.getByTestId('search-container');
      expect(searchContainer).toHaveClass('w-[200px]');
    });
  });

  describe('search icon', () => {
    it('should render search icon inside input on the left', () => {
      render(<FilterBar {...createProps()} />);

      const searchIcon = screen.getByTestId('search-icon');
      expect(searchIcon).toBeInTheDocument();
    });

    it('should position search icon on left side of input', () => {
      render(<FilterBar {...createProps()} />);

      // Icon should be positioned absolutely on the left
      const searchIcon = screen.getByTestId('search-icon');
      expect(searchIcon).toHaveClass('absolute');
      expect(searchIcon).toHaveClass('left-2');
    });
  });

  describe('placeholder', () => {
    it('should have placeholder text "Search..."', () => {
      render(<FilterBar {...createProps()} />);

      const searchInput = screen.getByTestId('search-input');
      expect(searchInput).toHaveAttribute('placeholder', 'Search...');
    });

    it('should have placeholder color #6b7280 (gray-500)', () => {
      render(<FilterBar {...createProps()} />);

      const searchInput = screen.getByTestId('search-input');
      // placeholder:text-gray-500 for placeholder color
      expect(searchInput).toHaveClass('placeholder:text-gray-500');
    });
  });

  describe('input styling', () => {
    it('should have background color #374151 (gray-700)', () => {
      render(<FilterBar {...createProps()} />);

      const searchInput = screen.getByTestId('search-input');
      expect(searchInput).toHaveClass('bg-gray-700');
    });

    it('should have 6px border-radius (rounded-md)', () => {
      render(<FilterBar {...createProps()} />);

      const searchInput = screen.getByTestId('search-input');
      expect(searchInput).toHaveClass('rounded-md');
    });

    it('should have 32px left padding for icon space', () => {
      render(<FilterBar {...createProps()} />);

      const searchInput = screen.getByTestId('search-input');
      // pl-8 = 32px left padding
      expect(searchInput).toHaveClass('pl-8');
    });
  });

  describe('debounce behavior', () => {
    it('should not call onSearchQueryChange immediately on input', () => {
      const onSearchQueryChange = vi.fn();
      render(<FilterBar {...createProps({ onSearchQueryChange })} />);

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      // Should not be called immediately
      expect(onSearchQueryChange).not.toHaveBeenCalled();
    });

    it('should call onSearchQueryChange after 300ms debounce', async () => {
      const onSearchQueryChange = vi.fn();
      render(<FilterBar {...createProps({ onSearchQueryChange })} />);

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'test query' } });

      // Advance time by 300ms
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(onSearchQueryChange).toHaveBeenCalledWith('test query');
    });

    it('should reset debounce timer on subsequent input', () => {
      const onSearchQueryChange = vi.fn();
      render(<FilterBar {...createProps({ onSearchQueryChange })} />);

      const searchInput = screen.getByTestId('search-input');

      // First input
      fireEvent.change(searchInput, { target: { value: 'te' } });

      // Advance 200ms (not enough to trigger)
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Second input resets timer
      fireEvent.change(searchInput, { target: { value: 'test' } });

      // Advance another 200ms (should still not trigger)
      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(onSearchQueryChange).not.toHaveBeenCalled();

      // Advance final 100ms (total 300ms since last input)
      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(onSearchQueryChange).toHaveBeenCalledWith('test');
      expect(onSearchQueryChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('clear button', () => {
    it('should not show clear button when input is empty', () => {
      render(<FilterBar {...createProps({ searchQuery: '' })} />);

      const clearButton = screen.queryByTestId('search-clear-button');
      expect(clearButton).not.toBeInTheDocument();
    });

    it('should show clear button when input has value', () => {
      render(<FilterBar {...createProps({ searchQuery: 'test' })} />);

      const clearButton = screen.getByTestId('search-clear-button');
      expect(clearButton).toBeInTheDocument();
    });

    it('should use lucide-react X icon for clear button', () => {
      render(<FilterBar {...createProps({ searchQuery: 'test' })} />);

      const clearIcon = screen.getByTestId('search-clear-icon');
      expect(clearIcon).toBeInTheDocument();
    });

    it('should call onSearchQueryChange with empty string when clear is clicked', () => {
      const onSearchQueryChange = vi.fn();
      render(<FilterBar {...createProps({ searchQuery: 'test', onSearchQueryChange })} />);

      const clearButton = screen.getByTestId('search-clear-button');
      fireEvent.click(clearButton);

      expect(onSearchQueryChange).toHaveBeenCalledWith('');
    });

    it('should hide clear button after clearing', () => {
      const onSearchQueryChange = vi.fn();
      const { rerender } = render(<FilterBar {...createProps({ searchQuery: 'test', onSearchQueryChange })} />);

      const clearButton = screen.getByTestId('search-clear-button');
      fireEvent.click(clearButton);

      // Rerender with empty searchQuery (simulating parent state update)
      rerender(<FilterBar {...createProps({ searchQuery: '', onSearchQueryChange })} />);

      expect(screen.queryByTestId('search-clear-button')).not.toBeInTheDocument();
    });

    it('should clear input immediately without debounce', () => {
      const onSearchQueryChange = vi.fn();
      render(<FilterBar {...createProps({ searchQuery: 'test', onSearchQueryChange })} />);

      const clearButton = screen.getByTestId('search-clear-button');
      fireEvent.click(clearButton);

      // Should be called immediately, not debounced
      expect(onSearchQueryChange).toHaveBeenCalledWith('');
    });
  });

  describe('controlled input', () => {
    it('should display the searchQuery value', () => {
      render(<FilterBar {...createProps({ searchQuery: 'my search' })} />);

      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;
      expect(searchInput.value).toBe('my search');
    });

    it('should update when searchQuery prop changes', () => {
      const { rerender } = render(<FilterBar {...createProps({ searchQuery: 'initial' })} />);

      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;
      expect(searchInput.value).toBe('initial');

      rerender(<FilterBar {...createProps({ searchQuery: 'updated' })} />);

      expect(searchInput.value).toBe('updated');
    });
  });
});
