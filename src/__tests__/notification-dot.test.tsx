import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NotificationDot } from '../components/notification-dot';

describe('NotificationDot', () => {
  describe('visibility', () => {
    it('should render when visible is true', () => {
      render(<NotificationDot visible={true} />);
      expect(screen.getByTestId('notification-dot')).toBeInTheDocument();
    });

    it('should not render when visible is false', () => {
      const { container } = render(<NotificationDot visible={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('should hide when blocked items count becomes zero', () => {
      const { rerender } = render(<NotificationDot visible={true} count={3} />);
      expect(screen.getByTestId('notification-dot')).toBeInTheDocument();

      rerender(<NotificationDot visible={false} count={0} />);
      expect(screen.queryByTestId('notification-dot')).not.toBeInTheDocument();
    });
  });

  describe('count display', () => {
    it('should show count when provided', () => {
      render(<NotificationDot visible={true} count={3} />);
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should show correct number for multiple blocked items', () => {
      render(<NotificationDot visible={true} count={7} />);
      expect(screen.getByText('7')).toBeInTheDocument();
    });

    it('should display single blocked item count', () => {
      render(<NotificationDot visible={true} count={1} />);
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should handle large count numbers', () => {
      render(<NotificationDot visible={true} count={99} />);
      expect(screen.getByText('99')).toBeInTheDocument();
    });

    it('should render as simple dot when count is not provided', () => {
      render(<NotificationDot visible={true} />);
      const dot = screen.getByTestId('notification-dot');
      expect(dot).toBeInTheDocument();
      // No count text should be present
      expect(dot.textContent).toBe('');
    });

    it('should not show count when count is 0', () => {
      render(<NotificationDot visible={true} count={0} />);
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });

  describe('color styling', () => {
    it('should have amber background color by default', () => {
      render(<NotificationDot visible={true} />);
      const dot = screen.getByTestId('notification-dot');
      expect(dot).toHaveClass('bg-amber-500');
    });

    it('should have white text for count visibility', () => {
      render(<NotificationDot visible={true} count={3} />);
      const dot = screen.getByTestId('notification-dot');
      expect(dot).toHaveClass('text-white');
    });
  });

  describe('shape and positioning', () => {
    it('should be circular with rounded-full', () => {
      render(<NotificationDot visible={true} />);
      const dot = screen.getByTestId('notification-dot');
      expect(dot).toHaveClass('rounded-full');
    });

    it('should have small dimensions for dot variant', () => {
      render(<NotificationDot visible={true} />);
      const dot = screen.getByTestId('notification-dot');
      // Small dot when no count
      expect(dot).toHaveClass('w-2');
      expect(dot).toHaveClass('h-2');
    });

    it('should have larger dimensions when displaying count', () => {
      render(<NotificationDot visible={true} count={5} />);
      const dot = screen.getByTestId('notification-dot');
      // Larger badge when count is shown - min-w allows growth for double digits
      expect(dot).toHaveClass('min-w-4');
      expect(dot).toHaveClass('h-4');
    });

    it('should use flex for centering count text', () => {
      render(<NotificationDot visible={true} count={3} />);
      const dot = screen.getByTestId('notification-dot');
      expect(dot).toHaveClass('flex');
      expect(dot).toHaveClass('items-center');
      expect(dot).toHaveClass('justify-center');
    });

    it('should have small text size for count', () => {
      render(<NotificationDot visible={true} count={3} />);
      const dot = screen.getByTestId('notification-dot');
      expect(dot).toHaveClass('text-xs');
    });
  });

  describe('custom className', () => {
    it('should accept custom className prop', () => {
      render(<NotificationDot visible={true} className="custom-class" />);
      const dot = screen.getByTestId('notification-dot');
      expect(dot).toHaveClass('custom-class');
    });

    it('should merge custom className with default styles', () => {
      render(<NotificationDot visible={true} className="ml-1" />);
      const dot = screen.getByTestId('notification-dot');
      expect(dot).toHaveClass('ml-1');
      expect(dot).toHaveClass('rounded-full');
    });
  });

  describe('updates when blocked items change', () => {
    it('should update count when items are added', () => {
      const { rerender } = render(<NotificationDot visible={true} count={1} />);
      expect(screen.getByText('1')).toBeInTheDocument();

      rerender(<NotificationDot visible={true} count={3} />);
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should update count when items are unblocked', () => {
      const { rerender } = render(<NotificationDot visible={true} count={5} />);
      expect(screen.getByText('5')).toBeInTheDocument();

      rerender(<NotificationDot visible={true} count={2} />);
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.queryByText('5')).not.toBeInTheDocument();
    });

    it('should transition from count to dot when count becomes undefined', () => {
      const { rerender } = render(<NotificationDot visible={true} count={3} />);
      expect(screen.getByText('3')).toBeInTheDocument();

      rerender(<NotificationDot visible={true} />);
      const dot = screen.getByTestId('notification-dot');
      expect(dot.textContent).toBe('');
    });

    it('should appear when items become blocked', () => {
      const { rerender } = render(<NotificationDot visible={false} />);
      expect(screen.queryByTestId('notification-dot')).not.toBeInTheDocument();

      rerender(<NotificationDot visible={true} count={1} />);
      expect(screen.getByTestId('notification-dot')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });
});
