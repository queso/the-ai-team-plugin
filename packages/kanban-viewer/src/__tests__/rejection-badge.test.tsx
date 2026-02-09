import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RejectionBadge } from '../components/rejection-badge';

describe('RejectionBadge', () => {
  describe('conditional rendering', () => {
    it('should return null when count is 0', () => {
      const { container } = render(<RejectionBadge count={0} />);
      expect(container.firstChild).toBeNull();
    });

    it('should return null when count is negative', () => {
      const { container } = render(<RejectionBadge count={-1} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render when count is greater than 0', () => {
      render(<RejectionBadge count={1} />);
      expect(screen.getByTestId('rejection-badge')).toBeInTheDocument();
    });
  });

  describe('count display', () => {
    it('should display the correct count number', () => {
      render(<RejectionBadge count={3} />);
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should display large count numbers', () => {
      render(<RejectionBadge count={42} />);
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  describe('icon', () => {
    it('should render the AlertTriangle icon', () => {
      render(<RejectionBadge count={1} />);
      const badge = screen.getByTestId('rejection-badge');
      // Lucide icons render as SVG elements
      const svg = badge.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should have amber warning color', () => {
      render(<RejectionBadge count={1} />);
      const badge = screen.getByTestId('rejection-badge');
      expect(badge).toHaveClass('text-amber-500');
    });

    it('should have small text styling', () => {
      render(<RejectionBadge count={1} />);
      const badge = screen.getByTestId('rejection-badge');
      expect(badge).toHaveClass('text-xs');
    });

    it('should use flexbox for icon and count alignment', () => {
      render(<RejectionBadge count={1} />);
      const badge = screen.getByTestId('rejection-badge');
      expect(badge).toHaveClass('flex');
      expect(badge).toHaveClass('items-center');
    });

    it('should have gap between icon and count', () => {
      render(<RejectionBadge count={1} />);
      const badge = screen.getByTestId('rejection-badge');
      expect(badge).toHaveClass('gap-1');
    });
  });
});
