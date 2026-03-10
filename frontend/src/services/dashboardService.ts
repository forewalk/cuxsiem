import api from "./api";

export interface HistogramItem {
  timestamp: string;
  count: number;
}

export interface SeverityStat {
  label: string;
  value: number;
}

export interface IndexField {
  name: string;
  type: string;
}

export interface DashboardPanel {
  dashboard_id: string;
  panel_key: string;
  custom_titles: Record<string, string>;
  default_title_key: string;
  grid_width: number;
  grid_height: number;
  custom_query: string;
  default_query: string;
  widget_type: string;
  target_field?: string;
  current_value?: number;
  chart_data?: SeverityStat[];
  is_visible: boolean;
  display_order: number;
}

export interface DashboardSummary {
  total_logs: number;
  total_threats: number;
  resolved_threats: number;
  unresolved_threats: number;
  active_threats: number;
  blocked_threats: number;
  mitigated_threats: number;
  suspicious_threats: number;
}

export interface DashboardStatsResponse {
  summary: DashboardSummary;
  histogram: HistogramItem[];
  severity_stats: SeverityStat[];
  detection_stats: SeverityStat[];
  prevalent_threats: SeverityStat[];
  mitigation_stats: SeverityStat[];
  agent_status_stats: SeverityStat[];
  agent_os_dist: SeverityStat[];
  agent_version_dist: SeverityStat[];
  agent_scan_status: SeverityStat[];
  panels: DashboardPanel[];
  last_updated: string;
}

export const getDashboardIndices = async (): Promise<string[]> => {
  const response = await api.get<string[]>("/api/v1/dashboard/indices");
  return response.data;
};

export const getIndexFields = async (indexName: string): Promise<IndexField[]> => {
  const response = await api.get<IndexField[]>(`/api/v1/dashboard/fields/${indexName}`);
  return response.data;
};

export const getIndexLogs = async (
  dashboardId: string = "threat-status",
  fromValue?: number,
  fromUnit?: string,
  toValue?: number,
  toUnit?: string,
  fromDate?: string,
  toDate?: string,
  query?: string,
  size: number = 20,
  offset: number = 0
): Promise<any[]> => {
  let url = `/api/v1/dashboard/logs?dashboard_id=${dashboardId}&size=${size}&offset=${offset}`;
  if (fromValue !== undefined) url += `&from_value=${fromValue}`;
  if (fromUnit) url += `&from_unit=${fromUnit}`;
  if (toValue !== undefined) url += `&to_value=${toValue}`;
  if (toUnit) url += `&to_unit=${toUnit}`;
  if (fromDate) url += `&from_date=${fromDate}`;
  if (toDate) url += `&to_date=${toDate}`;
  if (query) url += `&q=${encodeURIComponent(query)}`;
  
  const response = await api.get<any[]>(url);
  return response.data;
};

export const getDashboardStats = async (
  dashboardId: string = "threat-status",
  fromValue?: number, fromUnit?: string, toValue?: number, toUnit?: string, fromDate?: string, toDate?: string, query?: string,
  panels?: DashboardPanel[] // 추가: 로컬 패널 설정
): Promise<DashboardStatsResponse> => {
  let url = `/api/v1/dashboard/stats${panels ? `/${dashboardId}` : ''}?dashboard_id=${dashboardId}`;
  if (fromValue !== undefined) url += `&from_value=${fromValue}`;
  if (fromUnit) url += `&from_unit=${fromUnit}`;
  if (toValue !== undefined) url += `&to_value=${toValue}`;
  if (toUnit) url += `&to_unit=${toUnit}`;
  if (fromDate) url += `&from_date=${fromDate}`;
  if (toDate) url += `&to_date=${toDate}`;
  if (query) url += `&q=${encodeURIComponent(query)}`;

  // 패널 설정이 있으면 POST로 요청하여 실시간 집계 결과를 받아옴
  if (panels) {
    const response = await api.post<DashboardStatsResponse>(url, panels);
    return response.data;
  }

  const response = await api.get<DashboardStatsResponse>(url);
  return response.data;
};

export const saveDashboardLayout = async (dashboardId: string, panels: DashboardPanel[]): Promise<void> => {
  await api.post(`/api/v1/dashboard/save/${dashboardId}`, panels);
};

export const resetDashboard = async (dashboardId: string): Promise<void> => {
  await api.post(`/api/v1/dashboard/reset/${dashboardId}`);
};

/**
 * 사용자별 리스트 컬럼 순서 조회
 */
export const getColumnSettings = async (viewId: string): Promise<string[]> => {
  const response = await api.get<string[]>(`/api/v1/dashboard/columns/${viewId}`);
  return response.data;
};

/**
 * 사용자별 리스트 컬럼 순서 저장
 */
export const saveColumnSettings = async (viewId: string, columns: string[]): Promise<boolean> => {
  const response = await api.post(`/api/v1/dashboard/columns/${viewId}`, columns);
  return response.data.status === "success";
};

/**
 * 사용자별 리스트 컬럼 순서 초기화
 */
export const resetColumnSettings = async (viewId: string): Promise<boolean> => {
  const response = await api.delete(`/api/v1/dashboard/columns/${viewId}`);
  return response.data.status === "success";
};
