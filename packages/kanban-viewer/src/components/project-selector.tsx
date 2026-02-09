'use client';

import { Project } from '@/types/api';

interface ProjectSelectorProps {
  projects: Project[];
  selectedProjectId: string;
  onProjectChange: (projectId: string) => void;
  isLoading?: boolean;
}

export function ProjectSelector({
  projects,
  selectedProjectId,
  onProjectChange,
  isLoading = false,
}: ProjectSelectorProps) {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onProjectChange(event.target.value);
  };

  return (
    <select
      value={selectedProjectId}
      onChange={handleChange}
      disabled={isLoading}
      className="bg-card border border-border rounded px-3 py-1.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed max-w-full w-full overflow-hidden text-ellipsis"
      aria-label="Select project"
    >
      {projects.map((project) => (
        <option key={project.id} value={project.id}>
          {project.name}
        </option>
      ))}
    </select>
  );
}
