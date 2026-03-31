import api from "./api";

export interface TargetHost {
  url: string;
  port: number;
  path?: string;
}

export interface ActionLogic {
  dsl: string;
  type: string;
}

export interface Action {
  id: string;
  name: string;
  description?: string;
  target_host: TargetHost;
  action_logic: ActionLogic;
  headers?: Record<string, string>;
  user_id: string;
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface ActionCreate {
  name: string;
  description?: string;
  target_host: TargetHost;
  action_logic: ActionLogic;
  headers?: Record<string, string>;
  user_id?: string;
}

export interface ActionUpdate {
  name?: string;
  description?: string;
  target_host?: TargetHost;
  action_logic?: ActionLogic;
  headers?: Record<string, string>;
}

const ActionService = {
  getActions: async (skip = 0, limit = 100): Promise<Action[]> => {
    const response = await api.get("/api/v1/actions/", { params: { skip, limit } });
    return response.data;
  },

  getAction: async (id: string): Promise<Action> => {
    const response = await api.get(`/api/v1/actions/${id}`);
    return response.data;
  },

  createAction: async (action: ActionCreate): Promise<string> => {
    const response = await api.post("/api/v1/actions/", action);
    return response.data;
  },

  updateAction: async (id: string, action: ActionUpdate): Promise<boolean> => {
    const response = await api.put(`/api/v1/actions/${id}`, action);
    return response.data;
  },

  deleteAction: async (id: string): Promise<boolean> => {
    const response = await api.delete(`/api/v1/actions/${id}`);
    return response.data;
  },

  executeAction: async (id: string, logs: any[]): Promise<any> => {
    const response = await api.post(`/api/v1/actions/${id}/execute/`, logs);
    return response.data;
  },

  getActionHistories: async (skip = 0, limit = 100): Promise<any[]> => {
    const response = await api.get("/api/v1/action-history/", { params: { skip, limit } });
    return response.data;
  },

  getActionHistory: async (id: string): Promise<any> => {
    const response = await api.get(`/api/v1/action-history/${id}`);
    return response.data;
  },
};

export default ActionService;
