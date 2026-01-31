import { create } from 'zustand';

interface TabInfo {
  id: string; // 탭의 고유 ID (예: 'user-management', 'password-policy')
  label: string; // 탭에 표시될 이름 (예: '사용자 관리')
  component: string; // 탭에 렌더링될 컴포넌트의 키 (예: 'UserManagementTab')
  props?: Record<string, any>; // 탭 컴포넌트에 전달될 추가 props
}

interface TabState {
  tabs: TabInfo[];
  activeTabId: string | null;
  addTab: (tab: Omit<TabInfo, 'id'>, generateId?: (tab: Omit<TabInfo, 'id'>) => string) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
}

const MAX_TABS = 5;

const useTabStore = create<TabState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  addTab: (tab, generateId = (t) => t.component) => {
    const newTabId = generateId(tab);
    const { tabs } = get();

    // 이미 열려있는 탭인지 확인
    const existingTab = tabs.find((t) => t.id === newTabId);
    if (existingTab) {
      set({ activeTabId: newTabId }); // 이미 있으면 해당 탭 활성화
      return;
    }

    // 최대 탭 개수 확인
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
    // 제거되는 탭이 활성 탭이었다면, 다른 탭을 활성화
    if (activeTabId === id) {
      if (newTabs.length > 0) {
        // 남은 탭 중 첫 번째 탭을 활성화
        newActiveTabId = newTabs[0].id;
      } else {
        newActiveTabId = null; // 남은 탭이 없으면 활성 탭 없음
      }
    }

    set({ tabs: newTabs, activeTabId: newActiveTabId });
  },

  setActiveTab: (id) => set({ activeTabId: id }),
}));

export default useTabStore;
