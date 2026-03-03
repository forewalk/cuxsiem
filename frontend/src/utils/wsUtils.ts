/**
 * WebSocket alert 엔드포인트 URL을 반환합니다.
 * - 개발 환경: VITE_API_BASE_URL 환경 변수 사용
 * - 프로덕션: 현재 호스트 기반 (Nginx 리버스 프록시 통과)
 */
export function getAlertWsUrl(): string {
  if (import.meta.env.DEV && import.meta.env.VITE_API_BASE_URL) {
    const wsBase = (import.meta.env.VITE_API_BASE_URL as string).replace(/^http/, 'ws');
    return `${wsBase}/api/v1/ws/alerts`;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/api/v1/ws/alerts`;
}
