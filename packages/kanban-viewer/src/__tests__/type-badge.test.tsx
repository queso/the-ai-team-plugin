import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TypeBadge } from '../components/type-badge';
import type { WorkItemFrontmatterType } from '../types';

describe('TypeBadge', () => {
  describe('type text display', () => {
    it('should render the type text', () => {
      render(<TypeBadge type="feature" />);
      expect(screen.getByText('feature')).toBeInTheDocument();
    });

    it('should render text in lowercase', () => {
      render(<TypeBadge type="feature" />);
      const badge = screen.getByTestId('type-badge');
      expect(badge).toHaveTextContent('feature');
    });
  });

  describe('type colors', () => {
    it('should apply cyan background for feature type', () => {
      render(<TypeBadge type="feature" />);
      const badge = screen.getByTestId('type-badge');
      expect(badge).toHaveClass('bg-cyan-500');
    });

    it('should apply red background for bug type', () => {
      render(<TypeBadge type="bug" />);
      const badge = screen.getByTestId('type-badge');
      expect(badge).toHaveClass('bg-red-500');
    });

    it('should apply blue background for enhancement type', () => {
      render(<TypeBadge type="enhancement" />);
      const badge = screen.getByTestId('type-badge');
      expect(badge).toHaveClass('bg-blue-500');
    });

    it('should apply green background for task type', () => {
      render(<TypeBadge type="task" />);
      const badge = screen.getByTestId('type-badge');
      expect(badge).toHaveClass('bg-green-500');
    });
  });

  describe('unknown type fallback', () => {
    it('should apply gray background for unknown type', () => {
      // Cast to bypass TypeScript for testing unknown values
      render(<TypeBadge type={'unknown' as WorkItemFrontmatterType} />);
      const badge = screen.getByTestId('type-badge');
      expect(badge).toHaveClass('bg-gray-500');
    });

    it('should still display the unknown type text', () => {
      render(<TypeBadge type={'mystery' as WorkItemFrontmatterType} />);
      expect(screen.getByText('mystery')).toBeInTheDocument();
    });
  });

  describe('styling classes', () => {
    it('should have pill shape with rounded-full', () => {
      render(<TypeBadge type="feature" />);
      const badge = screen.getByTestId('type-badge');
      expect(badge).toHaveClass('rounded-full');
    });

    it('should have white text color', () => {
      render(<TypeBadge type="feature" />);
      const badge = screen.getByTestId('type-badge');
      expect(badge).toHaveClass('text-white');
    });

    it('should have small text size', () => {
      render(<TypeBadge type="feature" />);
      const badge = screen.getByTestId('type-badge');
      expect(badge).toHaveClass('text-xs');
    });

    it('should have horizontal padding', () => {
      render(<TypeBadge type="feature" />);
      const badge = screen.getByTestId('type-badge');
      expect(badge).toHaveClass('px-2');
    });

    it('should have vertical padding', () => {
      render(<TypeBadge type="feature" />);
      const badge = screen.getByTestId('type-badge');
      expect(badge).toHaveClass('py-0.5');
    });
  });
});
