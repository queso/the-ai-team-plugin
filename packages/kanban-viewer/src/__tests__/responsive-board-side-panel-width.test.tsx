import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResponsiveBoard } from '../components/responsive-board';
import type { WorkItem, Stage } from '../types';

// Factory function for creating empty items by stage
const createEmptyItemsByStage = (): Record<Stage, WorkItem[]> => ({
  briefings: [],
  ready: [],
  testing: [],
  implementing: [],
  review: [],
  probing: [],
  done: [],
  blocked: [],
});

describe('Live Feed Panel Width', () => {
  describe('side panel container width constraints', () => {
    it('should have w-[400px] width class', () => {
      render(
        <ResponsiveBoard
          itemsByStage={createEmptyItemsByStage()}
          wipLimits={{}}
          sidePanel={<div>Panel Content</div>}
        />
      );

      const sidePanel = screen.getByTestId('side-panel-container');
      expect(sidePanel).toHaveClass('w-[400px]');
    });

    it('should have min-w-[350px] minimum width constraint', () => {
      render(
        <ResponsiveBoard
          itemsByStage={createEmptyItemsByStage()}
          wipLimits={{}}
          sidePanel={<div>Panel Content</div>}
        />
      );

      const sidePanel = screen.getByTestId('side-panel-container');
      expect(sidePanel).toHaveClass('min-w-[350px]');
    });

    it('should have max-w-[500px] maximum width constraint', () => {
      render(
        <ResponsiveBoard
          itemsByStage={createEmptyItemsByStage()}
          wipLimits={{}}
          sidePanel={<div>Panel Content</div>}
        />
      );

      const sidePanel = screen.getByTestId('side-panel-container');
      expect(sidePanel).toHaveClass('max-w-[500px]');
    });

    it('should have all three width classes together', () => {
      render(
        <ResponsiveBoard
          itemsByStage={createEmptyItemsByStage()}
          wipLimits={{}}
          sidePanel={<div>Panel Content</div>}
        />
      );

      const sidePanel = screen.getByTestId('side-panel-container');
      expect(sidePanel).toHaveClass('w-[400px]');
      expect(sidePanel).toHaveClass('min-w-[350px]');
      expect(sidePanel).toHaveClass('max-w-[500px]');
    });
  });
});
