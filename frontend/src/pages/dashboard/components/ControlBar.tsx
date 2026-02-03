import React, { useState } from "react";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Tooltip from "@mui/material/Tooltip";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";

interface ControlBarProps {
  indices: string[];
  selectedIndex: string;
  onIndexChange: (index: string) => void;
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onRefresh: () => void;
  lastUpdated?: string;
}

const ControlBar: React.FC<ControlBarProps> = ({ 
  indices,
  selectedIndex,
  onIndexChange,
  timeRange, 
  onTimeRangeChange,
  searchQuery,
  onSearchQueryChange,
  onRefresh,
  lastUpdated 
}) => {
  const [tempQuery, setTempQuery] = useState(searchQuery);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchQueryChange(tempQuery);
  };

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 1.5, 
        mb: 2, 
        display: "flex", 
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'stretch', md: 'center' }, 
        justifyContent: "space-between",
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        gap: 2
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ fontWeight: "bold", mr: 1, display: { xs: 'none', lg: 'block' } }}>
          Dashboard
        </Typography>
        
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Index Pattern</InputLabel>
          <Select
            value={selectedIndex}
            label="Index Pattern"
            onChange={(e) => onIndexChange(e.target.value)}
          >
            <MenuItem value=""><em>All Indices</em></MenuItem>
            {indices.map((idx) => (
              <MenuItem key={idx} value={idx}>{idx}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Range</InputLabel>
          <Select
            value={timeRange}
            label="Range"
            onChange={(e) => onTimeRangeChange(e.target.value)}
          >
            <MenuItem value="15m">15m</MenuItem>
            <MenuItem value="1h">1h</MenuItem>
            <MenuItem value="24h">24h</MenuItem>
            <MenuItem value="48h">48h</MenuItem>
          </Select>
        </FormControl>

        {/* Search Query Input */}
        <Box component="form" onSubmit={handleSearchSubmit} sx={{ minWidth: { md: 300, lg: 450 }, display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search logs (e.g. endpoint.os:windows)"
            value={tempQuery}
            onChange={(e) => setTempQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton 
                    type="submit" 
                    size="small" 
                    sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' }, borderRadius: 1 }}
                  >
                    <SearchIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </Box>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: 'flex-end', gap: 1 }}>
        {lastUpdated && (
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            Last updated: {lastUpdated}
          </Typography>
        )}
        <Tooltip title="Refresh">
          <IconButton onClick={onRefresh} size="small">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Paper>
  );
};

export default ControlBar;
