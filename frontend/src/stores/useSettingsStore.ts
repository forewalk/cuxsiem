import { create } from 'zustand';
import { advancedSettingsService, type AdvancedSettings } from '../services/advancedSettingsService';

interface SettingsState {
  settings: AdvancedSettings | null;
  loading: boolean;
  fetchSettings: (force?: boolean) => Promise<AdvancedSettings | null>;
  updateSettings: (newSettings: AdvancedSettings) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  loading: false,
  fetchSettings: async (force = false) => {
    if (!force && get().settings) return get().settings;
    
    set({ loading: true });
    try {
      const settings = await advancedSettingsService.getSettings();
      set({ settings, loading: false });
      return settings;
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      set({ loading: false });
      return null;
    }
  },
  updateSettings: (newSettings: AdvancedSettings) => {
    set({ settings: newSettings });
  },
}));
