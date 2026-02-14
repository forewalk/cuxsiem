import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Box, Paper, Typography, CircularProgress, Alert, LinearProgress, Divider } from "@mui/material";
import ControlBar from "../components/ControlBar";
import PieChartWidget from "../components/PieChartWidget";
import CategoryBarChartWidget from "../components/CategoryBarChartWidget";
import { getDashboardStats } from "../../../services/dashboardService";
import type { DashboardStatsResponse } from "../../../services/dashboardService";
import { useLanguageStore } from "../../../stores/useLanguageStore";
import dayjs from "dayjs";

// i18n: JSON 파일에서 번역 로드
import koMessages from "../../../locales/ko.json";
import enMessages from "../../../locales/en.json";
import jaMessages from "../../../locales/ja.json";
import cnMessages from "../../../locales/cn.json";

const DashboardTab: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useLanguageStore();

  // URL 파라미터에서 초기값 읽기
  const fromValue = searchParams.get("from_value") ? Number(searchParams.get("from_value")) : 15;
  const fromUnit = searchParams.get("from_unit") || "m";
  const toValue = searchParams.get("to_value") ? Number(searchParams.get("to_value")) : null;
  const toUnit = searchParams.get("to_unit") || "m";
  const fromDate = searchParams.get("from_date");
  const toDate = searchParams.get("to_date");
  const searchQuery = searchParams.get("q") || "";

  const [data, setData] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const translations: Record<string, Record<string, string>> = {
    ko: koMessages,
    en: enMessages,
    ja: jaMessages,
    cn: cnMessages,
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

  const handleTimeChange = (
    fVal: number | null, 
    fUnit: string, 
    tVal: number | null, 
    tUnit: string,
    fDate: string | null = null,
    tDate: string | null = null
  ) => {
    const newParams = new URLSearchParams(searchParams);
    if (fVal !== null) newParams.set("from_value", fVal.toString()); else newParams.delete("from_value");
    newParams.set("from_unit", fUnit);
    if (tVal !== null) newParams.set("to_value", tVal.toString()); else newParams.delete("to_value");
    newParams.set("to_unit", tUnit);
    if (fDate) newParams.set("from_date", fDate); else newParams.delete("from_date");
    if (tDate) newParams.set("to_date", tDate); else newParams.delete("to_date");
    setSearchParams(newParams);
  };

  const handleSearchQueryChange = (query: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (query) newParams.set("q", query); else newParams.delete("q");
    setSearchParams(newParams);
  };

  const handleChartClick = (field: string, value: string) => {
    const filter = `${field}:"${value}"`;
    if (!searchQuery) {
      handleSearchQueryChange(filter);
    } else if (!searchQuery.includes(filter)) {
      handleSearchQueryChange(`${searchQuery} AND ${filter}`);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const stats = await getDashboardStats(
        fromValue || undefined,
        fromUnit,
        toValue ?? undefined,
        toUnit,
        fromDate ?? undefined,
        toDate ?? undefined,
        searchQuery || undefined
      );
      setData(stats);
    } catch (err) {
      console.error("Failed to fetch dashboard stats", err);
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [fromValue, fromUnit, toValue, toUnit, fromDate, toDate, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const StatPanel = ({ title, value, color }: { title: string, value: number, color?: string }) => (
    <Paper elevation={1} sx={{ p: { xs: 0.75, sm: 1.5, md: 2 }, height: { xs: 90, sm: 120, md: 140 }, display: 'flex', flexDirection: 'column', borderRadius: 1.5 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold', mb: 0.25, height: { xs: 24, sm: 32, md: 40 }, fontSize: { xs: '0.6rem', sm: '0.7rem', md: '0.75rem' }, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.1 }}>
        {title}
      </Typography>
      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h3" sx={{ fontWeight: 'bold', color: color || 'text.primary', fontSize: { xs: '1.25rem', sm: '1.75rem', md: '2.5rem' } }}>
          {value.toLocaleString()}
        </Typography>
      </Box>
      <Typography variant="caption" sx={{ color: 'text.disabled', textAlign: 'right', fontSize: '0.55rem' }}>
        {t('count', { fallback: '건' })}
      </Typography>
    </Paper>
  );

  const ChartPlaceholder = ({ title, type = 'bar' }: { title: string, type?: 'bar' | 'pie' | 'list' }) => (
    <Paper elevation={1} sx={{ p: { xs: 1, md: 2 }, height: { xs: 240, sm: 320, md: 380 }, display: 'flex', flexDirection: 'column', borderRadius: 1.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, fontSize: { xs: '0.7rem', md: '0.875rem' } }}>
        {title}
      </Typography>
      <Box sx={{ 
        flexGrow: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        bgcolor: 'action.hover', 
        borderRadius: 1,
        border: '1px dashed',
        borderColor: 'divider'
      }}>
        <Box sx={{ textAlign: 'center' }}>
          {type === 'pie' ? (
            <Box sx={{ width: { xs: 60, sm: 100 }, height: { xs: 60, sm: 100 }, borderRadius: '50%', border: '6px solid', borderColor: 'primary.light', mb: 1, mx: 'auto', opacity: 0.3 }} />
          ) : type === 'list' ? (
            <Box sx={{ width: { xs: 150, sm: 220 }, display: 'flex', flexDirection: 'column', gap: 0.75, mx: 'auto' }}>
              {[1,2,3].map(i => (
                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ height: 10, bgcolor: 'divider', borderRadius: 0.5, width: `${100 - i*20}%` }} />
                  <Box sx={{ height: 10, bgcolor: 'divider', borderRadius: 0.5, width: 20 }} />
                </Box>
              ))}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.75, height: { xs: 40, sm: 70 }, mb: 1 }}>
              {[40, 70, 30, 90, 50].map((h, i) => <Box key={i} sx={{ width: { xs: 6, sm: 12 }, height: `${h}%`, bgcolor: 'primary.light', opacity: 0.3, borderRadius: '2px 2px 0 0' }} />)}
            </Box>
          )}
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5, fontSize: '0.65rem' }}>{t('noResults')}</Typography>
        </Box>
      </Box>
    </Paper>
  );

  return (
    <Box id="dashboard-tab-container" sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden', height: '100%', position: 'relative', p: { xs: 1, sm: 2, md: 3 } }}>
      {loading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }} />}
      <ControlBar 
        t={t}
        fromValue={fromValue} fromUnit={fromUnit}
        toValue={toValue} toUnit={toUnit}
        fromDate={fromDate} toDate={toDate}
        onTimeChange={handleTimeChange}
        searchQuery={searchQuery} onSearchQueryChange={handleSearchQueryChange} onRefresh={fetchData}
        lastUpdated={data?.last_updated ? dayjs(data.last_updated).add(9, 'hour').format("HH:mm:ss") : undefined}
      />

      {error && <Alert severity="error" sx={{ mb: 1, fontSize: '0.7rem', py: 0 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1, md: 3 }, width: '100%', maxWidth: '100vw' }}>
        {/* Summary Panels */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1, md: 2 } }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: { xs: 0.75, sm: 1.5, md: 2 } }}>
            <StatPanel title={t('totalThreats')} value={data?.summary.total_threats ?? 0} />
            <StatPanel title={t('unresolvedThreats')} value={data?.summary.unresolved_threats ?? 0} color="warning.main" />
            <StatPanel title={t('resolvedThreats')} value={data?.summary.resolved_threats ?? 0} color="success.main" />
            <StatPanel title={t('activeThreats')} value={data?.summary.active_threats ?? 0} color="error.main" />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' }, gap: { xs: 0.75, sm: 1.5, md: 2 } }}>
            <StatPanel title={t('blockedThreats')} value={data?.summary.blocked_threats ?? 0} color="info.main" />
            <StatPanel title={t('mitigatedThreats')} value={data?.summary.mitigated_threats ?? 0} color="primary.main" />
            <StatPanel title={t('suspiciousThreats')} value={0} color="secondary.main" />
          </Box>
        </Box>

        <Divider sx={{ my: { xs: 0.5, md: 1 } }} />

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: 1, md: 2 } }}>
          <Paper elevation={1} sx={{ p: { xs: 1, md: 2 }, height: { xs: 240, sm: 320, md: 380 }, display: 'flex', flexDirection: 'column', borderRadius: 1.5, overflow: 'hidden' }}>
            <PieChartWidget 
              title={t('detectionEngine')} 
              data={data?.detection_stats || []} 
              height={undefined}
              emptyMessage={t('noResults')}
              onSliceClick={(label) => handleChartClick('threatInfo.detectionEngines.title', label)}
            />
          </Paper>
          <Paper elevation={1} sx={{ p: { xs: 1, md: 2 }, height: { xs: 240, sm: 320, md: 380 }, display: 'flex', flexDirection: 'column', borderRadius: 1.5, overflow: 'hidden' }}>
            <CategoryBarChartWidget 
              title={t('prevalentThreats')} 
              data={data?.prevalent_threats || []} 
              height={undefined}
              emptyMessage={t('noResults')}
              onBarClick={(label) => handleChartClick('threatInfo.threatName', label)}
            />
          </Paper>
          <ChartPlaceholder title={t('threatsByAgentStatus')} type="pie" />
          <Paper elevation={1} sx={{ p: { xs: 1, md: 2 }, height: { xs: 240, sm: 320, md: 380 }, display: 'flex', flexDirection: 'column', borderRadius: 1.5, overflow: 'hidden' }}>
            <CategoryBarChartWidget 
              title={t('threatsByMitigationStatus')} 
              data={data?.mitigation_stats || []} 
              height={undefined}
              emptyMessage={t('noResults')}
              onBarClick={(label) => handleChartClick('threatInfo.mitigationStatus', label)}
            />
          </Paper>
        </Box>

        <Divider />

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
          <ChartPlaceholder title={t('threatsByAgentMitigationMode')} type="bar" />
          <ChartPlaceholder title={t('threatsByConfidenceLevel')} type="bar" />
          <ChartPlaceholder title={t('threatsByFileExtensionType')} type="bar" />
          <ChartPlaceholder title={t('threatsByIncidentStatus')} type="bar" />
        </Box>

        <Divider />

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
          <ChartPlaceholder title={t('top10FileExtension')} type="list" />
          <ChartPlaceholder title={t('top10ThreatTechniques')} type="list" />
          <ChartPlaceholder title={t('threatsByInfectedAgents')} type="pie" />
          <ChartPlaceholder title={t('threatsByMitigationStatusDetail')} type="pie" />
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardTab;