import api from './api';
import type { SigmaRuleListItem, SigmaRuleDetail, SigmaRuleStats } from '@/types';

interface ListSigmaRulesParams {
  skip?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: string;
  search?: string;
  severity?: string;
  status?: string;
  log_source_product?: string;
  mitre_technique_id?: string;
}

export const sigmaRuleService = {
  list: async (params: ListSigmaRulesParams = {}) => {
    const response = await api.get<{ total: number; items: SigmaRuleListItem[] }>(
      '/api/v1/sigma-rules',
      { params },
    );
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<SigmaRuleDetail>(`/api/v1/sigma-rules/${id}`);
    return response.data;
  },

  toggle: async (id: string) => {
    const response = await api.put<{ id: string; status: string; updated_at: string }>(
      `/api/v1/sigma-rules/${id}/toggle`,
    );
    return response.data;
  },

  delete: async (id: string) => {
    await api.delete(`/api/v1/sigma-rules/${id}`);
  },

  getStats: async () => {
    const response = await api.get<SigmaRuleStats>('/api/v1/sigma-rules/stats');
    return response.data;
  },
};
