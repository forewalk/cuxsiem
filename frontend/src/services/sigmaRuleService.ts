import type {
  ConvertPreviewResult,
  CustomRuleCreate,
  CustomRuleUpdate,
  SigmaRuleDetail,
  SigmaRuleListItem,
} from '@/types';
import api from './api';

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
  log_source_service?: string;
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

  delete: async (id: string) => {
    await api.delete(`/api/v1/sigma-rules/${id}`);
  },

  bulkDelete: async (ids: string[]) => {
    const response = await api.post('/api/v1/sigma-rules/bulk-delete', { ids });
    return response.data;
  },


  getLogsourceOptions: async (params?: { product?: string; category?: string }) => {
    const response = await api.get<{
      products: { value: string; count: number }[];
      categories: { value: string; count: number }[];
      services: { value: string; count: number }[];
    }>('/api/v1/sigma-rules/logsource-options', { params });
    return response.data;
  },

  getFieldMappingPresetDetail: async (presetId: string) => {
    const response = await api.get<{ id: string; name: string; description: string; mappings: Record<string, string> }>(
      `/api/v1/sigma-rules/field-mappings/presets/${presetId}`,
    );
    return response.data;
  },

  convertPreview: async (ruleId: string, presetId?: string) => {
    const response = await api.post<ConvertPreviewResult>(
      '/api/v1/sigma-rules/convert-preview',
      { rule_id: ruleId, preset_id: presetId },
    );
    return response.data;
  },

  testQuery: async (targetIndex: string, queryBody: Record<string, unknown>) => {
    const response = await api.post('/api/v1/sigma-rules/test-query', {
      target_index: targetIndex,
      query_body: queryBody,
    });
    return response.data;
  },

  testRuleQuery: async (ruleId: string, targetIndex: string) => {
    const response = await api.post('/api/v1/sigma-rules/test-query', {
      rule_id: ruleId,
      target_index: targetIndex,
    });
    return response.data;
  },

};
