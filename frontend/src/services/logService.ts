import api from "./api";
import type { LogStreamResponse } from "../types";

export const logService = {
  /**
   * 실시간 로그 스트리밍 데이터를 조회합니다.
   * @param lastTimestamp 마지막으로 확인된 로그의 타임스탬프
   * @param limit 조회할 로그 개수
   */
  getLogStream: async (
    lastTimestamp?: string | null, 
    limit: number = 100,
    q?: string
  ): Promise<LogStreamResponse> => {
    const params = new URLSearchParams();
    if (lastTimestamp) {
      params.append("last_timestamp", lastTimestamp);
    }
    if (q) {
      params.append("q", q);
    }
    params.append("limit", limit.toString());

    const response = await api.get<LogStreamResponse>(`/api/v1/logs/stream?${params.toString()}`);
    return response.data;
  },
};
