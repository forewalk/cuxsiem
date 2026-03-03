import { create } from 'zustand';

interface TimeRange {
  fromValue: number | null;
  fromUnit: string;
  toValue: number | null;
  toUnit: string;
  fromDate: string | null;
  toDate: string | null;
}

interface AgentState {
  searchQuery: string;
  timeRange: TimeRange;
  setSearchQuery: (query: string) => void;
  setTimeRange: (range: TimeRange) => void;
  reset: () => void;
}

const defaultTimeRange: TimeRange = {
  fromValue: 15,
  fromUnit: 'm',
  toValue: null,
  toUnit: 'm',
  fromDate: null,
  toDate: null,
};

const useAgentStore = create<AgentState>((set) => ({
  searchQuery: "",
  timeRange: defaultTimeRange,
  setSearchQuery: (query) => set({ searchQuery: query }),
  setTimeRange: (range) => set({ timeRange: range }),
  reset: () => set({ searchQuery: "", timeRange: defaultTimeRange }),
}));

export default useAgentStore;
