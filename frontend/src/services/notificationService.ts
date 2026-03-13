import api from './api';
import type { NotificationRule, NotificationRuleCreate, NotificationRuleUpdate, NotificationHistory } from '@/types';

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
  /* 알림 규칙 목록 조회 */
  getRules: async (params: GetRulesParams = {}) => {
    const response = await api.get<{ total: number, items: NotificationRule[] }>('/api/v1/notifications/rules', {
      params,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    return response.data;
  },

  getRule: async (id: string) => {
    const response = await api.get<NotificationRule>(`/api/v1/notifications/rules/${id}`, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
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

  /* DSL 쿼리 테스트 */
  testQuery: async (targetIndex: string, conditionConfig: any) => {
    const response = await api.post<any>('/api/v1/notifications/rules/test-query', {
      target_index: targetIndex,
      condition_config: conditionConfig
    });
    return response.data;
  },

  /* 트리거 조건 테스트 */
  testTrigger: async (targetIndex: string, conditionConfig: any, triggerCondition: string) => {
    const response = await api.post<{
      evaluation: boolean;
      total: number;
      has_aggregations: boolean;
    }>('/api/v1/notifications/rules/test-trigger', {
      target_index: targetIndex,
      condition_config: conditionConfig,
      trigger_condition: triggerCondition
    });
    return response.data;
  },

  /* 알림 목록 조회 */
  getNotifications: async (params: GetNotificationsParams = {}) => {
    const response = await api.get<{ total: number, items: NotificationHistory[] }>('/api/v1/notifications/', {
      params
    });
    return response.data;
  },

  /* Webhook 연결 테스트 */
  testWebhook: async (url: string, headers?: Record<string, string>) => {
    const response = await api.post('/api/v1/notifications/webhook/test', { url, headers });
    return response.data;
  },

  /* 규칙 Export */
  exportRules: async () => {
    const response = await api.get('/api/v1/notifications/rules/export');
    return response.data;
  },

  /* 규칙 Import */
  importRules: async (rules: any[], overwrite: boolean = false) => {
    const response = await api.post<{
      created: number;
      updated: number;
      errors: any[];
      total_processed: number;
    }>('/api/v1/notifications/rules/import', { rules, overwrite });
    return response.data;
  },
};
