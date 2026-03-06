import { create } from 'zustand';

interface TimeRange {
  fromValue: number | null;
  fromUnit: string;
  toValue: number | null;
  toUnit: string;
  fromDate: string | null;
  toDate: string | null;
}

interface EdrState {
  searchQuery: string;
  activeCategory: string;
  timeRange: TimeRange;
  setSearchQuery: (query: string) => void;
  setActiveCategory: (category: string) => void;
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

const useEdrStore = create<EdrState>((set) => ({
  searchQuery: "",
  activeCategory: "all",
  timeRange: defaultTimeRange,
  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveCategory: (category) => set({ activeCategory: category }),
  setTimeRange: (range) => set({ timeRange: range }),
  reset: () => set({ searchQuery: "", activeCategory: "all", timeRange: defaultTimeRange }),
}));

export default useEdrStore;
