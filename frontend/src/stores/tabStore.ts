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
  addTab: (tab: Omit<TabInfo, 'id'>, generateId?: (tab: Omit<TabInfo, 'id'>) => string) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
}

const MAX_TABS = 10; // 탭 개수 상향

const useTabStore = create<TabState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  addTab: (tab, generateId = (t) => t.component) => {
    const newTabId = generateId(tab);
    const { tabs } = get();

    const existingTab = tabs.find((t) => t.id === newTabId);
    if (existingTab) {
      set({ activeTabId: newTabId });
      return;
    }

    if (tabs.length >= MAX_TABS) {
      alert(`탭은 최대 ${MAX_TABS}개까지 열 수 있습니다.`);
      return;
    }

    const newTab: TabInfo = { ...tab, id: newTabId };
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTabId,
    }));
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
}));

export default useTabStore;