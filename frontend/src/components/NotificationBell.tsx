import { useTranslation } from '@/hooks/useTranslation';
import { SeverityChip } from '@/pages/admin/alerts/components/SeverityChip';
import { notificationService } from '@/services/notificationService';
import useTabStore from '@/stores/tabStore';
import { useLanguageStore } from '@/stores/useLanguageStore';
import type { NotificationHistory } from '@/types';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  List, ListItem,
  Popover,
  Typography
} from '@mui/material';
import dayjs from 'dayjs';
import 'dayjs/locale/en';
import 'dayjs/locale/ja';
import 'dayjs/locale/ko';
import 'dayjs/locale/zh-cn';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
import React, { useCallback, useState } from 'react';

dayjs.extend(utc);
dayjs.extend(relativeTime);

const DAYJS_LOCALE_MAP: Record<string, string> = {
  ko: 'ko',
  en: 'en',
  ja: 'ja',
  cn: 'zh-cn',
};

interface NotificationBellProps {
  unreadCount: number;
  onOpen: () => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ unreadCount, onOpen }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [notifications, setNotifications] = useState<NotificationHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const { addTab } = useTabStore();
  const { language } = useLanguageStore();
  const { t } = useTranslation();
  const dayjsLocale = DAYJS_LOCALE_MAP[language] || 'en';

  const handleOpen = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(e.currentTarget);
    onOpen();
    setLoading(true);
    try {
      const data = await notificationService.getNotifications({ limit: 5, skip: 0 });
      setNotifications(data.items);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [onOpen]);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleViewAll = useCallback(() => {
    addTab({ label: t('notificationHistory'), labelKey: 'notificationHistory', component: 'NotificationHistoryTab' });
    handleClose();
  }, [addTab, handleClose]);

  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton onClick={handleOpen} sx={{ color: 'text.primary', p: { xs: 0.5, sm: 1 } }}>
        <Badge badgeContent={unreadCount} color="error" max={99}>
          {unreadCount > 0
            ? <NotificationsIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
            : <NotificationsNoneIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
          }
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 1.5, width: 360, maxHeight: 480, display: 'flex', flexDirection: 'column', boxShadow: 0, border: '1px solid', borderColor: 'divider' } } }}
      >
        {/* 헤더 */}
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NotificationsIcon fontSize="small" color="primary" />
            <Typography variant="subtitle2" fontWeight={700}>{t('recentAlerts')}</Typography>
            {unreadCount > 0 && (
              <Chip label={`+${unreadCount}`} size="small" color="error" sx={{ height: 18, fontSize: '0.65rem' }} />
            )}
          </Box>
        </Box>

        {/* 알림 목록 */}
        <Box sx={{ overflowY: 'auto', flexGrow: 1 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.disabled">{t('noAlerts')}</Typography>
            </Box>
          ) : (
            <List disablePadding>
              {notifications.map((n, idx) => (
                <React.Fragment key={n.id}>
                  <ListItem
                    alignItems="flex-start"
                    sx={{ px: 2, py: 1.5, flexDirection: 'column', gap: 0.5 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <SeverityChip severity={n.rule_severity || n.severity} />
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        sx={{ flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {n.rule_name}
                      </Typography>
                      <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0 }}>
                        {dayjs.utc(n.created_at).local().locale(dayjsLocale).fromNow()}
                      </Typography>
                    </Box>
                  </ListItem>
                  {idx < notifications.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>

        {/* 전체 보기 */}
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider', p: 1 }}>
          <Button
            fullWidth
            size="small"
            endIcon={<OpenInNewIcon fontSize="small" />}
            onClick={handleViewAll}
            sx={{ textTransform: 'none', fontWeight: 500 }}
          >
            {t('viewAll')}
          </Button>
        </Box>
      </Popover>
    </>
  );
};

export default NotificationBell;
