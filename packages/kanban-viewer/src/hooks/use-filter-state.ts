"use client";

import { useState, useCallback } from "react";
import type { FilterState, TypeFilter, AgentFilter, StatusFilter } from "@/types";

const DEFAULT_FILTER_STATE: FilterState = {
  typeFilter: "All Types",
  agentFilter: "All Agents",
  statusFilter: "All Status",
  searchQuery: "",
};

export interface UseFilterStateReturn {
  filterState: FilterState;
  setTypeFilter: (value: TypeFilter) => void;
  setAgentFilter: (value: AgentFilter) => void;
  setStatusFilter: (value: StatusFilter) => void;
  setSearchQuery: (value: string) => void;
  resetFilters: () => void;
}

export function useFilterState(): UseFilterStateReturn {
  const [filterState, setFilterState] = useState<FilterState>(DEFAULT_FILTER_STATE);

  const setTypeFilter = useCallback((value: TypeFilter) => {
    setFilterState((prev) => ({ ...prev, typeFilter: value }));
  }, []);

  const setAgentFilter = useCallback((value: AgentFilter) => {
    setFilterState((prev) => ({ ...prev, agentFilter: value }));
  }, []);

  const setStatusFilter = useCallback((value: StatusFilter) => {
    setFilterState((prev) => ({ ...prev, statusFilter: value }));
  }, []);

  const setSearchQuery = useCallback((value: string) => {
    setFilterState((prev) => ({ ...prev, searchQuery: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilterState(DEFAULT_FILTER_STATE);
  }, []);

  return {
    filterState,
    setTypeFilter,
    setAgentFilter,
    setStatusFilter,
    setSearchQuery,
    resetFilters,
  };
}
