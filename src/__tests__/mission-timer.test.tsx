import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MissionTimer } from '../components/mission-timer';

describe('MissionTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Set a fixed "now" for consistent timer calculations
    vi.setSystemTime(new Date('2026-01-15T10:23:51Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('time display', () => {
    it('should display elapsed time in HH:MM:SS format', () => {
      render(<MissionTimer startedAt="2026-01-15T10:00:00Z" status="active" />);

      // Started at 10:00:00, now is 10:23:51 = 00:23:51
      expect(screen.getByText('00:23:51')).toBeInTheDocument();
    });

    it('should handle hours in elapsed time', () => {
      // Set time to 2 hours and 15 minutes after start
      vi.setSystemTime(new Date('2026-01-15T12:15:30Z'));

      render(<MissionTimer startedAt="2026-01-15T10:00:00Z" status="active" />);

      expect(screen.getByText('02:15:30')).toBeInTheDocument();
    });

    it('should pad single digit values with leading zeros', () => {
      vi.setSystemTime(new Date('2026-01-15T10:01:05Z'));

      render(<MissionTimer startedAt="2026-01-15T10:00:00Z" status="active" />);

      expect(screen.getByText('00:01:05')).toBeInTheDocument();
    });

    it('should show 00:00:00 when startedAt is missing', () => {
      render(<MissionTimer startedAt="" status="active" />);

      expect(screen.getByText('00:00:00')).toBeInTheDocument();
    });

    it('should handle future startedAt gracefully by showing 00:00:00', () => {
      render(<MissionTimer startedAt="2026-01-15T11:00:00Z" status="active" />);

      // Future time should show 00:00:00 (negative elapsed makes no sense)
      expect(screen.getByText('00:00:00')).toBeInTheDocument();
    });
  });

  describe('timer updates', () => {
    it('should update every second when mission is active', () => {
      render(<MissionTimer startedAt="2026-01-15T10:00:00Z" status="active" />);

      expect(screen.getByText('00:23:51')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByText('00:23:52')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByText('00:23:53')).toBeInTheDocument();
    });

    it('should not update timer when mission is paused', () => {
      render(<MissionTimer startedAt="2026-01-15T10:00:00Z" status="paused" />);

      const initialTime = screen.getByTestId('mission-timer-display').textContent;

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(screen.getByTestId('mission-timer-display').textContent).toBe(initialTime);
    });

    it('should not update timer when mission is blocked', () => {
      render(<MissionTimer startedAt="2026-01-15T10:00:00Z" status="blocked" />);

      const initialTime = screen.getByTestId('mission-timer-display').textContent;

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(screen.getByTestId('mission-timer-display').textContent).toBe(initialTime);
    });

    it('should start updating when status changes from paused to active', () => {
      const { rerender } = render(<MissionTimer startedAt="2026-01-15T10:00:00Z" status="paused" />);

      // Initial time: 00:23:51 (10:00 to 10:23:51)
      expect(screen.getByText('00:23:51')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Still paused, should be same
      expect(screen.getByText('00:23:51')).toBeInTheDocument();

      // Change to active
      rerender(<MissionTimer startedAt="2026-01-15T10:00:00Z" status="active" />);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Now it should have updated by 1 second
      expect(screen.getByText('00:23:52')).toBeInTheDocument();
    });
  });

  describe('interval cleanup', () => {
    it('should cleanup interval on unmount', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      const { unmount } = render(<MissionTimer startedAt="2026-01-15T10:00:00Z" status="active" />);

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    it('should cleanup interval when status changes to paused', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      const { rerender } = render(<MissionTimer startedAt="2026-01-15T10:00:00Z" status="active" />);

      rerender(<MissionTimer startedAt="2026-01-15T10:00:00Z" status="paused" />);

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('icon display', () => {
    it('should render clock icon from Lucide', () => {
      render(<MissionTimer startedAt="2026-01-15T10:00:00Z" status="active" />);

      // Check for SVG element (Lucide icons render as SVG)
      const container = screen.getByTestId('mission-timer');
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have testid for timer display', () => {
      render(<MissionTimer startedAt="2026-01-15T10:00:00Z" status="active" />);

      expect(screen.getByTestId('mission-timer-display')).toBeInTheDocument();
    });

    it('should have testid for timer container', () => {
      render(<MissionTimer startedAt="2026-01-15T10:00:00Z" status="active" />);

      expect(screen.getByTestId('mission-timer')).toBeInTheDocument();
    });
  });
});
