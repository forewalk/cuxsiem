import {useCallback, useEffect, useRef, useState} from 'react';

interface UseWebSocketOptions {
  url: string;
  token: string | null;
  onMessage?: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  send: (data: any) => void;
  reconnect: () => void;
}

/**
 * WebSocket 연결 관리 훅
 *
 * - 자동 재연결
 * - JWT 토큰 인증
 * - 에러 처리
 * - Ping/Pong (연결 유지)
 */
export const useWebSocket = ({
                               url,
                               token,
                               onMessage,
                               onConnect,
                               onDisconnect,
                               onError,
                               reconnectInterval = 3000,
                               maxReconnectAttempts = 10
                             }: UseWebSocketOptions): UseWebSocketReturn => {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectCount = useRef(0);
  const reconnectTimeout = useRef<number | undefined>(undefined);
  const pingInterval = useRef<number | undefined>(undefined);
  const shouldReconnect = useRef(true);

  // 콜백을 ref로 저장하여 재연결 방지
  const onMessageRef = useRef(onMessage);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onMessageRef.current = onMessage;
    onConnectRef.current = onConnect;
    onDisconnectRef.current = onDisconnect;
    onErrorRef.current = onError;
  });

  const connect = useCallback(() => {
    if (!token) return;

    if (ws.current?.readyState === WebSocket.OPEN) return;

    try {
      // 보안을 위해 쿼리 파라미터 대신 Sec-WebSocket-Protocol 헤더를 통해 토큰 전달
      // 브라우저 WebSocket API는 커스텀 헤더를 직접 지원하지 않으므로 subprotocol 활용
      const wsUrl = url;
      ws.current = new WebSocket(wsUrl, token);

      ws.current.onopen = () => {
        setIsConnected(true);
        reconnectCount.current = 0;

        // Ping 시작 (30초마다)
        pingInterval.current = setInterval(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send('ping');
          }
        }, 30000);

        onConnectRef.current?.();
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Pong/Connection 응답은 처리 안 함
          if (data.type !== 'pong' && data.type !== 'connection') {
            onMessageRef.current?.(data);
          }
        } catch {
          // 메시지 파싱 오류 무시
        }
      };

      ws.current.onerror = (error) => {
        onErrorRef.current?.(error);
      };

      ws.current.onclose = () => {
        setIsConnected(false);

        // Ping 중지
        if (pingInterval.current) {
          clearInterval(pingInterval.current);
        }

        onDisconnectRef.current?.();

        // 재연결 시도
        if (shouldReconnect.current && reconnectCount.current < maxReconnectAttempts) {
          reconnectCount.current++;
          reconnectTimeout.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

    } catch {
      // 연결 실패 무시
    }
  }, [url, token, reconnectInterval, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    shouldReconnect.current = false;

    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }

    if (pingInterval.current) {
      clearInterval(pingInterval.current);
    }

    if (ws.current) {
      // CONNECTING이나 OPEN 상태일 때만 close 호출
      if (ws.current.readyState === WebSocket.CONNECTING || ws.current.readyState === WebSocket.OPEN) {
        ws.current.close();
      }
      ws.current = null;
    }

    setIsConnected(false);
  }, []);

  const send = useCallback((data: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      ws.current.send(message);
    }
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    shouldReconnect.current = true;
    reconnectCount.current = 0;
    connect();
  }, [connect, disconnect]);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    send,
    reconnect
  };
};
