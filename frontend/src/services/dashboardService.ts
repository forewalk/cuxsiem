import api from "./api";

export interface HistogramItem {
  timestamp: string;
  count: number;
}

export interface SeverityStat {
  label: string;
  value: number;
}

export interface DashboardSummary {
  total_logs: number;
  critical_logs: number;
  warning_logs: number;
}

export interface DashboardStatsResponse {
  summary: DashboardSummary;
  histogram: HistogramItem[];
  severity_stats: SeverityStat[];
  last_updated: string;
}

export const getDashboardIndices = async (): Promise<string[]> => {
  const response = await api.get<string[]>("/api/v1/dashboard/indices");
  return response.data;
};

export const getDashboardStats = async (
  indexName?: string, 
  timeRange: string = "15m",
  query?: string
): Promise<DashboardStatsResponse> => {
  let url = `/api/v1/dashboard/stats?time_range=${timeRange}`;
  if (indexName) url += `&index_name=${indexName}`;
  if (query) url += `&q=${encodeURIComponent(query)}`;
  
  const response = await api.get<DashboardStatsResponse>(url);
  return response.data;
};
