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
import React, { useCallback, useEffect, useRef, useState } from 'react';

dayjs.extend(utc);
dayjs.extend(relativeTime);

const DAYJS_LOCALE_MAP: Record<string, string> = {
  ko: 'ko',
  en: 'en',
  ja: 'ja',
  cn: 'zh-cn',
};

const LAST_CONFIRMED_KEY = 'notificationBellLastConfirmedAt';

interface NotificationBellProps {
  unreadCount: number;
  onOpen: () => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ unreadCount, onOpen }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [notifications, setNotifications] = useState<NotificationHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const isFirstOpenSinceMount = useRef(true);
  const { addTab } = useTabStore();
  const { language } = useLanguageStore();
  const { t } = useTranslation();
  const dayjsLocale = DAYJS_LOCALE_MAP[language] || 'en';

  useEffect(() => {
    const lastConfirmed = localStorage.getItem(LAST_CONFIRMED_KEY);
    if (lastConfirmed) {
      notificationService.getNotifications({ skip: 0, limit: 1, from_date: lastConfirmed })
        .then(data => setPendingCount(data.total))
        .catch(() => {});
    }
  }, []);

  const totalUnread = unreadCount + pendingCount;

  const handleOpen = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(e.currentTarget);
    const currentUnread = unreadCount;
    const isFirstOpen = isFirstOpenSinceMount.current;
    isFirstOpenSinceMount.current = false;
    onOpen();

    if (currentUnread > 0 || (isFirstOpen && pendingCount > 0)) {
      setLoading(true);
      try {
        const params: Record<string, any> = { skip: 0 };
        const lastConfirmed = localStorage.getItem(LAST_CONFIRMED_KEY);
        if (lastConfirmed) {
          params.from_date = lastConfirmed;
        }
        const data = await notificationService.getNotifications(params);
        setNotifications(data.items);
      } catch {
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    } else {
      setNotifications([]);
    }
    setPendingCount(0);
  }, [onOpen, unreadCount, pendingCount]);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
    localStorage.setItem(LAST_CONFIRMED_KEY, new Date().toISOString());
  }, []);

  const handleViewAll = useCallback(() => {
    addTab({ label: t('notificationHistory'), labelKey: 'notificationHistory', component: 'NotificationHistoryTab' });
    handleClose();
  }, [addTab, handleClose]);

  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton onClick={handleOpen} sx={{ color: 'text.primary', p: { xs: 0.5, sm: 1 } }}>
        <Badge badgeContent={totalUnread} color="error" max={99}>
          {totalUnread > 0
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
        slotProps={{ paper: { elevation: 8, sx: { mt: 1.5, width: 360, maxHeight: 480, display: 'flex', flexDirection: 'column', border: '1px solid', borderColor: 'divider' } } }}
      >
        {/* 헤더 */}
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NotificationsIcon fontSize="small" color="primary" />
            <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.75rem' }}>{t('recentAlerts')}</Typography>
            {totalUnread > 0 && (
              <Chip label={`+${totalUnread}`} size="small" color="error" sx={{ height: 18, fontSize: '0.65rem' }} />
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
              <Typography variant="body2" color="text.disabled" sx={{ fontSize: '0.75rem' }}>
                {localStorage.getItem(LAST_CONFIRMED_KEY) ? t('allNotificationsConfirmed') : t('noAlerts')}
              </Typography>
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
                      <SeverityChip severity={n.rule_severity} />
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        sx={{ flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.75rem' }}
                      >
                        {n.rule_name}
                      </Typography>
                      <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0, fontSize: '0.65rem' }}>
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
            sx={{ textTransform: 'none', fontWeight: 500, fontSize: '0.75rem' }}
          >
            {t('viewAll')}
          </Button>
        </Box>
      </Popover>
    </>
  );
};

export default NotificationBell;
