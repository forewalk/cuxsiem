import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useLanguageStore } from '../../../../stores/useLanguageStore';
import TimeRangePicker from '../../../../components/shared/TimeRangePicker';
import ControlSearchBar from '../../../../components/shared/ControlSearchBar';

const ACCENT = '#005a5e';

interface ControlBarProps {
  t: (key: string, params?: Record<string, string>) => string;
  fromValue: number | null;
  fromUnit: string;
  toValue: number | null;
  toUnit: string;
  fromDate: string | null;
  toDate: string | null;
  onTimeChange: (
    fromVal: number | null, fromUnit: string,
    toVal: number | null, toUnit: string,
    fDate: string | null, tDate: string | null
  ) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onRefresh: () => void;
  lastUpdated?: string;
}

const AlertsControlBar: React.FC<ControlBarProps> = ({
  t, fromValue, fromUnit, toValue, toUnit, fromDate, toDate,
  onTimeChange, onSearchQueryChange, onRefresh, lastUpdated,
}) => {
  const theme = useTheme();
  const { language } = useLanguageStore();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 0.5, md: 0.75 }, mb: { xs: 1, md: 2 }, width: '100%' }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, alignItems: 'stretch', gap: 0.5, width: '100%' }}>
        <ControlSearchBar
          t={t}
          placeholder={t('alertSearchPlaceholder')}
          onSubmit={onSearchQueryChange}
        />

        <Box sx={{ display: 'flex', gap: 0.5, width: { xs: '100%', lg: 'auto' } }}>
          <TimeRangePicker
            t={t} language={language}
            fromValue={fromValue} fromUnit={fromUnit}
            toValue={toValue} toUnit={toUnit}
            fromDate={fromDate} toDate={toDate}
            onTimeChange={onTimeChange} onRefresh={onRefresh}
          />

          <Button variant="contained" disableElevation
            startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
            onClick={onRefresh}
            sx={{ bgcolor: ACCENT, color: '#fff', textTransform: 'none', fontWeight: 'bold', px: 1.5, minWidth: { xs: 'fit-content', md: 80 }, minHeight: 32, fontSize: '0.75rem', '&:hover': { bgcolor: '#004a4d' } }}>
            {isMobile ? '' : t('refresh')}
          </Button>
        </Box>
      </Box>

      {lastUpdated && (
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.25 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
            {t('lastUpdated')}: {lastUpdated}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default AlertsControlBar;
