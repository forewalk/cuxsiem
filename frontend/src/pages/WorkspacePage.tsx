import React, { useEffect } from 'react';
import { Box } from '@mui/material';
import TabManager from '../components/tabs/TabManager';
import useTabStore from '../stores/tabStore';
// i18n: JSON 파일에서 번역 로드
import koMessages from "../locales/ko.json";
import enMessages from "../locales/en.json";
import jaMessages from "../locales/ja.json";

const WorkspacePage: React.FC = () => {
  const { tabs, addTab } = useTabStore();
  const isInitialMount = React.useRef(true); // 최초 마운트 여부 추적

  // i18n 지원
  const savedLanguage = localStorage.getItem("appLanguage") || "ko";
  const translations: Record<string, Record<string, string>> = { ko: koMessages, en: enMessages, ja: jaMessages };
  const currentTranslations = translations[savedLanguage] || translations["ko"];
  const t = (key: string) => currentTranslations[key] || key;

  useEffect(() => {
    // 최초 접속(마운트) 시점에만 탭이 없으면 기본 탭 추가
    if (isInitialMount.current) {
      if (tabs.length === 0) {
        addTab({ 
          label: t('threats'), 
          labelKey: 'threats',
          component: 'DashboardTab' 
        });
      }
      isInitialMount.current = false; // 이후에는 동작하지 않도록 플래그 변경
    }
  }, [tabs.length, addTab]);

  return (
    <Box sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <TabManager />
    </Box>
  );
};

export default WorkspacePage;
