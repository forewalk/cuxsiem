import api from './api';

export interface NotificationRule {
  id: string;
  name: string;
  target_index: string;
  condition_type: string;
  condition_config: never;
  severity: string;
  interval_min: number;
  window_min: number;
  dedup_ttl_min: number;
  dedup_key_template: string;
  channels: never;
  receiver: never;
  is_active: boolean;
  last_run_at?: string;
  last_success_at?: string;
  last_triggered_at?: string;
  last_error?: string;
  error_count: number;
  total_alerts_count: number;
  created_at: string;
  updated_at: string;
}

export const notificationService = {
  getRules: async (skip: number = 0, limit: number = 100) => {
    const response = await api.get<NotificationRule[]>('/api/v1/notification/rules', {
      params: { skip, limit }
    });
    return response.data;
  },

  getRule: async (id: string) => {
    const response = await api.get<NotificationRule>(`/api/v1/notification/rules/${id}`);
    return response.data;
  },

  createRule: async (rule: never) => {
    const response = await api.post<NotificationRule>('/api/v1/notification/rules', rule);
    return response.data;
  },

  updateRule: async (id: string, rule: never) => {
    const response = await api.put<NotificationRule>(`/api/v1/notification/rules/${id}`, rule);
    return response.data;
  },

  deleteRule: async (id: string) => {
    await api.delete(`/api/v1/notification/rules/${id}`);
  },

  getNotifications: async (skip: number = 0, limit: number = 100) => {
    const response = await api.get<never[]>('/api/v1/notification/', {
      params: { skip, limit }
    });
    return response.data;
  }
};
