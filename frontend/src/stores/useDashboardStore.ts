import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DashboardState {
  customTitles: Record<string, string>; // { [panelId]: '사용자 정의 제목' }
  setPanelTitle: (panelId: string, title: string) => void;
  resetTitles: () => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      customTitles: {},
      setPanelTitle: (panelId, title) => 
        set((state) => ({
          customTitles: { ...state.customTitles, [panelId]: title }
        })),
      resetTitles: () => set({ customTitles: {} }),
    }),
    {
      name: 'dashboard-storage', // localStorage 키 이름
    }
  )
);
