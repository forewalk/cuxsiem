import React, { useState, useEffect, useCallback } from "react";
import { Box, Grid, Paper, Typography, CircularProgress, Alert, LinearProgress } from "@mui/material";
import ControlBar from "./components/ControlBar";
import BarChartWidget from "./components/BarChartWidget";
import { getDashboardStats, getDashboardIndices } from "../../services/dashboardService";
import type { DashboardStatsResponse } from "../../services/dashboardService";
import dayjs from "dayjs";

const DashboardPage: React.FC = () => {
  const [indices, setIndices] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState("");
  const [timeRange, setTimeRange] = useState("15m");
  const [searchQuery, setSearchQuery] = useState("");
  const [data, setData] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch indices list once
  useEffect(() => {
    const fetchIndices = async () => {
      try {
        const list = await getDashboardIndices();
        setIndices(list);
      } catch (err) {
        console.error("Failed to fetch indices", err);
      }
    };
    fetchIndices();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const stats = await getDashboardStats(
        selectedIndex || undefined, 
        timeRange,
        searchQuery || undefined
      );
      setData(stats);
    } catch (err) {
      console.error("Failed to fetch dashboard stats", err);
      setError("Failed to load dashboard data. Check your query syntax.");
    } finally {
      setLoading(false);
    }
  }, [selectedIndex, timeRange, searchQuery]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading && !data) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2, position: 'relative' }}>
      {loading && (
        <LinearProgress 
          sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }} 
        />
      )}
      <ControlBar 
        indices={indices}
        selectedIndex={selectedIndex}
        onIndexChange={setSelectedIndex}
        timeRange={timeRange} 
        onTimeRangeChange={setTimeRange}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onRefresh={fetchData}
        lastUpdated={data?.last_updated ? dayjs(data.last_updated).format("HH:mm:ss") : undefined}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      <Grid container spacing={3}>
        {/* Summary Card */}
        <Grid xs={12}>
          <Paper sx={{ p: 2, display: "flex", flexDirection: "column", height: 100, justifyContent: 'center' }}>
            <Typography color="text.secondary" gutterBottom variant="subtitle2">Total Logs (Filtered)</Typography>
            <Typography variant="h3" sx={{ fontWeight: 'bold' }}>{data?.summary?.total_logs?.toLocaleString() ?? 0}</Typography>
          </Paper>
        </Grid>

        {/* Main Chart Area */}
        <Grid xs={12}>
          <Paper sx={{ p: 2, height: 400 }}>
            <BarChartWidget data={data?.histogram || []} height={350} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;