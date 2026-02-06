import React, { useState, useEffect } from "react";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import FormControl from "@mui/material/FormControl";
import Tooltip from "@mui/material/Tooltip";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Chip from "@mui/material/Chip";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import StorageIcon from "@mui/icons-material/Storage";

interface ControlBarProps {
  t: (key: string, params?: Record<string, string>) => string;
  fromValue: number;
  fromUnit: string;
  toValue: number | null;
  toUnit: string;
  onTimeChange: (fromVal: number, fromUnit: string, toVal: number | null, toUnit: string) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onRefresh: () => void;
  lastUpdated?: string;
}

const ControlBar: React.FC<ControlBarProps> = ({ 
  t,
  fromValue,
  fromUnit,
  toValue,
  toUnit,
  onTimeChange,
  searchQuery,
  onSearchQueryChange,
  onRefresh,
  lastUpdated 
}) => {
  const [tempQuery, setTempQuery] = useState(searchQuery);
  const [tempFromValue, setTempFromValue] = useState(fromValue.toString());
  const [tempToValue, setTempToValue] = useState(toValue?.toString() || "");

  useEffect(() => {
    setTempQuery(searchQuery);
  }, [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchQueryChange(tempQuery);
  };

  const handleTimeUpdate = () => {
    const fromVal = parseInt(tempFromValue);
    const toVal = tempToValue === "" ? null : parseInt(tempToValue);
    
    if (!isNaN(fromVal) && fromVal > 0) {
      onTimeChange(fromVal, fromUnit, toVal, toUnit);
    } else {
      setTempFromValue(fromValue.toString());
    }
  };

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 1, 
        mb: 2, 
        display: "flex", 
        flexDirection: { xs: 'column', lg: 'row' },
        alignItems: "center", 
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        gap: 2
      }}
    >
      {/* Left: Fixed Index Display */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pr: 2, borderRight: { lg: '1px solid' }, borderColor: 'divider', minWidth: 'fit-content' }}>
        <StorageIcon color="action" sx={{ fontSize: 18 }} />
        <Chip 
          label="logs-sentinel_one.threats" 
          size="small" 
          variant="outlined" 
          sx={{ fontWeight: 'bold', height: 24, fontSize: '0.75rem', bgcolor: 'action.hover' }} 
        />
      </Box>

      {/* Center: Filters & Search */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: 'wrap', flexGrow: 1 }}>
        {/* From Section */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>From:</Typography>
          <TextField
            size="small"
            value={tempFromValue}
            onChange={(e) => setTempFromValue(e.target.value)}
            onBlur={handleTimeUpdate}
            onKeyDown={(e) => e.key === 'Enter' && handleTimeUpdate()}
            sx={{ width: 50, "& .MuiInputBase-input": { p: '6px', fontSize: '0.8rem' } }}
          />
          <FormControl size="small" sx={{ minWidth: 70 }}>
            <Select
              value={fromUnit}
              onChange={(e) => onTimeChange(fromValue, e.target.value, toValue, toUnit)}
              sx={{ fontSize: '0.8rem', height: 32 }}
            >
              <MenuItem value="m">min</MenuItem>
              <MenuItem value="h">hour</MenuItem>
              <MenuItem value="d">day</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* To Section */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>To:</Typography>
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <Select
              value={toValue === null ? "now" : "custom"}
              onChange={(e) => {
                if (e.target.value === "now") {
                  onTimeChange(fromValue, fromUnit, null, toUnit);
                  setTempToValue("");
                } else {
                  setTempToValue("0");
                  onTimeChange(fromValue, fromUnit, 0, toUnit);
                }
              }}
              sx={{ fontSize: '0.8rem', height: 32 }}
            >
              <MenuItem value="now">Now</MenuItem>
              <MenuItem value="custom">Offset</MenuItem>
            </Select>
          </FormControl>
          
          {toValue !== null && (
            <>
              <TextField
                size="small"
                value={tempToValue}
                onChange={(e) => setTempToValue(e.target.value)}
                onBlur={handleTimeUpdate}
                onKeyDown={(e) => e.key === 'Enter' && handleTimeUpdate()}
                sx={{ width: 50, "& .MuiInputBase-input": { p: '6px', fontSize: '0.8rem' } }}
              />
              <FormControl size="small" sx={{ minWidth: 70 }}>
                <Select
                  value={toUnit}
                  onChange={(e) => onTimeChange(fromValue, fromUnit, toValue, e.target.value)}
                  sx={{ fontSize: '0.8rem', height: 32 }}
                >
                  <MenuItem value="m">min</MenuItem>
                  <MenuItem value="h">hour</MenuItem>
                  <MenuItem value="d">day</MenuItem>
                </Select>
              </FormControl>
            </>
          )}
        </Box>

        {/* Search Query Input */}
        <Box component="form" onSubmit={handleSearchSubmit} sx={{ minWidth: 200, flexGrow: 1, maxWidth: 600 }}>
          <TextField
            fullWidth
            size="small"
            placeholder={t('searchPlaceholder')}
            value={tempQuery}
            onChange={(e) => setTempQuery(e.target.value)}
            sx={{ "& .MuiInputBase-input": { py: '6px', fontSize: '0.85rem' } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18 }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton type="submit" size="small" sx={{ p: 0.5 }}>
                    <SearchIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </Box>
      </Box>

      {/* Right: Actions */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: 'auto' }}>
        {lastUpdated && (
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', fontSize: '0.7rem' }}>
            {lastUpdated}
          </Typography>
        )}
        <IconButton onClick={onRefresh} size="small">
          <RefreshIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>
    </Paper>
  );
};

export default ControlBar;