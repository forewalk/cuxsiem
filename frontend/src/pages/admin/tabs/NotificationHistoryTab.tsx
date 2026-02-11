import React, { useState, useMemo, useCallback } from 'react';
import { Box, Typography, Paper, LinearProgress, Stack, Divider } from '@mui/material';
import { useLanguageStore } from '@/stores/useLanguageStore.ts';
import ControlBar from "../../dashboard/components/ControlBar";
import { Notifications as NotificationsIcon } from '@mui/icons-material';

// i18n: JSON 파일에서 번역 로드
import koMessages from "../../../locales/ko.json";
import enMessages from "../../../locales/en.json";
import jaMessages from "../../../locales/ja.json";

const NotificationHistoryTab: React.FC = () => {
  const { language } = useLanguageStore();
  const [loading] = useState(false);

  // ControlBar states
  const [fromValue, setFromValue] = useState<number | null>(15);
  const [fromUnit, setFromUnit] = useState("m");
  const [toValue, setToValue] = useState<number | null>(null);
  const [toUnit, setToUnit] = useState("m");
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const translations: Record<string, Record<string, string>> = {
    ko: koMessages,
    en: enMessages,
    ja: jaMessages,
  };

  const t = useMemo(() => (key: string): string => {
    const currentTranslations = translations[language] || translations["ko"];
    return currentTranslations[key] || key;
  }, [language, translations]);

  const handleTimeChange = (
    fVal: number | null, 
    fUnit: string, 
    tVal: number | null, 
    tUnit: string,
    fDate: string | null = null,
    tDate: string | null = null
  ) => {
    setFromValue(fVal);
    setFromUnit(fUnit);
    setToValue(tVal);
    setToUnit(tUnit);
    setFromDate(fDate);
    setToDate(tDate);
  };

  const handleRefresh = useCallback(() => {
    console.log('Refreshing history...');
  }, []);

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto', height: '100%', position: 'relative', p: 3 }}>
      {loading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }} />}
      
      <ControlBar 
        t={t}
        fromValue={fromValue} fromUnit={fromUnit}
        toValue={toValue} toUnit={toUnit}
        fromDate={fromDate} toDate={toDate}
        onTimeChange={handleTimeChange}
        searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} onRefresh={handleRefresh}
      />

      <Paper elevation={1} sx={{ p: 3, height: 'calc(100% - 100px)', display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NotificationsIcon color="primary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{t('notificationHistory')}</Typography>
          </Box>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>{t('notImplemented')}</Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default NotificationHistoryTab;
