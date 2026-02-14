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
  let url = `/api/v1/dashboard/logs?size=${size}&offset=${offset}`;
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
  fromValue?: number,
  fromUnit?: string,
  toValue?: number,
  toUnit?: string,
  fromDate?: string,
  toDate?: string,
  query?: string
): Promise<DashboardStatsResponse> => {
  let url = `/api/v1/dashboard/stats?`;
  const params: string[] = [];
  if (fromValue !== undefined) params.push(`from_value=${fromValue}`);
  if (fromUnit) params.push(`from_unit=${fromUnit}`);
  if (toValue !== undefined) params.push(`to_value=${toValue}`);
  if (toUnit) params.push(`to_unit=${toUnit}`);
  if (fromDate) params.push(`from_date=${fromDate}`);
  if (toDate) params.push(`to_date=${toDate}`);
  if (query) params.push(`q=${encodeURIComponent(query)}`);
  
  url += params.join('&');
  const response = await api.get<DashboardStatsResponse>(url);
  return response.data;
};