import api from './api';
import type {
  NotificationRule,
  NotificationRuleCreate,
  NotificationRuleUpdate,
  NotificationHistory,
  SourceType,
  PreviewRequest,
  PreviewResponse,
} from '@/types';

interface GetNotificationsParams {
  skip?: number;
  limit?: number;
  query?: string;
  severities?: string;
  from_date?: string;
  to_date?: string;
  sort_by?: string;
  order?: string;
}

interface GetRulesParams {
  skip?: number;
  limit?: number;
  sort_by?: string;
  order?: string;
  query?: string;
  severities?: string;
  is_active?: boolean;
  from_date?: string;
  to_date?: string;
}

export const notificationService = {
  getRules: async (params: GetRulesParams = {}) => {
    const response = await api.get<{ total: number; items: NotificationRule[] }>(
      '/api/v1/notifications/rules',
      { params, headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' } },
    );
    return response.data;
  },

  getRule: async (id: string) => {
    const response = await api.get<NotificationRule>(
      `/api/v1/notifications/rules/${id}`,
      { headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' } },
    );
    return response.data;
  },

  createRule: async (rule: NotificationRuleCreate) => {
    const response = await api.post<NotificationRule>('/api/v1/notifications/rules', rule);
    return response.data;
  },

  updateRule: async (id: string, rule: NotificationRuleUpdate) => {
    const response = await api.put<NotificationRule>(`/api/v1/notifications/rules/${id}`, rule);
    return response.data;
  },

  deleteRule: async (id: string) => {
    await api.delete(`/api/v1/notifications/rules/${id}`);
  },

  getSourceTypes: async () => {
    const response = await api.get<SourceType[]>('/api/v1/notifications/source-types');
    return response.data;
  },

  previewRule: async (req: PreviewRequest) => {
    const response = await api.post<PreviewResponse>('/api/v1/notifications/rules/preview', req);
    return response.data;
  },

  getNotifications: async (params: GetNotificationsParams = {}) => {
    const response = await api.get<{ total: number; items: NotificationHistory[] }>(
      '/api/v1/notifications/',
      { params },
    );
    return response.data;
  },

  testWebhook: async (url: string, headers?: Record<string, string>) => {
    const response = await api.post('/api/v1/notifications/webhook/test', { url, headers });
    return response.data;
  },

  exportRules: async () => {
    const response = await api.get('/api/v1/notifications/rules/export');
    return response.data;
  },

  importRules: async (rules: unknown[], overwrite: boolean = false) => {
    const response = await api.post<{
      created: number;
      updated: number;
      errors: unknown[];
      total_processed: number;
    }>('/api/v1/notifications/rules/import', { rules, overwrite });
    return response.data;
  },
};
