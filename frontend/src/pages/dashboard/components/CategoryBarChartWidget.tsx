import React, { useMemo, useRef, useState, useEffect } from "react";
import { Box, Typography, useTheme, Tooltip } from "@mui/material";
import { useLanguageStore } from "../../../stores/useLanguageStore";

// i18n 번역 로드
import koMessages from "../../../locales/ko.json";
import enMessages from "../../../locales/en.json";
import jaMessages from "../../../locales/ja.json";
import cnMessages from "../../../locales/cn.json";

interface CategoryData {
  label: string;
  value: number;
}

interface CategoryBarChartWidgetProps {
  data: CategoryData[];
  title?: string;
  height?: number;
  emptyMessage?: string;
  color?: string;
  onBarClick?: (label: string) => void;
}

const CategoryBarChartWidget: React.FC<CategoryBarChartWidgetProps> = ({ data, title, height, emptyMessage, color, onBarClick }) => {
  const theme = useTheme();
  const barColor = color || theme.palette.primary.main;
  const { language } = useLanguageStore();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [actualHeight, setActualHeight] = useState(height || 300);

  useEffect(() => {
    if (height) {
      setActualHeight(height);
      return;
    }
    const updateHeight = () => {
      if (containerRef.current) {
        const h = containerRef.current.clientHeight;
        if (h > 0) setActualHeight(h);
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [height]);

  // i18n 지원
  const translations: Record<string, Record<string, string>> = { ko: koMessages, en: enMessages, ja: jaMessages, cn: cnMessages };
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

  const padding = { top: 20, right: 10, bottom: 60, left: 40 };
  const chartHeight = actualHeight - padding.top - padding.bottom;

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
          <Box sx={{ width: 4, height: 16, bgcolor: barColor, borderRadius: 0.5 }} />
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>{t('countLabel')}</Typography>
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#fff' }}>{count}</Typography>
      </Box>
    </Box>
  );

  return (
    <Box ref={containerRef} sx={{ width: "100%", height: "100%", display: 'flex', flexDirection: 'column' }}>
      {title && (
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold", color: 'text.secondary', fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
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
            <Typography key={i} variant="caption" sx={{ position: 'absolute', top: line.top, left: 0, width: padding.left - 5, textAlign: 'right', transform: 'translateY(-50%)', color: 'text.secondary', fontSize: { xs: '9px', md: '11px' }, pointerEvents: 'none' }}>
              {line.value}
            </Typography>
          ))}

          <Box sx={{ position: 'absolute', top: padding.top, left: padding.left, right: padding.right, bottom: padding.bottom }}>
            {/* SVG Bars and Grid Lines */}
            <svg width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block", overflow: 'visible', position: 'relative', zIndex: 1 }}>
              {/* Grid Lines (Inside SVG to ensure they are behind bars) */}
              {gridLines.map((_, i) => {
                const yPct = ((gridLines.length - 1 - i) / (gridLines.length - 1)) * 100;
                return (
                  <line 
                    key={i} 
                    x1="0" 
                    y1={`${yPct}%`} 
                    x2="100%" 
                    y2={`${yPct}%`} 
                    stroke={theme.palette.divider} 
                    strokeWidth="1" 
                    pointerEvents="none" 
                  />
                );
              })}

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
                    <rect 
                      x={`${xPct}%`} 
                      y={`${100 - barHeightPct}%`} 
                      width={`${barWidthPct}%`} 
                      height={`${barHeightPct}%`} 
                      fill={barColor} 
                      fillOpacity={0.8}
                      rx="1" 
                      style={{ cursor: 'pointer' }} 
                      onClick={() => onBarClick && onBarClick(item.label)}
                    />
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
                    <Typography variant="caption" sx={{ position: 'absolute', left: '50%', top: { xs: 6, md: 10 }, transform: { xs: 'translateX(-50%) rotate(-45deg)', md: 'translateX(-50%) rotate(-25deg)' }, transformOrigin: 'top center', whiteSpace: 'nowrap', color: 'text.secondary', fontSize: { xs: '8px', md: '10px' }, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'default' }}>
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