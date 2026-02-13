import React, { useMemo, useState, useRef, useEffect } from "react";
import { Box, Typography, useTheme, Tooltip } from "@mui/material";
import type { HistogramItem } from "../../../services/dashboardService";
import dayjs from "dayjs";
import { useLanguageStore } from "../../../stores/useLanguageStore";

// i18n 번역 로드
import koMessages from "../../../locales/ko.json";
import enMessages from "../../../locales/en.json";
import jaMessages from "../../../locales/ja.json";
import cnMessages from "../../../locales/cn.json";

interface BarChartWidgetProps {
  data: HistogramItem[];
  height?: number;
  title?: string;
  emptyMessage?: string;
  onBarClick?: (startTime: string, endTime: string) => void;
  onRangeSelect?: (startTime: string, endTime: string) => void;
}

const BarChartWidget: React.FC<BarChartWidgetProps> = ({ data, height, title, emptyMessage, onBarClick, onRangeSelect }) => {
  const theme = useTheme();
  const { language } = useLanguageStore();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [actualHeight, setActualHeight] = useState(height || 300);

  // 컨테이너 크기 감지
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

  // 드래그 선택 상태
  const [isSelecting, setIsRefreshing] = useState(false);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);

  // i18n 지원
  const translations: Record<string, Record<string, string>> = { ko: koMessages, en: enMessages, ja: jaMessages, cn: cnMessages };
  const t = useMemo(() => (key: string): string => {
    const currentTranslations = translations[language] || translations["ko"];
    return currentTranslations[key] || key;
  }, [language]);

  const finalEmptyMessage = emptyMessage || t('noResults');

  const maxValue = useMemo(() => {
    if (!data || data.length === 0) return 10;
    const max = Math.max(...data.map(d => d.count));
    return max === 0 ? 10 : max;
  }, [data]);

  const padding = { top: 20, right: 10, bottom: 40, left: 40 };
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

  // 마우스/터치 좌표를 시간으로 변환
  const getTimeFromX = (xPercent: number) => {
    if (!data || data.length === 0) return null;
    const totalPoints = data.length;
    const index = Math.floor((xPercent / 100) * totalPoints);
    const safeIndex = Math.max(0, Math.min(index, totalPoints - 1));
    return dayjs(data[safeIndex].timestamp);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    setSelectionStart(xPct);
    setSelectionEnd(xPct);
    setIsRefreshing(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    setSelectionEnd(Math.max(0, Math.min(xPct, 100)));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const xPct = ((touch.clientX - rect.left) / rect.width) * 100;
    setSelectionStart(xPct);
    setSelectionEnd(xPct);
    setIsRefreshing(true);
    if (e.cancelable) e.preventDefault();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSelecting || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const xPct = ((touch.clientX - rect.left) / rect.width) * 100;
    setSelectionEnd(Math.max(0, Math.min(xPct, 100)));
    if (e.cancelable) e.preventDefault();
  };

  const handleMouseUp = () => {
    if (!isSelecting || selectionStart === null || selectionEnd === null) {
      setIsRefreshing(false);
      return;
    }

    const start = Math.min(selectionStart, selectionEnd);
    const end = Math.max(selectionStart, selectionEnd);

    if (end - start > 1) {
      const startTime = getTimeFromX(start);
      const endTime = getTimeFromX(end);

      if (startTime && endTime && onRangeSelect) {
        onRangeSelect(startTime.toISOString(), endTime.toISOString());
      }
    }

    setIsRefreshing(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const handleRectClick = (item: HistogramItem, index: number) => {
    if (!onBarClick) return;
    const startTime = dayjs(item.timestamp);
    let endTime: dayjs.Dayjs;
    if (index < data.length - 1) {
      endTime = dayjs(data[index + 1].timestamp);
    } else if (data.length > 1) {
      const diff = dayjs(data[1].timestamp).diff(dayjs(data[0].timestamp));
      endTime = startTime.add(diff, 'ms');
    } else {
      endTime = startTime.add(1, 'minute');
    }
    onBarClick(startTime.toISOString(), endTime.toISOString());
  };

  const CustomTooltip = ({ label, count }: { label: string, count: number }) => (
    <Box sx={{ p: 1, minWidth: 180 }}>
      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5, color: '#fff' }}>{label}</Typography>
      <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.2)', pt: 1, mt: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 4, height: 16, bgcolor: theme.palette.primary.light, borderRadius: 0.5 }} />
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>{t('countLabel')}</Typography>
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#fff' }}>{count}</Typography>
      </Box>
    </Box>
  );

  if (!data || data.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: actualHeight, flexDirection: 'column' }}>
        <Typography color="text.disabled">{finalEmptyMessage}</Typography>
      </Box>
    );
  }

  return (
    <Box ref={containerRef} sx={{ width: "100%", height: "100%", display: 'flex', flexDirection: 'column', userSelect: 'none', touchAction: 'none' }}>
      {title && (
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold", color: 'text.secondary', fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
          {title}
        </Typography>
      )}
      
      <Box sx={{ flexGrow: 1, position: 'relative', width: '100%' }}>
        {gridLines.map((line, i) => (
          <Typography key={i} variant="caption" sx={{ position: 'absolute', top: line.top, left: 0, width: padding.left - 5, textAlign: 'right', transform: 'translateY(-50%)', color: 'text.secondary', fontSize: { xs: '9px', md: '11px' }, pointerEvents: 'none' }}>
            {line.value}
          </Typography>
        ))}

        <Box sx={{ position: 'absolute', top: padding.top, left: padding.left, right: padding.right, bottom: padding.bottom }}>
          <svg 
            ref={svgRef}
            width="100%" height="100%" preserveAspectRatio="none" 
            style={{ 
              display: "block", 
              overflow: 'visible',
              cursor: 'crosshair', 
              position: 'relative',
              zIndex: 1,
              touchAction: 'none'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
          >
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

            {/* Selection Overlay */}
            {isSelecting && selectionStart !== null && selectionEnd !== null && (
              <rect
                x={`${Math.min(selectionStart, selectionEnd)}%`}
                y="0"
                width={`${Math.abs(selectionEnd - selectionStart)}%`}
                height="100%"
                fill={theme.palette.primary.main}
                fillOpacity={0.15}
                stroke={theme.palette.primary.main}
                strokeWidth="1"
              />
            )}

            {data.map((item, i) => {
              const barCount = data.length;
              const barContainerWidthPct = 100 / barCount;
              const barWidthPct = barContainerWidthPct * 0.85;
              const xPct = (barContainerWidthPct * i) + (barContainerWidthPct - barWidthPct) / 2;
              const barHeightPct = (item.count / Math.ceil(maxValue)) * 100;

              return (
                <Tooltip 
                  key={i} 
                  title={<CustomTooltip label={dayjs(item.timestamp).locale(language).format("YYYY-MM-DD HH:mm")} count={item.count} />} 
                  arrow 
                  placement="top"
                  componentsProps={{ tooltip: { sx: { bgcolor: 'rgba(38, 50, 56, 0.95)', color: '#fff', boxShadow: theme.shadows[4], borderRadius: 1.5, '& .MuiTooltip-arrow': { color: 'rgba(38, 50, 56, 0.95)' } } } }}
                >
                  <rect
                    x={`${xPct}%`}
                    y={`${100 - barHeightPct}%`}
                    width={`${barWidthPct}%`}
                    height={`${barHeightPct}%`}
                    fill="#20b2aa"
                    rx="1"
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); handleRectClick(item, i); }}
                  />
                </Tooltip>
              );
            })}
            <line x1="0" y1="100%" x2="100%" y2="100%" stroke={theme.palette.text.secondary} strokeWidth="1" />
          </svg>

          <Box sx={{ position: 'absolute', top: '100%', left: 0, right: 0, height: padding.bottom, display: 'flex' }}>
            {data.map((item, i) => {
              const labelStep = data.length > 20 ? Math.ceil(data.length / (window.innerWidth < 600 ? 4 : 12)) : 1;
              const showLabel = i % labelStep === 0;
              if (!showLabel) return <Box key={i} sx={{ flex: 1 }} />;
              const isMultiDay = data.length > 0 && !dayjs(data[0].timestamp).isSame(dayjs(data[data.length-1].timestamp), 'day');
              return (
                <Box key={i} sx={{ flex: 1, position: 'relative' }}>
                  <Box sx={{ position: 'absolute', left: '50%', top: { xs: 4, md: 8 }, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none' }}>
                    {isMultiDay && <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: { xs: '7px', md: '9px' }, lineHeight: 1, mb: 0.2 }}>{dayjs(item.timestamp).format("MM-DD")}</Typography>}
                    <Typography variant="caption" sx={{ whiteSpace: 'nowrap', color: 'text.secondary', fontSize: { xs: '8px', md: '10px' }, lineHeight: 1 }}>{dayjs(item.timestamp).format("HH:mm")}</Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default BarChartWidget;
