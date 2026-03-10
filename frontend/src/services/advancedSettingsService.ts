import api from './api';

export interface AdvancedSettings {
  user_register: boolean;
  allow_multiple_sessions: boolean;
  tab_count?: number;
  user_id?: string;
  pagination_size?: number;
  time_filter_duration?: number;
  time_filter_unit?: string;
  pixel_mode?: boolean;
  log_stream_size?: number;
  log_stream_refresh?: number;
  session_duration?: number;
  otp_required?: boolean;
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
  getPublicSettings: async (): Promise<{ user_register: boolean; otp_required: boolean }> => {
    const response = await api.get('/api/v1/advanced-settings/public');
    return response.data;
  },
  updateSettings: async (settings: AdvancedSettings): Promise<AdvancedSettings> => {
    const response = await api.put('/api/v1/advanced-settings', settings);
    return response.data;
  }
};
