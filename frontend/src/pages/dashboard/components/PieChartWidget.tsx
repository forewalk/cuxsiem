import React, { useMemo } from "react";
import { Box, Typography, Tooltip, useTheme } from "@mui/material";
import { useLanguageStore } from "../../../stores/useLanguageStore";

// i18n 번역 로드
import koMessages from "../../../locales/ko.json";
import enMessages from "../../../locales/en.json";
import jaMessages from "../../../locales/ja.json";

interface PieData {
  label: string;
  value: number;
}

interface PieChartWidgetProps {
  data: PieData[];
  title?: string;
  height?: number;
  emptyMessage?: string;
}

const PieChartWidget: React.FC<PieChartWidgetProps> = ({ data, title, height = 300, emptyMessage }) => {
  const theme = useTheme();
  const { language } = useLanguageStore();

  // i18n 지원
  const translations: Record<string, Record<string, string>> = { ko: koMessages, en: enMessages, ja: jaMessages };
  const t = useMemo(() => (key: string): string => {
    const currentTranslations = translations[language] || translations["ko"];
    return currentTranslations[key] || key;
  }, [language]);

  const finalEmptyMessage = emptyMessage || t('noResults');
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const colors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main,
    "#8884d8",
    "#82ca9d",
    "#ffc658",
  ];

  const radius = 80;
  const centerX = 100;
  const centerY = 100;
  let currentAngle = 0;

  const CustomTooltip = ({ label, value, pct }: { label: string, value: number, pct: string }) => (
    <Box sx={{ p: 1, minWidth: 180 }}>
      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5, color: '#fff' }}>
        {label}
      </Typography>
      <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.2)', pt: 1, mt: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 4, height: 16, bgcolor: theme.palette.primary.light, borderRadius: 0.5 }} />
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>{t('countLabel')}</Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#fff', lineHeight: 1 }}>{value}</Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px' }}>{pct}%</Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ width: "100%", height: "100%", display: 'flex', flexDirection: 'column' }}>
      {title && (
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: "bold", color: 'text.secondary' }}>
          {title}
        </Typography>
      )}
      
      {(!data || data.length === 0 || total === 0) ? (
        <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="body2" color="text.disabled">{finalEmptyMessage}</Typography>
        </Box>
      ) : (
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <svg width={200} height={200} viewBox="0 0 200 200">
            {data.map((item, i) => {
              const angle = (item.value / total) * 360;
              const x1 = centerX + radius * Math.cos((currentAngle * Math.PI) / 180);
              const y1 = centerY + radius * Math.sin((currentAngle * Math.PI) / 180);
              const x2 = centerX + radius * Math.cos(((currentAngle + angle) * Math.PI) / 180);
              const y2 = centerY + radius * Math.sin(((currentAngle + angle) * Math.PI) / 180);
              const largeArcFlag = angle > 180 ? 1 : 0;
              const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
              const segment = (
                <Tooltip key={i} title={<CustomTooltip label={item.label} value={item.value} pct={((item.value / total) * 100).toFixed(1)} />} arrow placement="top" componentsProps={{ tooltip: { sx: { bgcolor: 'rgba(38, 50, 56, 0.95)', color: '#fff', boxShadow: theme.shadows[4], borderRadius: 1.5, '& .MuiTooltip-arrow': { color: 'rgba(38, 50, 56, 0.95)' } } } }}>
                  <path d={pathData} fill={colors[i % colors.length]} stroke="#fff" strokeWidth="1" style={{ cursor: 'pointer' }} />
                </Tooltip>
              );
              currentAngle += angle;
              return segment;
            })}
            <circle cx={centerX} cy={centerY} r={radius * 0.4} fill={theme.palette.background.paper} />
          </svg>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: height - 60, overflowY: 'auto' }}>
            {data.map((item, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 12, height: 12, bgcolor: colors[i % colors.length], borderRadius: '2px' }} />
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.primary', whiteSpace: 'nowrap' }}>{item.label}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>{((item.value / total) * 100).toFixed(1)}%</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default PieChartWidget;