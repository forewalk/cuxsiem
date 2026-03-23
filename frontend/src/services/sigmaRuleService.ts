import api from './api';
import type { SigmaRuleListItem, SigmaRuleDetail, SigmaRuleStats, SigmaRuleFilterOptions, CustomRuleCreate, CustomRuleUpdate, ConversionStats, ReconvertResult, FieldMappingPreset, ConvertPreviewResult } from '@/types';

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

  toggle: async (id: string) => {
    const response = await api.put<{ id: string; status: string; updated_at: string }>(
      `/api/v1/sigma-rules/${id}/toggle`,
    );
    return response.data;
  },

  delete: async (id: string) => {
    await api.delete(`/api/v1/sigma-rules/${id}`);
  },

  bulkDelete: async (ids: string[]) => {
    const response = await api.post('/api/v1/sigma-rules/bulk-delete', { ids });
    return response.data;
  },

  getStats: async () => {
    const response = await api.get<SigmaRuleStats>('/api/v1/sigma-rules/stats');
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

  getFilterOptions: async (logSourceProduct?: string) => {
    const params: Record<string, string> = {};
    if (logSourceProduct) params.log_source_product = logSourceProduct;
    const response = await api.get<SigmaRuleFilterOptions>('/api/v1/sigma-rules/filter-options', { params });
    return response.data;
  },

  getConversionStats: async () => {
    const response = await api.get<ConversionStats>('/api/v1/sigma-rules/conversion-stats');
    return response.data;
  },

  reconvertSingle: async (id: string) => {
    const response = await api.post<ReconvertResult>(`/api/v1/sigma-rules/${id}/reconvert`);
    return response.data;
  },

  reconvertBulk: async (filter?: Record<string, string>) => {
    const response = await api.post<{ job_id: string; status: string; requested_count: number }>(
      '/api/v1/sigma-rules/reconvert',
      filter ? { filter } : {},
    );
    return response.data;
  },

  getFieldMappingPresets: async () => {
    const response = await api.get<{ presets: FieldMappingPreset[] }>(
      '/api/v1/sigma-rules/field-mappings/presets',
    );
    return response.data.presets;
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

  getIndexFields: async (indexPattern: string) => {
    const response = await api.get<string[]>(
      '/api/v1/sigma-rules/index-fields',
      { params: { index: indexPattern } },
    );
    return response.data;
  },
};

// Backward-compatible alias
export const sigmaRuleService = detectionRuleService;
