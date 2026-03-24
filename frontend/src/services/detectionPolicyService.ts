import type {
  Detector,
  DetectorCreate,
  DetectorUpdate,
  Finding,
} from '@/types';
import api from './api';

interface ListDetectorsParams {
  skip?: number;
  limit?: number;
  sort_by?: string;
  order?: string;
  query?: string;
  severity?: string;
  is_active?: boolean;
  detector_type?: string;
}

interface ListFindingsParams {
  skip?: number;
  limit?: number;
  sort_by?: string;
  order?: string;
  detector_id?: string;
  severity?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
}

export const detectorService = {
  list: async (params: ListDetectorsParams = {}) => {
    const response = await api.get<{ total: number; items: Detector[] }>(
      '/api/v1/detection-policies',
      { params },
    );
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<Detector>(`/api/v1/detection-policies/${id}`);
    return response.data;
  },

  create: async (data: DetectorCreate) => {
    const response = await api.post<Detector>('/api/v1/detection-policies', data);
    return response.data;
  },

  update: async (id: string, data: DetectorUpdate) => {
    const response = await api.put<Detector>(`/api/v1/detection-policies/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    await api.delete(`/api/v1/detection-policies/${id}`);
  },


  listFindings: async (params: ListFindingsParams = {}) => {
    const response = await api.get<{ total: number; items: Finding[] }>(
      '/api/v1/detection-events',
      { params },
    );
    return response.data;
  },

  updateFindingStatus: async (findingId: string, status: string) => {
    const response = await api.put<Finding>(
      `/api/v1/detection-events/${findingId}/status`,
      { status },
    );
    return response.data;
  },


  exportDetectors: async (ids?: string[]) => {
    const params = ids && ids.length > 0 ? { ids: ids.join(',') } : {};
    const response = await api.get('/api/v1/detection-policies/export', { params });
    return response.data;
  },

  importDetectors: async (detectors: Record<string, unknown>[], overwrite = false) => {
    const response = await api.post('/api/v1/detection-policies/import', { detectors, overwrite });
    return response.data;
  },

  bulkDelete: async (ids: string[]) => {
    const response = await api.post('/api/v1/detection-policies/bulk-delete', { ids });
    return response.data;
  },
};

