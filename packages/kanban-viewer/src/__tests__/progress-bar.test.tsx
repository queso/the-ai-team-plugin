import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from '../components/progress-bar';

describe('ProgressBar', () => {
  describe('count text display', () => {
    it('should display completed/total format', () => {
      render(<ProgressBar completed={12} total={26} />);
      expect(screen.getByText('12/26')).toBeInTheDocument();
    });

    it('should update when props change', () => {
      const { rerender } = render(<ProgressBar completed={5} total={10} />);
      expect(screen.getByText('5/10')).toBeInTheDocument();

      rerender(<ProgressBar completed={8} total={10} />);
      expect(screen.getByText('8/10')).toBeInTheDocument();
    });
  });

  describe('percentage calculation', () => {
    it('should show correct percentage width for partial completion', () => {
      render(<ProgressBar completed={5} total={10} />);
      const fillBar = screen.getByTestId('progress-fill');
      // 5/10 = 50%
      expect(fillBar).toHaveStyle({ width: '50%' });
    });

    it('should handle 0 completed (0% fill)', () => {
      render(<ProgressBar completed={0} total={10} />);
      const fillBar = screen.getByTestId('progress-fill');
      expect(fillBar).toHaveStyle({ width: '0%' });
    });

    it('should handle all completed (100% fill)', () => {
      render(<ProgressBar completed={10} total={10} />);
      const fillBar = screen.getByTestId('progress-fill');
      expect(fillBar).toHaveStyle({ width: '100%' });
    });

    it('should clamp percentage when completed exceeds total', () => {
      render(<ProgressBar completed={15} total={10} />);
      const fillBar = screen.getByTestId('progress-fill');
      // Should clamp to 100%, not 150%
      expect(fillBar).toHaveStyle({ width: '100%' });
    });

    it('should handle 0 total without dividing by zero', () => {
      render(<ProgressBar completed={0} total={0} />);
      const fillBar = screen.getByTestId('progress-fill');
      // Should safely show 0%, not NaN or error
      expect(fillBar).toHaveStyle({ width: '0%' });
    });

    it('should handle negative completed by clamping to 0%', () => {
      render(<ProgressBar completed={-5} total={10} />);
      const fillBar = screen.getByTestId('progress-fill');
      expect(fillBar).toHaveStyle({ width: '0%' });
    });
  });

  describe('visual styling', () => {
    it('should have green/primary color for fill bar', () => {
      render(<ProgressBar completed={5} total={10} />);
      const fillBar = screen.getByTestId('progress-fill');
      expect(fillBar).toHaveClass('bg-primary');
    });

    it('should have gray background for container', () => {
      render(<ProgressBar completed={5} total={10} />);
      const container = screen.getByTestId('progress-container');
      expect(container).toHaveClass('bg-muted');
    });

    it('should have rounded corners on container', () => {
      render(<ProgressBar completed={5} total={10} />);
      const container = screen.getByTestId('progress-container');
      expect(container).toHaveClass('rounded-full');
    });

    it('should have rounded corners on fill bar', () => {
      render(<ProgressBar completed={5} total={10} />);
      const fillBar = screen.getByTestId('progress-fill');
      expect(fillBar).toHaveClass('rounded-full');
    });
  });

  describe('accessibility', () => {
    it('should have progressbar role', () => {
      render(<ProgressBar completed={12} total={26} />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should have aria-valuenow reflecting percentage', () => {
      render(<ProgressBar completed={12} total={26} />);
      const progressbar = screen.getByRole('progressbar');
      // 12/26 = ~46%
      expect(progressbar).toHaveAttribute('aria-valuenow', '46');
    });

    it('should have aria-valuemin of 0', () => {
      render(<ProgressBar completed={12} total={26} />);
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    });

    it('should have aria-valuemax of 100', () => {
      render(<ProgressBar completed={12} total={26} />);
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('layout', () => {
    it('should render bar and text in flex container', () => {
      render(<ProgressBar completed={5} total={10} />);
      // The wrapper should use flex layout
      const wrapper = screen.getByTestId('progress-bar');
      expect(wrapper).toHaveClass('flex');
    });

    it('should align items center', () => {
      render(<ProgressBar completed={5} total={10} />);
      const wrapper = screen.getByTestId('progress-bar');
      expect(wrapper).toHaveClass('items-center');
    });
  });

  describe('completion color (Item 001)', () => {
    it('should show success fill (bg-success) when progress equals total (100% complete)', () => {
      render(<ProgressBar completed={10} total={10} />);
      const fillBar = screen.getByTestId('progress-fill');
      // When 100% complete, fill should be green
      expect(fillBar).toHaveClass('bg-success');
    });

    it('should show success fill when completed exceeds total (clamped to 100%)', () => {
      render(<ProgressBar completed={15} total={10} />);
      const fillBar = screen.getByTestId('progress-fill');
      // Should still show success since it's at 100% (clamped)
      expect(fillBar).toHaveClass('bg-success');
    });

    it('should show primary color (bg-primary) when in progress (not 100%)', () => {
      render(<ProgressBar completed={5} total={10} />);
      const fillBar = screen.getByTestId('progress-fill');
      // When not 100% complete, fill should remain primary
      expect(fillBar).toHaveClass('bg-primary');
      expect(fillBar).not.toHaveClass('bg-success');
    });

    it('should show primary color when at 0% progress', () => {
      render(<ProgressBar completed={0} total={10} />);
      const fillBar = screen.getByTestId('progress-fill');
      // At 0%, should show primary (not success)
      expect(fillBar).toHaveClass('bg-primary');
      expect(fillBar).not.toHaveClass('bg-success');
    });

    it('should show primary color when at 99% progress (not quite complete)', () => {
      render(<ProgressBar completed={99} total={100} />);
      const fillBar = screen.getByTestId('progress-fill');
      // At 99%, should still show primary (not success)
      expect(fillBar).toHaveClass('bg-primary');
      expect(fillBar).not.toHaveClass('bg-success');
    });

    it('should show success when exactly 100% (not 99.9%)', () => {
      render(<ProgressBar completed={100} total={100} />);
      const fillBar = screen.getByTestId('progress-fill');
      // At exactly 100%, should show success
      expect(fillBar).toHaveClass('bg-success');
    });

    it('should maintain smooth transition on fill bar', () => {
      render(<ProgressBar completed={5} total={10} />);
      const fillBar = screen.getByTestId('progress-fill');
      // Should have transition-all for smooth color and width changes
      expect(fillBar).toHaveClass('transition-all');
    });

    it('should apply color to indicator element not the track', () => {
      render(<ProgressBar completed={10} total={10} />);
      const container = screen.getByTestId('progress-container');
      const fillBar = screen.getByTestId('progress-fill');
      // Container (track) should not have success class
      expect(container).not.toHaveClass('bg-success');
      // Fill (indicator) should have success class when complete
      expect(fillBar).toHaveClass('bg-success');
    });

    it('should switch from primary to success when progress updates to 100%', () => {
      const { rerender } = render(<ProgressBar completed={5} total={10} />);
      let fillBar = screen.getByTestId('progress-fill');
      // Initially at 50%, should be primary
      expect(fillBar).toHaveClass('bg-primary');
      expect(fillBar).not.toHaveClass('bg-success');

      // Update to 100%
      rerender(<ProgressBar completed={10} total={10} />);
      fillBar = screen.getByTestId('progress-fill');
      // Now at 100%, should be success
      expect(fillBar).toHaveClass('bg-success');
      expect(fillBar).not.toHaveClass('bg-primary');
    });

    it('should handle edge case of 0 total without showing success', () => {
      render(<ProgressBar completed={0} total={0} />);
      const fillBar = screen.getByTestId('progress-fill');
      // Edge case: 0/0 should not be considered "complete" (avoid division by zero)
      // Should show primary, not success
      expect(fillBar).toHaveClass('bg-primary');
      expect(fillBar).not.toHaveClass('bg-success');
    });
  });
});
