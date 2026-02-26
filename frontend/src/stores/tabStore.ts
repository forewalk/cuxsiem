import { create } from 'zustand';

export interface TabInfo {
  id: string;
  label: string;
  labelKey?: string; // 실시간 i18n 적용을 위한 키
  component: string;
  props?: Record<string, any>;
}

interface TabState {
  tabs: TabInfo[];
  activeTabId: string | null;
  maxTabs: number;
  addTab: (tab: Omit<TabInfo, 'id'>, generateId?: (tab: Omit<TabInfo, 'id'>) => string) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  setMaxTabs: (count: number) => void;
  reorderTabs: (startIndex: number, endIndex: number) => void;
}

const useTabStore = create<TabState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  maxTabs: 10,

  addTab: (tab, generateId = (t) => t.component) => {
    const newTabId = generateId(tab);
    const { tabs, maxTabs } = get();

    const existingTab = tabs.find((t) => t.id === newTabId);
    if (existingTab) {
      set({ activeTabId: newTabId });
      return;
    }

    if (tabs.length >= maxTabs) {
      alert(`탭은 최대 ${maxTabs}개까지 열 수 있습니다.`);
      return;
    }

    const newTab: TabInfo = { ...tab, id: newTabId };
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTabId,
    }));
  },

  reorderTabs: (startIndex, endIndex) => {
    const { tabs } = get();
    const newTabs = Array.from(tabs);
    const [removed] = newTabs.splice(startIndex, 1);
    newTabs.splice(endIndex, 0, removed);
    set({ tabs: newTabs });
  },

  removeTab: (id) => {
    const { tabs, activeTabId } = get();
    const newTabs = tabs.filter((tab) => tab.id !== id);

    let newActiveTabId = activeTabId;
    if (activeTabId === id) {
      if (newTabs.length > 0) {
        newActiveTabId = newTabs[newTabs.length - 1].id;
      } else {
        newActiveTabId = null;
      }
    }

    set({ tabs: newTabs, activeTabId: newActiveTabId });
  },

  setActiveTab: (id) => set({ activeTabId: id }),
  setMaxTabs: (count) => set({ maxTabs: count }),
}));

export default useTabStore;