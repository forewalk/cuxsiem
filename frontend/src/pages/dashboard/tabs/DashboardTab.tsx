import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Box, Paper, Typography, CircularProgress, Alert, LinearProgress, Divider } from "@mui/material";
import ControlBar from "../components/ControlBar";
import BarChartWidget from "../components/BarChartWidget";
import PieChartWidget from "../components/PieChartWidget";
import CategoryBarChartWidget from "../components/CategoryBarChartWidget";
import EditableTitle from "../components/EditableTitle";
import { getDashboardStats } from "../../../services/dashboardService";
import type { DashboardStatsResponse } from "../../../services/dashboardService";
import { useLanguageStore } from "../../../stores/useLanguageStore";

// i18n: JSON 파일에서 번역 로드
import koMessages from "../../../locales/ko.json";
import enMessages from "../../../locales/en.json";
import jaMessages from "../../../locales/ja.json";

const DashboardTab: React.FC = () => {
  const [fromValue, setFromValue] = useState<number | null>(15);
  const [fromUnit, setFromUnit] = useState("m");
  const [toValue, setToValue] = useState<number | null>(null);
  const [toUnit, setToUnit] = useState("m");
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  
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

  const handleTimeChange = (
    fVal: number | null, 
    fUnit: string, 
    tVal: number | null, 
    tUnit: string,
    fDate: string | null = null,
    tDate: string | null = null
  ) => {
    setFromValue(fVal);
    setFromUnit(fUnit);
    setToValue(tVal);
    setToUnit(tUnit);
    setFromDate(fDate);
    setToDate(tDate);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const stats = await getDashboardStats(
        fromValue ?? undefined,
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

  const StatPanel = ({ id, title, value, color }: { id: string, title: string, value: number, color?: string }) => (
    <Paper elevation={1} sx={{ p: 2, height: 140, display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
      <EditableTitle panelId={id} defaultTitle={title} variant="caption" />
      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h3" sx={{ fontWeight: 'bold', color: color || 'text.primary' }}>
          {value.toLocaleString()}
        </Typography>
      </Box>
      <Typography variant="caption" sx={{ color: 'text.disabled', textAlign: 'center' }}>
        {t('count', { fallback: '건' })}
      </Typography>
    </Paper>
  );

  const ChartPlaceholder = ({ id, title, type = 'bar' }: { id: string, title: string, type?: 'bar' | 'pie' | 'list' }) => (
    <Paper elevation={1} sx={{ p: 2.5, height: 380, display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
      <EditableTitle panelId={id} defaultTitle={title} />
      <Box sx={{ 
        flexGrow: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        bgcolor: 'action.hover', 
        borderRadius: 1,
        border: '1px dashed',
        borderColor: 'divider',
        mt: 1
      }}>
        <Box sx={{ textAlign: 'center' }}>
          {type === 'pie' ? (
            <Box sx={{ width: 120, height: 120, borderRadius: '50%', border: '10px solid', borderColor: 'primary.light', mb: 1, mx: 'auto', opacity: 0.3 }} />
          ) : type === 'list' ? (
            <Box sx={{ width: 250, display: 'flex', flexDirection: 'column', gap: 1, mx: 'auto' }}>
              {[1,2,3].map(i => (
                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ height: 12, bgcolor: 'divider', borderRadius: 0.5, width: `${100 - i*20}%` }} />
                  <Box sx={{ height: 12, bgcolor: 'divider', borderRadius: 0.5, width: 20 }} />
                </Box>
              ))}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 80, mb: 1 }}>
              {[40, 70, 30, 90, 50].map((h, i) => <Box key={i} sx={{ width: 15, height: `${h}%`, bgcolor: 'primary.light', opacity: 0.3, borderRadius: '2px 2px 0 0' }} />)}
            </Box>
          )}
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1 }}>{t('noResults')}</Typography>
        </Box>
      </Box>
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
        fromDate={fromDate} toDate={toDate}
        onTimeChange={handleTimeChange}
        searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} onRefresh={fetchData}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
        {/* Main Log Trend Chart */}
        <Paper elevation={1} sx={{ p: 3, height: 450, width: '100%', borderRadius: 2 }}>
          <Box sx={{ mb: 1 }}>
            <EditableTitle panelId="main-trend" defaultTitle={t('logActivityTrend')} variant="subtitle2" />
          </Box>
          <BarChartWidget 
            data={data?.histogram || []} 
            height={380} 
            emptyMessage={t('noLogs')}
          />
        </Paper>

        {/* Summary Panels */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr 1fr' }, gap: 2 }}>
            <StatPanel id="total-threats" title={t('totalThreats')} value={data?.summary.total_threats ?? 0} />
            <StatPanel id="unresolved-count" title={t('unresolvedThreats')} value={data?.summary.unresolved_threats ?? 0} color="warning.main" />
            <StatPanel id="resolved-count" title={t('resolvedThreats')} value={data?.summary.resolved_threats ?? 0} color="success.main" />
            <StatPanel id="active-count" title={t('activeThreats')} value={data?.summary.active_threats ?? 0} color="error.main" />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
            <StatPanel id="blocked-count" title={t('blockedThreats')} value={data?.summary.blocked_threats ?? 0} color="info.main" />
            <StatPanel id="mitigated-count" title={t('mitigatedThreats')} value={data?.summary.mitigated_threats ?? 0} color="primary.main" />
            <StatPanel id="suspicious-count" title={t('suspiciousThreats')} value={0} color="secondary.main" />
          </Box>
        </Box>

        <Divider />

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
          <Paper elevation={1} sx={{ p: 2.5, height: 380, display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
            <EditableTitle panelId="detection-engine" defaultTitle={t('detectionEngine')} />
            <Box sx={{ mt: 1, flexGrow: 1 }}>
              <PieChartWidget 
                data={data?.detection_stats || []} 
                height={320}
                emptyMessage={t('noResults')}
              />
            </Box>
          </Paper>
          <Paper elevation={1} sx={{ p: 2.5, height: 380, display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
            <EditableTitle panelId="prevalent-threats" defaultTitle={t('prevalentThreats')} />
            <Box sx={{ mt: 1, flexGrow: 1 }}>
              <CategoryBarChartWidget 
                data={data?.prevalent_threats || []} 
                height={320}
                emptyMessage={t('noResults')}
              />
            </Box>
          </Paper>
          <ChartPlaceholder id="agent-status" title={t('threatsByAgentStatus')} type="pie" />
          <Paper elevation={1} sx={{ p: 2.5, height: 380, display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
            <EditableTitle panelId="mitigation-status" defaultTitle={t('threatsByMitigationStatus')} />
            <Box sx={{ mt: 1, flexGrow: 1 }}>
              <CategoryBarChartWidget 
                data={data?.mitigation_stats || []} 
                height={320}
                emptyMessage={t('noResults')}
              />
            </Box>
          </Paper>
        </Box>

        <Divider />

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
          <ChartPlaceholder id="mitigation-mode" title={t('threatsByAgentMitigationMode')} type="bar" />
          <ChartPlaceholder id="confidence-level" title={t('threatsByConfidenceLevel')} type="bar" />
          <ChartPlaceholder id="file-extension-type" title={t('threatsByFileExtensionType')} type="bar" />
          <ChartPlaceholder id="incident-status" title={t('threatsByIncidentStatus')} type="bar" />
        </Box>

        <Divider />

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
          <ChartPlaceholder id="top-file-ext" title={t('top10FileExtension')} type="list" />
          <ChartPlaceholder id="top-threat-tech" title={t('top10ThreatTechniques')} type="list" />
          <ChartPlaceholder id="infected-agents" title={t('threatsByInfectedAgents')} type="pie" />
          <ChartPlaceholder id="mitigation-status-detail" title={t('threatsByMitigationStatusDetail')} type="pie" />
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardTab;
