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
  webhook_body?: string;
}

// 알림 규칙
export interface ChangeHistoryEntry {
  user_id: string;
  changed_at: string;
  changed_fields?: string[];
}

export interface HealthCheckSourceConfig {
  condition: 'status_down' | 'latency_high' | 'cert_expiring';
  monitor_filter: string;
  latency_threshold_ms?: number | null;
  days_before?: number | null;
}

export interface SourceTypeCondition {
  id: string;
  name: string;
  fields: string[];
}

export interface SourceType {
  id: string;
  name: string;
  description: string;
  conditions: SourceTypeCondition[];
}

export interface NotificationRule {
  id: string;
  name: string;
  description?: string;
  source_type: string;
  source_config: Record<string, unknown>;
  message_template: string;
  severity: string;
  interval_min: number;
  receiver: NotificationReceiver;
  is_active: boolean;
  last_run_at?: string;
  last_triggered_at?: string;
  total_alerts_count: number;
  created_at: string;
  updated_at: string;
  change_history?: ChangeHistoryEntry[];
}

export interface NotificationRuleCreate {
  name: string;
  description?: string;
  source_type: string;
  source_config: Record<string, unknown>;
  message_template: string;
  severity: string;
  interval_min: number;
  receiver: NotificationReceiver;
  is_active: boolean;
}

export interface NotificationRuleUpdate {
  name?: string;
  description?: string;
  source_type?: string;
  source_config?: Record<string, unknown>;
  message_template?: string;
  severity?: string;
  interval_min?: number;
  receiver?: NotificationReceiver;
  is_active?: boolean;
  changed_fields?: string[];
}

export interface PreviewRequest {
  source_type: string;
  source_config: Record<string, unknown>;
}

export interface PreviewResponse {
  would_trigger: boolean;
  matched_count: number;
  details: Record<string, unknown>[];
  message_preview?: string;
}

export interface NotificationHistory {
  id: string;
  rule_id: string;
  rule_name: string;
  rule_description?: string;
  rule_severity: string;
  source_type?: string;
  source_detail?: Record<string, unknown>;
  message: string;
  message_template: string;
  dedup_key: string;
  receiver: NotificationReceiver | null;
  status: string;
  error_message: string | null;
  created_at: string;
  title?: string;
  description?: string;
}

// ── Detection Rule Types (Sigma + Custom 통합) ─────────────────────────────

export interface SigmaRuleListItem {
  id: string;
  type: 'sigma' | 'custom';
  sigma_id?: string | null;
  name: string;
  level_normalized: string;
  status: string;
  log_source_category: string | null;
  log_source_product: string | null;
  tags: string[];
  mitre_technique_ids: string[];
  mitre_tactic_ids: string[];
  revision: number;
  updated_at: string | null;
  query_conversion_status?: string | null;
}

export interface SigmaRuleDetail {
  id: string;
  type: 'sigma' | 'custom';
  sigma_id?: string | null;
  name: string;
  description: string | null;
  level_original: string | null;
  level_normalized: string;
  sigma_status: string | null;
  author: string | null;
  sigma_date: string | null;
  references: string[];
  license: string | null;
  log_source_category: string | null;
  log_source_product: string | null;
  log_source_service: string | null;
  detection_config: Record<string, unknown>;
  tags: string[];
  mitre_technique_ids: string[];
  mitre_tactic_ids: string[];
  false_positives: string[];
  status: string;
  is_deleted: boolean;
  raw_yaml: string | null;
  file_path: string | null;
  content_hash: string | null;
  revision: number;
  deleted_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
  opensearch_query?: Record<string, unknown> | null;
  query_conversion_status?: string | null;
  query_conversion_error?: string | null;
  query_pipeline_id?: string | null;
  query_converted_at?: string | null;
  source_sigma_id?: string | null;
  source_sigma_name?: string | null;
  applied_field_mappings?: FieldMapping[];
}

export interface ConversionStats {
  total: number;
  success: number;
  failed: number;
  pending: number;
  skipped: number;
  not_converted: number;
}

export interface ReconvertResult {
  id: string;
  query_conversion_status: string;
  opensearch_query?: Record<string, unknown> | null;
  query_pipeline_id?: string | null;
  query_converted_at?: string | null;
  query_conversion_error?: string | null;
}

