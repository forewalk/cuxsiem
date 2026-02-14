import api from './api';
import type { NotificationRule, NotificationRuleCreate, NotificationRuleUpdate, NotificationHistory } from '@/types';

export const notificationService = {
  /* 알림 규칙 목록 조회 */
  getRules: async (skip: number = 0, limit: number = 100) => {
    const response = await api.get<{ total: number, items: NotificationRule[] }>('/api/v1/notifications/rules', {
      params: { skip, limit }
    });
    return response.data;
  },

  getRule: async (id: string) => {
    const response = await api.get<NotificationRule>(`/api/v1/notifications/rules/${id}`);
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


  /* 알림 목록 조회 */
  getNotifications: async (skip: number = 0, limit: number = 100) => {
    const response = await api.get<{ total: number, items: NotificationHistory[] }>('/api/v1/notifications/', {
      params: { skip, limit }
    });
    return response.data;
  }
};
