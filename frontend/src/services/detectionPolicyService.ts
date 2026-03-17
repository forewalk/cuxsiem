import api from './api';
import type {
  DetectionPolicy,
  DetectionPolicyCreate,
  DetectionPolicyUpdate,
  DetectionEvent,
} from '@/types';

interface ListPoliciesParams {
  skip?: number;
  limit?: number;
  sort_by?: string;
  order?: string;
  query?: string;
  severity?: string;
  is_active?: boolean;
}

interface ListEventsParams {
  skip?: number;
  limit?: number;
  sort_by?: string;
  order?: string;
  policy_id?: string;
  severity?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
}

export const detectionPolicyService = {
  list: async (params: ListPoliciesParams = {}) => {
    const response = await api.get<{ total: number; items: DetectionPolicy[] }>(
      '/api/v1/detection-policies',
      { params },
    );
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<DetectionPolicy>(`/api/v1/detection-policies/${id}`);
    return response.data;
  },

  create: async (data: DetectionPolicyCreate) => {
    const response = await api.post<DetectionPolicy>('/api/v1/detection-policies', data);
    return response.data;
  },

  update: async (id: string, data: DetectionPolicyUpdate) => {
    const response = await api.put<DetectionPolicy>(`/api/v1/detection-policies/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    await api.delete(`/api/v1/detection-policies/${id}`);
  },

  testQuery: async (target_index: string, condition_config: Record<string, unknown>) => {
    const response = await api.post('/api/v1/detection-policies/test-query', {
      target_index,
      condition_config,
    });
    return response.data;
  },

  listEvents: async (params: ListEventsParams = {}) => {
    const response = await api.get<{ total: number; items: DetectionEvent[] }>(
      '/api/v1/detection-events',
      { params },
    );
    return response.data;
  },

  updateEventStatus: async (eventId: string, status: string) => {
    const response = await api.put<DetectionEvent>(
      `/api/v1/detection-events/${eventId}/status`,
      { status },
    );
    return response.data;
  },
};
