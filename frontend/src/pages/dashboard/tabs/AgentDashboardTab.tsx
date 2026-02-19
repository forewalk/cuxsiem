import React, { useMemo } from "react";
import { Box, Typography, Paper } from "@mui/material";
import { useLanguageStore } from "../../../stores/useLanguageStore";

// i18n: JSON 파일에서 번역 로드
import koMessages from "../../../locales/ko.json";
import enMessages from "../../../locales/en.json";
import jaMessages from "../../../locales/ja.json";
import cnMessages from "../../../locales/cn.json";

const AgentDashboardTab: React.FC = () => {
  const { language } = useLanguageStore();

  const translations: Record<string, Record<string, string>> = {
    ko: koMessages,
    en: enMessages,
    ja: jaMessages,
    cn: cnMessages,
  };

  const t = useMemo(() => (key: string): string => {
    const currentTranslations = translations[language] || translations["ko"] || {};
    return currentTranslations[key] || key;
  }, [language]);

  return (
    <Box sx={{ flexGrow: 1, p: 3, overflowY: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
        {t('agentDashboard')}
      </Typography>
      <Paper elevation={1} sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
        <Typography variant="body1" color="text.secondary">
          {t('notImplemented')}
        </Typography>
      </Paper>
    </Box>
  );
};

export default AgentDashboardTab;
