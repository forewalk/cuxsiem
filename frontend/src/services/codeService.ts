import api from './api';

export interface CodeResponse {
  id: string;
  code_name: string;
  updated_at: string;
}

export const codeService = {
  getRoleCodes: async (): Promise<CodeResponse[]> => {
    const response = await api.get('/api/v1/codes');
    return response.data;
  },
  updateRoleCode: async (codeId: string, codeName: string): Promise<CodeResponse> => {
    const response = await api.put(`/api/v1/codes/${codeId}`, { id: codeId, code_name: codeName });
    return response.data;
  }
};
