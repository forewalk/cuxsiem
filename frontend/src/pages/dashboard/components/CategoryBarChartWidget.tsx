import React, { useMemo } from "react";
import { Box, Typography, useTheme, Tooltip } from "@mui/material";
import { useLanguageStore } from "../../../stores/useLanguageStore";

// i18n 번역 로드
import koMessages from "../../../locales/ko.json";
import enMessages from "../../../locales/en.json";
import jaMessages from "../../../locales/ja.json";

interface CategoryData {
  label: string;
  value: number;
}

interface CategoryBarChartWidgetProps {
  data: CategoryData[];
  title?: string;
  height?: number;
  emptyMessage?: string;
}

const CategoryBarChartWidget: React.FC<CategoryBarChartWidgetProps> = ({ data, title, height = 300, emptyMessage }) => {
  const theme = useTheme();
  const { language } = useLanguageStore();

  // i18n 지원
  const translations: Record<string, Record<string, string>> = { ko: koMessages, en: enMessages, ja: jaMessages };
  const t = useMemo(() => (key: string): string => {
    const currentTranslations = translations[language] || translations["ko"];
    return currentTranslations[key] || key;
  }, [language]);

  const finalEmptyMessage = emptyMessage || t('noResults');

  const maxValue = useMemo(() => {
    if (!data || data.length === 0) return 10;
    const max = Math.max(...data.map(d => d.value));
    return max === 0 ? 10 : max;
  }, [data]);

  const padding = { top: 20, right: 20, bottom: 60, left: 50 };
  const chartHeight = height - padding.top - padding.bottom;

  const gridLines = useMemo(() => {
    const effectiveMax = Math.ceil(maxValue);
    let ticks: number[] = [];
    if (effectiveMax <= 10) {
      ticks = Array.from({ length: effectiveMax + 1 }, (_, i) => i);
    } else {
      const step = Math.ceil(effectiveMax / 5);
      for (let i = 0; i <= 5; i++) {
        const val = i * step;
        if (val <= effectiveMax) ticks.push(val);
      }
      if (ticks[ticks.length - 1] < effectiveMax) ticks.push(effectiveMax);
    }
    return ticks.map((value) => {
      const top = padding.top + chartHeight - (value / effectiveMax) * chartHeight;
      return { top, value };
    });
  }, [maxValue, chartHeight, padding.top]);

  const CustomTooltip = ({ label, count }: { label: string, count: number }) => (
    <Box sx={{ p: 1, minWidth: 180 }}>
      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5, color: '#fff' }}>
        {label}
      </Typography>
      <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.2)', pt: 1, mt: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 4, height: 16, bgcolor: theme.palette.primary.light, borderRadius: 0.5 }} />
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>{t('countLabel')}</Typography>
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#fff' }}>{count}</Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ width: "100%", height: "100%", display: 'flex', flexDirection: 'column' }}>
      {title && (
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold", color: 'text.secondary' }}>
          {title}
        </Typography>
      )}
      
      {(!data || data.length === 0) ? (
        <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="body2" color="text.disabled">{finalEmptyMessage}</Typography>
        </Box>
      ) : (
        <Box sx={{ flexGrow: 1, position: 'relative', width: '100%' }}>
          {/* Y-axis Labels */}
          {gridLines.map((line, i) => (
            <Typography key={i} variant="caption" sx={{ position: 'absolute', top: line.top, left: 0, width: padding.left - 10, textAlign: 'right', transform: 'translateY(-50%)', color: 'text.secondary', fontSize: '11px', pointerEvents: 'none' }}>
              {line.value}
            </Typography>
          ))}

          <Box sx={{ position: 'absolute', top: padding.top, left: padding.left, right: padding.right, bottom: padding.bottom }}>
            {/* Grid Lines */}
            {gridLines.map((line, i) => (
              <Box key={i} sx={{ position: 'absolute', top: `${((gridLines.length - 1 - i) / (gridLines.length - 1)) * 100}%`, left: 0, right: 0, height: '1px', bgcolor: theme.palette.divider, pointerEvents: 'none' }} />
            ))}

            {/* SVG Bars */}
            <svg width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block", overflow: 'visible' }}>
              {data.map((item, i) => {
                const barCount = data.length;
                const containerWidthPct = 100 / barCount;
                const barWidthPct = containerWidthPct * 0.6;
                const xPct = (containerWidthPct * i) + (containerWidthPct - barWidthPct) / 2;
                const barHeightPct = (item.value / Math.ceil(maxValue)) * 100;

                return (
                  <Tooltip 
                    key={i} 
                    title={<CustomTooltip label={item.label} count={item.value} />} 
                    arrow 
                    placement="top"
                    componentsProps={{ tooltip: { sx: { bgcolor: 'rgba(38, 50, 56, 0.95)', color: '#fff', boxShadow: theme.shadows[4], borderRadius: 1.5, '& .MuiTooltip-arrow': { color: 'rgba(38, 50, 56, 0.95)' } } } }}
                  >
                    <rect x={`${xPct}%`} y={`${100 - barHeightPct}%`} width={`${barWidthPct}%`} height={`${barHeightPct}%`} fill="#20b2aa" rx="1" style={{ cursor: 'pointer' }} />
                  </Tooltip>
                );
              })}
              <line x1="0" y1="100%" x2="100%" y2="100%" stroke={theme.palette.text.secondary} strokeWidth="1" />
            </svg>

            {/* X-axis Labels */}
            <Box sx={{ position: 'absolute', top: '100%', left: 0, right: 0, height: padding.bottom, display: 'flex' }}>
              {data.map((item, i) => (
                <Box key={i} sx={{ flex: 1, position: 'relative' }}>
                  <Tooltip title={item.label}>
                    <Typography variant="caption" sx={{ position: 'absolute', left: '50%', top: 10, transform: 'translateX(-50%) rotate(-25deg)', transformOrigin: 'top center', whiteSpace: 'nowrap', color: 'text.secondary', fontSize: '10px', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'default' }}>
                      {item.label}
                    </Typography>
                  </Tooltip>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default CategoryBarChartWidget;