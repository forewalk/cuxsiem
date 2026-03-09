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
  otp_enabled: boolean;
  created_at: string;
  last_login_at: string | null;
  deleted_at?: string | null;
}

export interface LoginRequest {
  username: string;
  password: string;
  remember_me?: boolean;
  force?: boolean;
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
  login: (username: string, password: string, rememberMe?: boolean, force?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<void>;
}

// Log types
export interface LogEntry {
  _id: string;
  timestamp: string;
  _index: string;
  message: string;
  _source?: Record<string, any>;
}

export interface LogStreamResponse {
  logs: LogEntry[];
  last_timestamp: string;
}

export interface IndexListResponse {
  indices: string[];
}


export interface NotificationReceiver {
  type: string;
  values: string[];
  webhook_url?: string;
  webhook_headers?: Record<string, string>;
}

// 알림 규칙
export interface NotificationRule {
  id: string;
  name: string;
  description?: string;
  target_index: string;
  condition_config: Record<string, unknown>;
  message_template: string;
  severity: string;
  interval_min: number;
  trigger_condition?: string;
  receiver: NotificationReceiver;
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

export interface NotificationRuleCreate {
  name: string;
  description?: string;
  target_index: string;
  condition_config: Record<string, unknown>;
  message_template: string;
  severity: string;
  interval_min: number;
  trigger_condition?: string;
  receiver: NotificationReceiver;
  is_active: boolean;
}

export interface NotificationRuleUpdate {
  name?: string;
  description?: string;
  target_index?: string;
  condition_config?: Record<string, unknown>;
  message_template?: string;
  severity?: string;
  interval_min?: number;
  trigger_condition?: string;
  receiver?: NotificationReceiver;
  is_active?: boolean;
}

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
  event_source?: Record<string, unknown>;  // 원본 _source

  // 기타
  dedup_key: string;
  receiver: NotificationReceiver | null;
  status: string;
  error_message: string | null;
  severity: string | null;
  created_at: string;

  // 하위 호환성 (기존 코드와 호환)
  title?: string;
  description?: string;
}
