export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

// Auth types
export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface LoginRequest {
  username: string;
  password: string;
  remember_me?: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface UserCreate {
  id: string;
  username: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  password?: string;
}

export interface UserApply {
  username: string;
  email: string;
  name: string;
  password: string;
}

export interface UserUpdate {
  email?: string;
  name?: string;
  role?: string;
  is_active?: boolean;
  password?: string;
}

export interface UserListResponse {
  total: number;
  users: User[];
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<void>;
}

// Log types
export interface LogEntry {
  _id: string;
  timestamp: string;
  _index: string;
  message: string;
}

export interface LogStreamResponse {
  logs: LogEntry[];
  last_timestamp: string;
}


// 알림 규칙
export interface NotificationRule {
  id: string;
  name: string;
  description?: string;
  target_index: string;
  condition_type: string;
  condition_config: Record<string, any>;
  message_template: string;
  severity: string;
  interval_min: number;
  window_min: number;
  dedup_ttl_min: number;
  dedup_key_template: string;
  receiver: Record<string, any>;
  is_active: boolean;
  last_run_at?: string;
  last_success_at?: string;
  last_triggered_at?: string;
  last_error?: string;
  error_count: number;
  total_alerts_count: number;
  created_at: string;
  updated_at: string;
}

export interface NotificationRuleCreate extends Omit<NotificationRule, 'id' | 'created_at' | 'updated_at' | 'error_count' | 'total_alerts_count'> {}
export interface NotificationRuleUpdate extends Partial<NotificationRuleCreate> {}

// 알림 내역 (cs_alerts 인덱스)
export interface NotificationHistory {
  id: string;
  rule_id: string;
  
  // 규칙 메타데이터
  rule_name: string;
  rule_description?: string;
  rule_severity: string;
  rule_target_index: string;
  
  // 메시지 관련
  message: string;              // 렌더링된 메시지
  message_template: string;     // 원본 템플릿
  
  // 이벤트 관련
  event_ref: string;            // Document ID
  event_index: string;          // 원본 인덱스명
  event_source?: Record<string, any>;  // 원본 _source
  
  // 기타
  dedup_key: string;
  receiver: Record<string, any> | null;
  status: string;
  error_message: string | null;
  severity: string | null;
  created_at: string;
  sent_at: string | null;

  // 발송 증적 필드 (webhook 등)
  channel?: string;
  endpoint?: string;
  request_headers?: Record<string, any>;
  outgoing_payload?: Record<string, any>;
  response_status_code?: number;
  response_body?: string;
  
  // 하위 호환성 (기존 코드)
  title?: string;
  description?: string;
}
