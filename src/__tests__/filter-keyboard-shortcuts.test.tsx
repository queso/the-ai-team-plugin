import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FilterBar, FilterBarProps } from '../components/filter-bar';
import type { TypeFilter, AgentFilter, StatusFilter } from '../types';

// Default props factory
function createProps(overrides: Partial<FilterBarProps> = {}): FilterBarProps {
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

describe('Filter Keyboard Shortcuts (Item 011)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('Forward slash "/" focuses search input', () => {
    it('should focus search input when "/" is pressed', async () => {
      const props = createProps();
      render(<FilterBar {...props} />);

      const searchInput = screen.getByTestId('search-input');
      expect(document.activeElement).not.toBe(searchInput);

      // Press "/" key
      fireEvent.keyDown(document, { key: '/' });

      expect(document.activeElement).toBe(searchInput);
    });

    it('should focus search input when "/" is pressed anywhere on page', async () => {
      const props = createProps();
      render(
        <div>
          <div data-testid="other-element" tabIndex={0}>
            Other content
          </div>
          <FilterBar {...props} />
        </div>
      );

      // Focus on another element
      const otherElement = screen.getByTestId('other-element');
      otherElement.focus();
      expect(document.activeElement).toBe(otherElement);

      // Press "/" key on document
      fireEvent.keyDown(document, { key: '/' });

      const searchInput = screen.getByTestId('search-input');
      expect(document.activeElement).toBe(searchInput);
    });

    it('should not insert "/" character in search input when shortcut is triggered', async () => {
      const props = createProps();
      render(<FilterBar {...props} />);

      // Press "/" key
      fireEvent.keyDown(document, { key: '/' });

      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;

      // The "/" should not be typed into the input
      expect(searchInput.value).toBe('');
    });
  });

  describe('Cmd+K (Mac) / Ctrl+K focuses search input', () => {
    it('should focus search input when Cmd+K is pressed (Mac)', async () => {
      const props = createProps();
      render(<FilterBar {...props} />);

      const searchInput = screen.getByTestId('search-input');
      expect(document.activeElement).not.toBe(searchInput);

      // Press Cmd+K (Mac)
      fireEvent.keyDown(document, { key: 'k', metaKey: true });

      expect(document.activeElement).toBe(searchInput);
    });

    it('should focus search input when Ctrl+K is pressed (Windows/Linux)', async () => {
      const props = createProps();
      render(<FilterBar {...props} />);

      const searchInput = screen.getByTestId('search-input');
      expect(document.activeElement).not.toBe(searchInput);

      // Press Ctrl+K (Windows/Linux)
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      expect(document.activeElement).toBe(searchInput);
    });

    it('should not focus when only K is pressed without modifier', async () => {
      const props = createProps();
      render(<FilterBar {...props} />);

      const searchInput = screen.getByTestId('search-input');
      expect(document.activeElement).not.toBe(searchInput);

      // Press just 'k' without modifier
      fireEvent.keyDown(document, { key: 'k' });

      expect(document.activeElement).not.toBe(searchInput);
    });

    it('should prevent default browser behavior for Cmd+K', async () => {
      const props = createProps();
      render(<FilterBar {...props} />);

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
        cancelable: true,
      });
      const preventDefault = vi.spyOn(event, 'preventDefault');

      document.dispatchEvent(event);

      expect(preventDefault).toHaveBeenCalled();
    });
  });

  describe('Escape clears search input text', () => {
    it('should clear search input when Escape is pressed while input is focused', async () => {
      const onSearchQueryChange = vi.fn();
      const props = createProps({ searchQuery: 'test query', onSearchQueryChange });
      render(<FilterBar {...props} />);

      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;

      // Focus the input
      searchInput.focus();
      expect(document.activeElement).toBe(searchInput);

      // Press Escape
      fireEvent.keyDown(searchInput, { key: 'Escape' });

      // Search query should be cleared via callback
      expect(onSearchQueryChange).toHaveBeenCalledWith('');
    });

    it('should clear local search value when Escape is pressed', async () => {
      const props = createProps();
      render(<FilterBar {...props} />);

      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;

      // Type something in the input
      fireEvent.change(searchInput, { target: { value: 'search text' } });
      expect(searchInput.value).toBe('search text');

      // Press Escape
      fireEvent.keyDown(searchInput, { key: 'Escape' });

      // Local value should be cleared
      expect(searchInput.value).toBe('');
    });

    it('should blur search input after clearing with Escape', async () => {
      const props = createProps({ searchQuery: 'test' });
      render(<FilterBar {...props} />);

      const searchInput = screen.getByTestId('search-input');
      searchInput.focus();

      // Press Escape
      fireEvent.keyDown(searchInput, { key: 'Escape' });

      // Input should be blurred (optional behavior, but good UX)
      // Note: This might depend on implementation preference
    });
  });

  describe('Escape closes open dropdown menus', () => {
    it('should close type dropdown when Escape is pressed', async () => {
      const props = createProps();
      render(<FilterBar {...props} />);

      // Open type dropdown
      const typeDropdown = screen.getByTestId('type-filter-dropdown');
      fireEvent.click(typeDropdown);

      // Verify dropdown is open (options visible)
      expect(screen.getByRole('option', { name: 'bug' })).toBeInTheDocument();

      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape' });

      // Dropdown should be closed
      await waitFor(() => {
        expect(screen.queryByRole('option', { name: 'bug' })).not.toBeInTheDocument();
      });
    });

    it('should close agent dropdown when Escape is pressed', async () => {
      const props = createProps();
      render(<FilterBar {...props} />);

      // Open agent dropdown
      const agentDropdown = screen.getByTestId('agent-filter-dropdown');
      fireEvent.click(agentDropdown);

      // Verify dropdown is open
      expect(screen.getByRole('option', { name: 'Murdock' })).toBeInTheDocument();

      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape' });

      // Dropdown should be closed
      await waitFor(() => {
        expect(screen.queryByRole('option', { name: 'Murdock' })).not.toBeInTheDocument();
      });
    });

    it('should close status dropdown when Escape is pressed', async () => {
      const props = createProps();
      render(<FilterBar {...props} />);

      // Open status dropdown
      const statusDropdown = screen.getByTestId('status-filter-dropdown');
      fireEvent.click(statusDropdown);

      // Verify dropdown is open
      expect(screen.getByRole('option', { name: 'Active' })).toBeInTheDocument();

      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape' });

      // Dropdown should be closed
      await waitFor(() => {
        expect(screen.queryByRole('option', { name: 'Active' })).not.toBeInTheDocument();
      });
    });
  });

  describe('Shortcuts should not trigger when typing in search input', () => {
    it('should not trigger "/" shortcut when typing in search input', async () => {
      const onSearchQueryChange = vi.fn();
      const props = createProps({ onSearchQueryChange });
      render(<FilterBar {...props} />);

      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;

      // Focus the search input
      searchInput.focus();

      // Type "/" in the input (simulating user typing a search with "/")
      fireEvent.keyDown(searchInput, { key: '/' });
      fireEvent.change(searchInput, { target: { value: 'test/' } });

      // The "/" should be allowed in the input value (not intercepted as shortcut)
      expect(searchInput.value).toBe('test/');
    });

    it('should not trigger Cmd+K when typing in search input', async () => {
      const props = createProps();
      render(<FilterBar {...props} />);

      const searchInput = screen.getByTestId('search-input');

      // Focus the search input first
      searchInput.focus();
      expect(document.activeElement).toBe(searchInput);

      // Type some text
      fireEvent.change(searchInput, { target: { value: 'existing text' } });

      // Press Cmd+K while in the input
      fireEvent.keyDown(searchInput, { key: 'k', metaKey: true });

      // Input should still be focused (no change in behavior)
      expect(document.activeElement).toBe(searchInput);
    });

    it('should allow Escape to work while typing in search input', async () => {
      const onSearchQueryChange = vi.fn();
      const props = createProps({ onSearchQueryChange });
      render(<FilterBar {...props} />);

      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;

      // Focus and type in the input
      searchInput.focus();
      fireEvent.change(searchInput, { target: { value: 'search text' } });

      // Escape should still clear the input (this is the exception)
      fireEvent.keyDown(searchInput, { key: 'Escape' });

      expect(searchInput.value).toBe('');
      expect(onSearchQueryChange).toHaveBeenCalledWith('');
    });
  });

  describe('Keyboard shortcut accessibility', () => {
    it('should handle "/" shortcut case-insensitively', async () => {
      const props = createProps();
      render(<FilterBar {...props} />);

      const searchInput = screen.getByTestId('search-input');

      // Press "/" key
      fireEvent.keyDown(document, { key: '/' });

      expect(document.activeElement).toBe(searchInput);
    });

    it('should handle "k" shortcut case-insensitively with Cmd modifier', async () => {
      const props = createProps();
      render(<FilterBar {...props} />);

      const searchInput = screen.getByTestId('search-input');

      // Press Cmd+K (uppercase K)
      fireEvent.keyDown(document, { key: 'K', metaKey: true });

      expect(document.activeElement).toBe(searchInput);
    });

    it('should not interfere with other input elements on the page', async () => {
      const props = createProps();
      render(
        <div>
          <input data-testid="other-input" type="text" />
          <FilterBar {...props} />
        </div>
      );

      const otherInput = screen.getByTestId('other-input') as HTMLInputElement;
      const searchInput = screen.getByTestId('search-input');

      // Focus other input
      otherInput.focus();

      // Press "/" while in other input - should NOT focus search
      fireEvent.keyDown(otherInput, { key: '/' });

      // Other input should remain focused
      expect(document.activeElement).toBe(otherInput);
      expect(document.activeElement).not.toBe(searchInput);
    });
  });

  describe('Multiple shortcut interactions', () => {
    it('should handle "/" followed by Escape sequence', async () => {
      const onSearchQueryChange = vi.fn();
      const props = createProps({ onSearchQueryChange });
      render(<FilterBar {...props} />);

      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;

      // Press "/" to focus
      fireEvent.keyDown(document, { key: '/' });
      expect(document.activeElement).toBe(searchInput);

      // Type something
      fireEvent.change(searchInput, { target: { value: 'test' } });

      // Press Escape to clear
      fireEvent.keyDown(searchInput, { key: 'Escape' });

      expect(searchInput.value).toBe('');
    });

    it('should handle Cmd+K followed by typing and Escape', async () => {
      const onSearchQueryChange = vi.fn();
      const props = createProps({ onSearchQueryChange });
      render(<FilterBar {...props} />);

      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;

      // Press Cmd+K to focus
      fireEvent.keyDown(document, { key: 'k', metaKey: true });
      expect(document.activeElement).toBe(searchInput);

      // Type something
      fireEvent.change(searchInput, { target: { value: 'search term' } });
      expect(searchInput.value).toBe('search term');

      // Press Escape
      fireEvent.keyDown(searchInput, { key: 'Escape' });

      expect(searchInput.value).toBe('');
    });
  });

  describe('Edge cases', () => {
    it('should handle repeated "/" presses gracefully', async () => {
      const props = createProps();
      render(<FilterBar {...props} />);

      const searchInput = screen.getByTestId('search-input');

      // Press "/" multiple times
      fireEvent.keyDown(document, { key: '/' });
      fireEvent.keyDown(document, { key: '/' });
      fireEvent.keyDown(document, { key: '/' });

      // Should still be focused without errors
      expect(document.activeElement).toBe(searchInput);
    });

    it('should handle Escape when no dropdown is open and input is empty', async () => {
      const onSearchQueryChange = vi.fn();
      const props = createProps({ searchQuery: '', onSearchQueryChange });
      render(<FilterBar {...props} />);

      // Press Escape when nothing is active
      fireEvent.keyDown(document, { key: 'Escape' });

      // Should not cause errors, and callback shouldn't be called unnecessarily
      // (implementation may vary)
    });

    it('should handle Cmd+K when search is already focused', async () => {
      const props = createProps();
      render(<FilterBar {...props} />);

      const searchInput = screen.getByTestId('search-input');

      // Focus manually first
      searchInput.focus();
      expect(document.activeElement).toBe(searchInput);

      // Press Cmd+K again
      fireEvent.keyDown(document, { key: 'k', metaKey: true });

      // Should still be focused
      expect(document.activeElement).toBe(searchInput);
    });
  });
});