export interface SigmaRuleStats {
  total: number;
  by_severity: Record<string, number>;
  by_status: Record<string, number>;
  mitre_coverage: Record<string, number>;
}

export interface SigmaRuleFilterOptions {
  log_types: string[];
  categories: string[];
  severities: string[];
  sources: string[];
}

export interface CustomRuleCreate {
  name: string;
  description?: string;
  detection_config: Record<string, unknown>;
  level_normalized?: string;
  log_source_category?: string;
  log_source_product?: string;
  log_source_service?: string;
  mitre_technique_ids?: string[];
  mitre_tactic_ids?: string[];
  false_positives?: string[];
  source_sigma_id?: string;
  applied_field_mappings?: FieldMapping[];
}

export interface FieldMappingPreset {
  id: string;
  name: string;
  description: string;
  field_count: number;
}

export interface ConvertPreviewResult {
  rule_id: string;
  rule_name: string;
  opensearch_query: Record<string, unknown> | null;
  status: string;
  error: string | null;
  applied_mappings: FieldMapping[];
  detection_config: Record<string, unknown>;
  metadata: {
    name: string;
    description?: string;
    level_normalized: string;
    log_source_category?: string;
    log_source_product?: string;
    log_source_service?: string;
    mitre_technique_ids: string[];
    mitre_tactic_ids: string[];
    false_positives: string[];
  };
}

export interface CustomRuleUpdate {
  name?: string;
  description?: string;
  detection_config?: Record<string, unknown>;
  level_normalized?: string;
  log_source_category?: string;
  log_source_product?: string;
  log_source_service?: string;
  mitre_technique_ids?: string[];
  mitre_tactic_ids?: string[];
  false_positives?: string[];
}

// ── Detector Types (탐지 정책 = OpenSearch Detector 등가) ──────────────────

export interface FieldMapping {
  rule_field: string;
  log_field: string;
}

export interface DetectorChangeHistory {
  user_id: string;
  changed_at: string;
  changed_fields: string[];
}

export interface Detector {
  id: string;
  name: string;
  description?: string;
  detector_type: string;
  target_indices: string[];
  linked_rule_ids: string[];
  field_mappings: FieldMapping[];
  schedule_interval_min: number;
  trigger_condition?: string;
  message_template?: string;
  severity: string;
  is_active: boolean;
  timestamp_field: string;
  max_search_window_min: number;
  webhook_url?: string | null;
  webhook_headers?: Record<string, string> | null;
  webhook_body?: string | null;
  change_history?: DetectorChangeHistory[];
  last_run_at?: string | null;
  last_triggered_at?: string | null;
  total_findings_count: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface DetectorCreate {
  name: string;
  description?: string;
  detector_type: string;
  target_indices: string[];
  linked_rule_ids?: string[];
  field_mappings?: FieldMapping[];
  schedule_interval_min: number;
  trigger_condition?: string;
  message_template?: string;
  severity: string;
  is_active: boolean;
  timestamp_field?: string;
  max_search_window_min?: number;
  webhook_url?: string;
  webhook_headers?: Record<string, string>;
  webhook_body?: string;
}

export interface DetectorUpdate {
  name?: string;
  description?: string;
  detector_type?: string;
  target_indices?: string[];
  linked_rule_ids?: string[];
  field_mappings?: FieldMapping[];
  schedule_interval_min?: number;
  trigger_condition?: string;
  message_template?: string;
  severity?: string;
  is_active?: boolean;
  timestamp_field?: string;
  max_search_window_min?: number;
  webhook_url?: string;
  webhook_headers?: Record<string, string>;
  webhook_body?: string;
  changed_fields?: string[];
}

export interface Finding {
  id: string;
  detector_id: string;
  detector_name: string;
  rule_id?: string;
  rule_name?: string;
  severity: string;
  target_index: string;
  matched_count: number;
  sample_events: Record<string, unknown>[];
  mitre_technique_ids: string[];
  mitre_tactic_ids: string[];
  trigger_value?: string;
  message?: string;
  status: string;
  created_at?: string;
}

// Backward-compatible aliases
export type DetectionPolicy = Detector;
export type DetectionPolicyCreate = DetectorCreate;
export type DetectionPolicyUpdate = DetectorUpdate;
export type DetectionEvent = Finding;
