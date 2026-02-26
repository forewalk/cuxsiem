import api from './api';

export interface AdvancedSettings {
  user_register: boolean;
  tab_count?: number;
  updated_at?: string;
}

export const advancedSettingsService = {
  getSettings: async (): Promise<AdvancedSettings> => {
    const response = await api.get('/api/v1/advanced-settings');
    return response.data;
  },
  updateSettings: async (settings: AdvancedSettings): Promise<AdvancedSettings> => {
    const response = await api.put('/api/v1/advanced-settings', settings);
    return response.data;
  }
};
