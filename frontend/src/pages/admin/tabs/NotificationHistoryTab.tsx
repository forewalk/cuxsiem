import React, { useMemo } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useLanguageStore } from '@/stores/useLanguageStore.ts';

// i18n: JSON 파일에서 번역 로드
import koMessages from "../../../locales/ko.json";
import enMessages from "../../../locales/en.json";
import jaMessages from "../../../locales/ja.json";

const NotificationHistoryTab: React.FC = () => {
  const { language } = useLanguageStore();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const translations: Record<string, Record<string, string>> = {
    ko: koMessages,
    en: enMessages,
    ja: jaMessages,
  };

  const t = useMemo(() => (key: string): string => {
    const currentTranslations = translations[language] || translations["ko"];
    return currentTranslations[key] || key;
  }, [language, translations]);

  return (
    <Box sx={{ p: 3, height: '100%' }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>{t('notificationHistory')}</Typography>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">{t('notImplemented')}</Typography>
      </Paper>
    </Box>
  );
};

export default NotificationHistoryTab;
