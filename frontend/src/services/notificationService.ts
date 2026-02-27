import api from './api';
import type { NotificationRule, NotificationRuleCreate, NotificationRuleUpdate, NotificationHistory } from '@/types';

interface GetNotificationsParams {
  skip?: number;
  limit?: number;
  query?: string;
  severities?: string;
  from_date?: string;
  to_date?: string;
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

  /* 알림 목록 조회 */
  getNotifications: async (params: GetNotificationsParams = {}) => {
    const response = await api.get<{ total: number, items: NotificationHistory[] }>('/api/v1/notifications/', {
      params
    });
    return response.data;
  }
};
