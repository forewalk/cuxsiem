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

  const maxValue = useMemo(() => {
    if (!data || data.length === 0) return 10;
    const max = Math.max(...data.map(d => d.count));
    return max === 0 ? 10 : max;
  }, [data]);

  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
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
      
      <Box sx={{ flexGrow: 1, position: 'relative', width: '100%' }}>
        {/* Y-axis Labels (HTML - No Distortion) */}
        {gridLines.map((line, i) => (
          <Typography 
            key={i}
            variant="caption"
            sx={{ 
              position: 'absolute', 
              top: line.top, 
              left: 0, 
              width: padding.left - 10, 
              textAlign: 'right',
              transform: 'translateY(-50%)',
              color: 'text.secondary',
              fontSize: '11px',
              pointerEvents: 'none'
            }}
          >
            {line.value}
          </Typography>
        ))}

        {/* Chart Area */}
        <Box sx={{ position: 'absolute', top: padding.top, left: padding.left, right: padding.right, bottom: padding.bottom }}>
          {/* Background Grid Lines */}
          {gridLines.map((line, i) => (
            <Box 
              key={i}
              sx={{ 
                position: 'absolute', 
                top: `${((gridLines.length - 1 - i) / (gridLines.length - 1)) * 100}%`,
                left: 0,
                right: 0,
                height: '1px',
                bgcolor: theme.palette.divider,
                pointerEvents: 'none'
              }}
            />
          ))}

          {/* SVG Graphical Elements Only */}
          <svg
            width="100%"
            height="100%"
            preserveAspectRatio="none"
            style={{ display: "block", overflow: 'visible' }}
          >
            {data.map((item, i) => {
              const barCount = data.length;
              const barContainerWidthPct = 100 / barCount;
              const barWidthPct = barContainerWidthPct * 0.85;
              const xPct = (barContainerWidthPct * i) + (barContainerWidthPct - barWidthPct) / 2;
              const barHeightPct = (item.count / Math.ceil(maxValue)) * 100;

              return (
                <rect
                  key={i}
                  x={`${xPct}%`}
                  y={`${100 - barHeightPct}%`}
                  width={`${barWidthPct}%`}
                  height={`${barHeightPct}%`}
                  fill={theme.palette.primary.main}
                  rx="1"
                >
                  <title>{`${dayjs(item.timestamp).format("YYYY-MM-DD HH:mm")}: ${item.count} logs`}</title>
                </rect>
              );
            })}
            {/* Baseline */}
            <line x1="0" y1="100%" x2="100%" y2="100%" stroke={theme.palette.text.secondary} strokeWidth="1" />
          </svg>

          {/* X-axis Labels (HTML - No Distortion) */}
          <Box sx={{ position: 'absolute', top: '100%', left: 0, right: 0, height: padding.bottom, display: 'flex' }}>
            {data.map((item, i) => {
              const labelStep = Math.ceil(data.length / 12);
              const showLabel = i % labelStep === 0;
              if (!showLabel) return <Box key={i} sx={{ flex: 1 }} />;
              
              const isMultiDay = data.length > 0 && 
                !dayjs(data[0].timestamp).isSame(dayjs(data[data.length-1].timestamp), 'day');

              return (
                <Box key={i} sx={{ flex: 1, position: 'relative' }}>
                  <Box 
                    sx={{ 
                      position: 'absolute',
                      left: '50%',
                      top: 8,
                      transform: 'translateX(-50%)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      pointerEvents: 'none'
                    }}
                  >
                    {isMultiDay && (
                      <Typography 
                        variant="caption"
                        sx={{ color: 'text.disabled', fontSize: '9px', lineHeight: 1, mb: 0.2 }}
                      >
                        {dayjs(item.timestamp).format("MM-DD")}
                      </Typography>
                    )}
                    <Typography 
                      variant="caption"
                      sx={{ whiteSpace: 'nowrap', color: 'text.secondary', fontSize: '10px', lineHeight: 1 }}
                    >
                      {dayjs(item.timestamp).format("HH:mm")}
                    </Typography>
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
