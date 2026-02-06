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
  last_updated: string;
}

export const getDashboardIndices = async (): Promise<string[]> => {
  const response = await api.get<string[]>("/api/v1/dashboard/indices");
  return response.data;
};

export const getDashboardStats = async (
  fromValue: number = 15,
  fromUnit: string = "m",
  toValue?: number,
  toUnit?: string,
  query?: string
): Promise<DashboardStatsResponse> => {
  let url = `/api/v1/dashboard/stats?from_value=${fromValue}&from_unit=${fromUnit}`;
  if (toValue !== undefined && toUnit) {
    url += `&to_value=${toValue}&to_unit=${toUnit}`;
  }
  if (query) url += `&q=${encodeURIComponent(query)}`;
  
  const response = await api.get<DashboardStatsResponse>(url);
  return response.data;
};
