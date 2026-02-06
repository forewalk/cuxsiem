import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Box, Paper, Typography, CircularProgress, Alert, LinearProgress, Divider } from "@mui/material";
import ControlBar from "./components/ControlBar";
import BarChartWidget from "./components/BarChartWidget";
import { getDashboardStats } from "../../services/dashboardService";
import type { DashboardStatsResponse } from "../../services/dashboardService";
import { useLanguageStore } from "../../stores/useLanguageStore";
import dayjs from "dayjs";

// i18n: JSON 파일에서 번역 로드
import koMessages from "../../locales/ko.json";
import enMessages from "../../locales/en.json";
import jaMessages from "../../locales/ja.json";

const DashboardPage: React.FC = () => {
  const [fromValue, setFromValue] = useState(15);
  const [fromUnit, setFromUnit] = useState("m");
  const [toValue, setToValue] = useState<number | null>(null);
  const [toUnit, setToUnit] = useState("m");
  const [searchQuery, setSearchQuery] = useState("");
  const [data, setData] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { language } = useLanguageStore();
  const translations: Record<string, Record<string, string>> = {
    ko: koMessages,
    en: enMessages,
    ja: jaMessages,
  };

  const t = useMemo(() => (key: string, params?: Record<string, string>): string => {
    const currentTranslations = translations[language] || translations["ko"] || {};
    let text = currentTranslations[key] || key;
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(`{${paramKey}}`, value);
      });
    }
    return text;
  }, [language]);

  const handleTimeChange = (fVal: number, fUnit: string, tVal: number | null, tUnit: string) => {
    setFromValue(fVal);
    setFromUnit(fUnit);
    setToValue(tVal);
    setToUnit(tUnit);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const stats = await getDashboardStats(
        fromValue,
        fromUnit,
        toValue ?? undefined,
        toUnit,
        searchQuery || undefined
      );
      setData(stats);
    } catch (err) {
      console.error("Failed to fetch dashboard stats", err);
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [fromValue, fromUnit, toValue, toUnit, searchQuery]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const StatPanel = ({ title, value, color }: { title: string, value: number, color?: string }) => (
    <Paper elevation={1} sx={{ p: 2, height: 140, display: 'flex', flexDirection: 'column', borderRadius: 1 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold', mb: 1, height: 40 }}>
        {title}
      </Typography>
      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h3" sx={{ fontWeight: 'bold', color: color || 'text.primary' }}>
          {value.toLocaleString()}
        </Typography>
      </Box>
      <Typography variant="caption" sx={{ color: 'text.disabled', textAlign: 'center' }}>
        {t('count', { fallback: 'Count' })}
      </Typography>
    </Paper>
  );

  if (loading && !data) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto', height: '100%', position: 'relative', p: 3 }}>
      {loading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }} />}
      <ControlBar 
        t={t}
        fromValue={fromValue} fromUnit={fromUnit}
        toValue={toValue} toUnit={toUnit}
        onTimeChange={handleTimeChange}
        searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} onRefresh={fetchData}
        lastUpdated={data?.last_updated ? dayjs(data.last_updated).format("HH:mm:ss") : undefined}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
        <Paper elevation={1} sx={{ p: 3, height: 450, width: '100%', borderRadius: 2 }}>
          <BarChartWidget data={data?.histogram || []} height={380} title={t('logActivityTrend')} />
        </Paper>

        <Divider sx={{ my: 1 }} />

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr 1fr' }, gap: 2, width: '100%' }}>
          <StatPanel title={t('totalThreats')} value={data?.summary.total_threats ?? 0} />
          <StatPanel title={t('unresolvedThreats')} value={data?.summary.unresolved_threats ?? 0} color="warning.main" />
          <StatPanel title={t('resolvedThreats')} value={data?.summary.resolved_threats ?? 0} color="success.main" />
          <StatPanel title={t('activeThreats')} value={data?.summary.active_threats ?? 0} color="error.main" />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2, width: '100%' }}>
          <StatPanel title={t('blockedThreats')} value={data?.summary.blocked_threats ?? 0} color="info.main" />
          <StatPanel title={t('mitigatedThreats')} value={data?.summary.mitigated_threats ?? 0} color="primary.main" />
          <StatPanel title={t('suspiciousThreats')} value={data?.summary.suspicious_threats ?? 0} color="secondary.main" />
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardPage;
