import React, { useMemo, useState, useRef } from "react";
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

  // i18n 지원
  const translations: Record<string, Record<string, string>> = { ko: koMessages, en: enMessages, ja: jaMessages, cn: cnMessages };
  const t = useMemo(() => (key: string): string => {
    const currentTranslations = translations[language] || translations["ko"];
    return currentTranslations[key] || key;
  }, [language]);

  const finalEmptyMessage = emptyMessage || t('noResults');

  // 1. 최대값 및 눈금 계산 (Nice Number Algorithm)
  const { effectiveMax, ticks } = useMemo(() => {
    if (!data || data.length === 0) return { effectiveMax: 10, ticks: [0, 2, 4, 6, 8, 10] };
    const rawMax = Math.max(...data.map(d => d.count));
    if (rawMax === 0) return { effectiveMax: 10, ticks: [0, 2, 4, 6, 8, 10] };

    // "Nice Number" 계산 로직
    const getNiceStep = (range: number, targetTicks: number) => {
      const rawStep = range / targetTicks;
      const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
      const res = rawStep / mag;
      let niceRes;
      if (res < 1.5) niceRes = 1;
      else if (res < 3) niceRes = 2;
      else if (res < 7) niceRes = 5;
      else niceRes = 10;
      return niceRes * mag;
    };

    const targetTickCount = 5;
    const step = getNiceStep(rawMax, targetTickCount - 1);
    const niceMax = Math.ceil(rawMax / step) * step;
    
    const resultTicks = [];
    for (let val = 0; val <= niceMax; val += step) {
      resultTicks.push(val);
    }
    
    return { effectiveMax: niceMax, ticks: resultTicks };
  }, [data]);

  const gridLines = useMemo(() => {
    return ticks.map((value) => {
      const bottomPct = (value / effectiveMax) * 100;
      return { bottomPct, value };
    });
  }, [effectiveMax, ticks]);

  // 2. 드래그 선택 로직
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    setSelectionStart(xPct);
    setSelectionEnd(xPct);
    setIsSelecting(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    setSelectionEnd(Math.max(0, Math.min(xPct, 100)));
  };

  const handleMouseUp = () => {
    if (!isSelecting || selectionStart === null || selectionEnd === null) {
      setIsSelecting(false);
      return;
    }
    const start = Math.min(selectionStart, selectionEnd);
    const end = Math.max(selectionStart, selectionEnd);
    if (end - start > 1 && data.length > 0) {
      const getIdx = (pct: number) => Math.min(data.length - 1, Math.floor((pct / 100) * data.length));
      const startIdx = getIdx(start);
      const endIdx = getIdx(end);
      
      // 인터벌 간격 계산 (기본 1분, 데이터가 충분하면 다음 데이터 시간까지)
      const startTime = data[startIdx].timestamp;
      let endTime = dayjs(data[endIdx].timestamp).add(1, 'minute').toISOString();
      if (endIdx < data.length - 1) {
        endTime = data[endIdx + 1].timestamp;
      }
      
      onRangeSelect?.(startTime, endTime);
    }
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  if (!data || data.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 150 }}>
        <Typography color="text.disabled">{finalEmptyMessage}</Typography>
      </Box>
    );
  }

  const Y_AXIS_WIDTH = 55;
  const X_AXIS_HEIGHT = 40; // 30 -> 40으로 추가 확장 (리스트 화면 대응)

  const CustomTooltip = ({ item }: { item: HistogramItem }) => (
    <Box sx={{ p: 0.5 }}>
      <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255,255,255,0.7)' }}>
        {dayjs(item.timestamp).format("YYYY-MM-DD HH:mm:ss")}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
        {t('countLabel') || 'Count'}: {item.count.toLocaleString()}
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ width: "100%", height: height ? height : "100%", display: 'flex', flexDirection: 'column', userSelect: 'none', px: 1 }}>
      {title && <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold", color: 'text.secondary' }}>{title}</Typography>}
      
      {/* Main Chart Row */}
      <Box sx={{ flexGrow: 1, display: 'flex', minHeight: 150 }}>
        {/* Y-Axis Column */}
        <Box sx={{ width: Y_AXIS_WIDTH, position: 'relative', flexShrink: 0 }}>
          {gridLines.map((line, i) => (
            <Typography 
              key={i} 
              variant="caption" 
              sx={{ 
                position: 'absolute', 
                bottom: `${line.bottomPct}%`, 
                right: 8, 
                transform: 'translateY(50%)', 
                color: 'text.secondary', 
                fontSize: '10px',
                lineHeight: 1
              }}
            >
              {line.value.toLocaleString()}
            </Typography>
          ))}
        </Box>

        {/* Plot Column (SVG) */}
        <Box sx={{ flexGrow: 1, position: 'relative', minWidth: 0, mr: 1 }}>
          {/* Background Grid Lines (CSS) */}
          {gridLines.map((line, i) => (
            <Box 
              key={i} 
              sx={{ 
                position: 'absolute', 
                bottom: `${line.bottomPct}%`, 
                left: 0, 
                right: 0, 
                height: '1px', 
                bgcolor: 'divider',
                zIndex: 0
              }} 
            />
          ))}

          {/* SVG for Bars and Interaction */}
          <svg 
            ref={svgRef}
            width="100%" 
            height="100%" 
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ display: "block", position: 'relative', zIndex: 1, cursor: 'crosshair', overflow: 'visible' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Bars */}
            {data.map((item, i) => {
              const barCount = data.length;
              const barWidth = (100 / barCount) * 0.8;
              const x = (100 / barCount) * i + (100 / barCount - barWidth) / 2;
              const barHeight = (item.count / Math.max(1, effectiveMax)) * 100;

              return (
                <Tooltip 
                  key={i} 
                  title={<CustomTooltip item={item} />} 
                  arrow 
                  placement="top"
                  enterNextDelay={0}
                  enterTouchDelay={0}
                >
                  <rect
                    x={`${x}%`}
                    y={`${100 - barHeight}%`}
                    width={`${barWidth}%`}
                    height={`${barHeight}%`}
                    fill="#20b2aa"
                    fillOpacity={0.8}
                    rx="0.2"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      const endTime = i < data.length - 1 ? data[i+1].timestamp : dayjs(item.timestamp).add(1, 'minute').toISOString();
                      onBarClick?.(item.timestamp, endTime);
                    }}
                  />
                </Tooltip>
              );
            })}

            {/* Selection Overlay */}
            {isSelecting && selectionStart !== null && selectionEnd !== null && (
              <rect
                x={`${Math.min(selectionStart, selectionEnd)}%`}
                y="0"
                width={`${Math.abs(selectionEnd - selectionStart)}%`}
                height="100"
                fill={theme.palette.primary.main}
                fillOpacity={0.2}
              />
            )}
          </svg>
        </Box>
      </Box>

      {/* X-Axis Row */}
      <Box sx={{ height: X_AXIS_HEIGHT, minHeight: X_AXIS_HEIGHT, ml: `${Y_AXIS_WIDTH}px`, mr: 1, position: 'relative', flexShrink: 0, overflow: 'visible' }}>
        {data.map((item, i) => {
          const maxLabels = window.innerWidth < 600 ? 4 : 8;
          const labelStep = Math.ceil(data.length / maxLabels);
          if (i % labelStep !== 0) return null;

          const isFirst = i === 0;
          const isLast = i >= data.length - labelStep;
          const xPct = (i / data.length) * 100;

          return (
            <Typography 
              key={i} 
              variant="caption" 
              sx={{ 
                position: 'absolute', 
                left: `${xPct}%`, 
                transform: isFirst ? 'none' : (isLast ? 'translateX(-100%)' : 'translateX(-50%)'), 
                top: 0, // 8 -> 0으로 변경하여 위로 끌어올림
                color: 'text.primary', 
                fontSize: '10px',
                whiteSpace: 'nowrap'
              }}
            >
              {dayjs(item.timestamp).format("HH:mm")}
            </Typography>
          );
        })}
      </Box>
    </Box>
  );
};

export default BarChartWidget;
