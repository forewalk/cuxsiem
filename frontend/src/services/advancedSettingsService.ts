import api from './api';

export interface AdvancedSettings {
  user_register: boolean;
  allow_multiple_sessions: boolean;
  tab_count?: number;
  pagination_size?: number;
  time_filter_duration?: number;
  time_filter_unit?: string;
  pixel_mode?: boolean;
  log_stream_size?: number;
  log_stream_refresh?: number;
  session_duration?: number;
  role_names?: {
    admin: string;
    user: string;
    monitoring: string;
    approver: string;
  };
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
