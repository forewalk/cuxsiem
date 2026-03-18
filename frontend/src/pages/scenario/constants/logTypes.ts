export interface LogTypeItem {
  value: string;
  label: string;
  keywords: string[];
}

export interface LogTypeGroup {
  group: string;
  items: LogTypeItem[];
}

export const LOG_TYPE_GROUPS: LogTypeGroup[] = [
  {
    group: 'Access Management',
    items: [
      { value: 'ad_ldap', label: 'AD/LDAP', keywords: ['active_directory', 'ldap', 'authentication'] },
      { value: 'apache_access', label: 'Apache Access', keywords: ['apache'] },
      { value: 'okta', label: 'Okta', keywords: ['okta'] },
    ],
  },
  {
    group: 'Applications',
    items: [
      { value: 'github', label: 'Github', keywords: ['github'] },
      { value: 'google_workspace', label: 'Google Workspace', keywords: ['google_workspace', 'gworkspace', 'gsuite'] },
      { value: 'microsoft_365', label: 'Microsoft 365', keywords: ['m365', 'office365', 'microsoft365'] },
    ],
  },
  {
    group: 'Cloud Services',
    items: [
      { value: 'aws_cloudtrail', label: 'AWS Cloudtrail', keywords: ['cloudtrail'] },
      { value: 'aws_s3', label: 'AWS S3', keywords: ['s3'] },
      { value: 'azure', label: 'Microsoft Azure', keywords: ['azure'] },
    ],
  },
  {
    group: 'Network Activity',
    items: [
      { value: 'dns', label: 'DNS', keywords: ['dns'] },
      { value: 'network', label: 'Network', keywords: ['network', 'proxy', 'firewall'] },
      { value: 'vpc_flow', label: 'VPC Flow', keywords: ['vpcflow', 'vpc'] },
    ],
  },
  {
    group: 'Security',
    items: [
      { value: 'waf', label: 'WAF', keywords: ['waf', 'web_application_firewall'] },
    ],
  },
  {
    group: 'System Activity',
    items: [
      { value: 'linux', label: 'Linux System Logs', keywords: ['linux', 'sysmon_linux', 'auditd'] },
      { value: 'windows', label: 'Microsoft Windows', keywords: ['windows', 'sysmon', 'powershell', 'windefend'] },
    ],
  },
];

export const ALL_LOG_TYPES: LogTypeItem[] = LOG_TYPE_GROUPS.flatMap(g => g.items);

/**
 * 규칙의 log_source 필드들로부터 매칭되는 로그 타입 value를 반환
 */
export function matchLogTypes(
  product: string | null | undefined,
  category: string | null | undefined,
  service: string | null | undefined,
): string[] {
  const fields = [product, category, service]
    .filter(Boolean)
    .map(f => f!.toLowerCase().trim());
  if (fields.length === 0) return [];

  const matched: string[] = [];
  for (const item of ALL_LOG_TYPES) {
    if (item.keywords.some(kw => fields.some(f => f.includes(kw) || kw.includes(f)))) {
      matched.push(item.value);
    }
  }
  return matched;
}

/**
 * 로그 타입 value → 표시 레이블
 */
export function getLogTypeLabel(value: string): string {
  return ALL_LOG_TYPES.find(lt => lt.value === value)?.label ?? value;
}
