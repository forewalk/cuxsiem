import api from './api';
import type { SigmaRuleListItem, SigmaRuleDetail, SigmaRuleStats, SigmaRuleFilterOptions, CustomRuleCreate, CustomRuleUpdate } from '@/types';

interface ListRulesParams {
  skip?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: string;
  search?: string;
  severity?: string;
  status?: string;
  log_source_product?: string;
  log_source_category?: string;
  log_type_keywords?: string;
  mitre_technique_id?: string;
  rule_type?: 'sigma' | 'custom';
}

export const detectionRuleService = {
  list: async (params: ListRulesParams = {}) => {
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

  create: async (data: CustomRuleCreate) => {
    const response = await api.post<SigmaRuleDetail>('/api/v1/sigma-rules', data);
    return response.data;
  },

  update: async (id: string, data: CustomRuleUpdate) => {
    const response = await api.put<SigmaRuleDetail>(`/api/v1/sigma-rules/${id}`, data);
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

  getFilterOptions: async (logSourceProduct?: string) => {
    const params: Record<string, string> = {};
    if (logSourceProduct) params.log_source_product = logSourceProduct;
    const response = await api.get<SigmaRuleFilterOptions>('/api/v1/sigma-rules/filter-options', { params });
    return response.data;
  },
};

// Backward-compatible alias
export const sigmaRuleService = detectionRuleService;
