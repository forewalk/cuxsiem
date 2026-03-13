/**
 * 알림 테이블 공통 스타일 및 유틸리티
 */
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

/**
 * 공통 테이블 스타일
 */
export const ALERT_TABLE_STYLES = {
  // Paper 스타일
  paper: {
    elevation: 0,
    sx: {
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 1.5,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 220px)',
      padding: 2,
    },
  },

  // TableContainer 스타일
  container: {
    sx: {
      flexGrow: 1,
      overflow: 'auto',
    },
  },

  // Table 스타일
  table: {
    stickyHeader: true,
    sx: {
      minWidth: 650,
    },
  },

  // 헤더 셀 기본 스타일
  headerCell: {
    fontWeight: 'bold',
    fontSize: '0.875rem',
    bgcolor: 'background.paper',
    zIndex: 3,
  },

  // 바디 행 기본 스타일
  bodyRow: {
    '&:hover': {
      bgcolor: 'action.hover',
    },
  },

  // 바디 셀 기본 스타일
  bodyCell: {
    fontSize: '0.85rem',
    py: 1.5, // 행 높이 통일
  },

  // Pagination 스타일
  pagination: {
    rowsPerPageOptions: [10, 25, 50, 100],
    sx: {
      borderTop: '1px solid',
      borderColor: 'divider',
      flexShrink: 0,
    },
  },
} as const;

/**
 * 날짜 포맷 유틸리티 (UTC → 브라우저 로컬 타임)
 */
export const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';
  return dayjs.utc(dateString).local().format('YYYY-MM-DD HH:mm:ss');
};

/**
 * 날짜 포맷 유틸리티 (타임존 표시 포함)
 */
export const formatDateTimeWithTz = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';
  return dayjs.utc(dateString).local().format('YYYY-MM-DD HH:mm:ss (UTC Z)');
};

/**
 * 중요도 필터 옵션
 */
export const SEVERITY_OPTIONS = ['info', 'low', 'medium', 'high', 'critical'] as const;

/**
 * severity 문자열을 MUI 색상으로 매핑 (Chip color, Alert severity 공용)
 * critical/high/error → error, medium/warning → warning, success → success, 나머지 → info
 */
export type MuiSeverityColor = 'error' | 'warning' | 'info' | 'success';

export const mapSeverityToMui = (severity: string | null | undefined): MuiSeverityColor => {
  if (!severity) return 'info';
  const s = severity.toLowerCase().trim();
  if (s === 'critical' || s === 'high' || s === 'error') return 'error';
  if (s === 'medium' || s === 'warning') return 'warning';
  if (s === 'success') return 'success';
  return 'info';
};

/**
 * 활성 상태 필터 옵션
 */
export const ACTIVE_STATUS_OPTIONS = [
  { value: null, label: '전체' },
  { value: true, label: '활성' },
  { value: false, label: '비활성' },
] as const;

