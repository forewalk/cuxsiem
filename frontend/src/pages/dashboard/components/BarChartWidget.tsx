import React, { useMemo } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import type { HistogramItem } from "../../../services/dashboardService";
import dayjs from "dayjs";

interface BarChartWidgetProps {
  data: HistogramItem[];
  height?: number;
  title?: string;
  emptyMessage?: string;
}

const BarChartWidget: React.FC<BarChartWidgetProps> = ({ data, height = 300, title, emptyMessage = "No data available" }) => {
  const theme = useTheme();

  // Find max value for scaling
  const maxValue = useMemo(() => {
    if (!data || data.length === 0) return 10;
    const max = Math.max(...data.map(d => d.count));
    return max === 0 ? 10 : max;
  }, [data]);

  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const viewWidth = 1000;
  const viewHeight = height;
  const chartWidth = viewWidth - padding.left - padding.right;
  const chartHeight = viewHeight - padding.top - padding.bottom;

  // Grid lines calculation
  const gridLines = useMemo(() => {
    const effectiveMax = Math.ceil(maxValue);
    let ticks: number[] = [];

    if (effectiveMax <= 10) {
      // 최댓값이 10 이하이면 모든 정수 단위를 눈금으로 표시
      ticks = Array.from({ length: effectiveMax + 1 }, (_, i) => i);
    } else {
      // 최댓값이 크면 약 5개의 구간으로 나눔
      const step = Math.ceil(effectiveMax / 5);
      for (let i = 0; i <= 5; i++) {
        const val = i * step;
        if (val <= effectiveMax) ticks.push(val);
      }
      // 마지막 값이 최댓값보다 작으면 최댓값 추가
      if (ticks[ticks.length - 1] < effectiveMax) {
        ticks.push(effectiveMax);
      }
    }
    
    return ticks.map((value) => {
      const y = padding.top + chartHeight - (value / effectiveMax) * chartHeight;
      return { y, value };
    });
  }, [maxValue, chartHeight, padding.top]);

  if (!data || data.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column' }}>
        <Typography color="text.disabled">{emptyMessage}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", height: "100%", display: 'flex', flexDirection: 'column' }}>
      {title && (
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold", color: 'text.secondary' }}>
          {title}
        </Typography>
      )}
      
      <Box sx={{ flexGrow: 1, width: '100%' }}>
        <svg
          width="100%"
          height={viewHeight}
          viewBox={`0 0 ${viewWidth} ${viewHeight}`}
          preserveAspectRatio="none"
          style={{ display: "block", overflow: 'visible' }}
        >
          {/* Y-axis Labels & Grid Lines (SVG) */}
          {gridLines.map((line, i) => (
            <g key={i}>
              {/* Grid Line */}
              <line
                x1={padding.left}
                y1={line.y}
                x2={padding.left + chartWidth}
                y2={line.y}
                stroke={theme.palette.divider}
                strokeWidth="1"
              />
              {/* Y-axis Text */}
              <text
                x={padding.left - 10}
                y={line.y + 4}
                fontSize="12"
                textAnchor="end"
                fill={theme.palette.text.secondary}
                style={{ pointerEvents: 'none' }}
              >
                {line.value}
              </text>
            </g>
          ))}

          {/* Bars */}
          {data.map((item, i) => {
            const barCount = data.length;
            const barContainerWidth = chartWidth / barCount;
            // 막대 너비 비율을 0.7에서 0.85로 높여 더 촘촘하게 함
            const barWidth = barContainerWidth * 0.85; 
            const x = padding.left + (barContainerWidth * i) + (barContainerWidth - barWidth) / 2;
            
            const barHeight = (item.count / Math.ceil(maxValue)) * chartHeight;
            const y = padding.top + chartHeight - barHeight;

            const isMultiDay = data.length > 0 && 
              !dayjs(data[0].timestamp).isSame(dayjs(data[data.length-1].timestamp), 'day');

            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={Math.max(1, barWidth)} // 최소 1px 너비 보장
                  height={barHeight}
                  fill={theme.palette.primary.main}
                  rx={barWidth > 4 ? 1 : 0} // 막대가 너무 좁으면 둥근 모서리 제거
                >
                  <title>{`${dayjs(item.timestamp).format("YYYY-MM-DD HH:mm")}: ${item.count} logs`}</title>
                </rect>
                
                {/* X-axis labels (More compact) */}
                {i % Math.ceil(data.length / 12) === 0 && (
                  <g transform={`translate(${x + barWidth / 2}, ${padding.top + chartHeight + 18})`}>
                    {isMultiDay && (
                      <text
                        y="-10"
                        fontSize="9"
                        textAnchor="middle"
                        fill={theme.palette.text.disabled}
                      >
                        {dayjs(item.timestamp).format("MM-DD")}
                      </text>
                    )}
                    <text
                      fontSize="10"
                      textAnchor="middle"
                      fill={theme.palette.text.secondary}
                    >
                      {dayjs(item.timestamp).format("HH:mm")}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Baseline */}
          <line
            x1={padding.left}
            y1={padding.top + chartHeight}
            x2={padding.left + chartWidth}
            y2={padding.top + chartHeight}
            stroke={theme.palette.text.secondary}
            strokeWidth="1"
          />
        </svg>
      </Box>
    </Box>
  );
};

export default BarChartWidget;