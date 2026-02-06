import React, { useMemo } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import type { HistogramItem } from "../../../services/dashboardService";
import dayjs from "dayjs";

interface BarChartWidgetProps {
  data: HistogramItem[];
  height?: number;
}

const BarChartWidget: React.FC<BarChartWidgetProps> = ({ data, height = 300 }) => {
  const theme = useTheme();

  // Find max value for scaling
  const maxValue = useMemo(() => {
    if (!data || data.length === 0) return 10;
    const max = Math.max(...data.map(d => d.count));
    return max === 0 ? 10 : max; // 20% 여유 공간 제거
  }, [data]);

  // SVG parameters
  const padding = { top: 20, right: 30, bottom: 40, left: 50 };
  const viewWidth = 1000;
  const viewHeight = height;
  const chartWidth = viewWidth - padding.left - padding.right;
  const chartHeight = viewHeight - padding.top - padding.bottom;

  // Grid lines
  const gridLines = useMemo(() => {
    const effectiveMax = Math.ceil(maxValue);
    // 최댓값이 5보다 작으면 최댓값만큼의 눈금을 생성하고, 아니면 5개로 고정
    const gridCount = effectiveMax < 5 ? Math.max(1, effectiveMax) : 5;
    
    return Array.from({ length: gridCount + 1 }).map((_, i) => {
      const value = Math.round((i * effectiveMax) / gridCount);
      const y = padding.top + chartHeight - (value / effectiveMax) * chartHeight;
      return { y, value };
    });
  }, [maxValue, chartHeight, padding.top]);

  if (!data || data.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column' }}>
        <Typography color="text.disabled">No log trend data available</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", height: "100%", position: "relative" }}>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold", color: 'text.secondary' }}>
        Log Activity Trend
      </Typography>
      
      <svg
        width="100%"
        height={viewHeight - 40}
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        preserveAspectRatio="none"
        style={{ display: "block" }}
      >
        {/* Background Grid */}
        {gridLines.map((line, i) => (
          <React.Fragment key={i}>
            <line
              x1={padding.left}
              y1={line.y}
              x2={padding.left + chartWidth}
              y2={line.y}
              stroke={theme.palette.divider}
              strokeWidth="1"
            />
            <text
              x={padding.left - 10}
              y={line.y + 4}
              fontSize="12"
              textAnchor="end"
              fill={theme.palette.text.secondary}
            >
              {line.value}
            </text>
          </React.Fragment>
        ))}

        {/* Bars */}
        {data.map((item, i) => {
          const barCount = data.length;
          const barContainerWidth = chartWidth / barCount;
          const barWidth = barContainerWidth * 0.7;
          const x = padding.left + (barContainerWidth * i) + (barContainerWidth - barWidth) / 2;
          const barHeight = (item.count / maxValue) * chartHeight;
          const y = padding.top + chartHeight - barHeight;

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={theme.palette.primary.main}
                rx="2"
              >
                <title>{`${dayjs(item.timestamp).format("YYYY-MM-DD HH:mm")}: ${item.count} logs`}</title>
              </rect>
              {/* X-axis labels (Sparse) */}
              {(i % Math.ceil(data.length / 8) === 0) && (
                <text
                  x={x + barWidth / 2}
                  y={padding.top + chartHeight + 25}
                  fontSize="12"
                  textAnchor="middle"
                  fill={theme.palette.text.secondary}
                >
                  {dayjs(item.timestamp).format("HH:mm")}
                </text>
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
  );
};

export default BarChartWidget;