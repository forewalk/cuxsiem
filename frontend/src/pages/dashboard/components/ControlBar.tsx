import React, { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Popover from "@mui/material/Popover";
import Divider from "@mui/material/Divider";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import StorageIcon from "@mui/icons-material/Storage";
import SearchIcon from "@mui/icons-material/Search";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import dayjs from "dayjs";

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
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);
  const [popoverType, setPopoverType] = useState<'quick' | 'detailed'>('quick');
  const [editingPoint, setEditingPoint] = useState<'from' | 'to'>('from');
  const [tabValue, setTabValue] = useState(1);

  // 팝오버 내부 임시 상태
  const [popoverVal, setPopoverVal] = useState(fromValue);
  const [popoverUnit, setPopoverUnit] = useState(fromUnit);

  useEffect(() => {
    setTempQuery(searchQuery);
  }, [searchQuery]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSearchQueryChange(tempQuery);
  };

  const handleQuickClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    setPopoverType('quick');
    setAnchorEl(event.currentTarget.parentElement as HTMLDivElement);
  };

  const handleFromClick = (event: React.MouseEvent<HTMLDivElement>) => {
    setPopoverType('detailed');
    setEditingPoint('from');
    setPopoverVal(fromValue);
    setPopoverUnit(fromUnit);
    setTabValue(1); // Default to Relative
    setAnchorEl(event.currentTarget.parentElement as HTMLDivElement);
  };

  const handleToClick = (event: React.MouseEvent<HTMLDivElement>) => {
    setPopoverType('detailed');
    setEditingPoint('to');
    setPopoverVal(toValue ?? 0);
    setPopoverUnit(toUnit);
    setTabValue(toValue === null ? 2 : 1); // If null, go to 'Now' tab
    setAnchorEl(event.currentTarget.parentElement as HTMLDivElement);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleApplyTime = () => {
    if (editingPoint === 'from') {
      onTimeChange(popoverVal, popoverUnit, toValue, toUnit);
    } else {
      onTimeChange(fromValue, fromUnit, tabValue === 2 ? null : popoverVal, popoverUnit);
    }
    handleClose();
  };

  const handleCommonClick = (val: number, unit: string) => {
    onTimeChange(val, unit, null, "m");
    handleClose();
  };

  const KIBANA_TEAL = "#005a5e";
  const BORDER_COLOR = "#d3dae6";
  const open = Boolean(anchorEl);

  const unitMap: Record<string, string> = { 'm': 'minutes', 'h': 'hours', 'd': 'days' };

  const CommonRange = ({ label, val, unit }: { label: string, val: number, unit: string }) => (
    <Typography 
      variant="body2" 
      onClick={() => handleCommonClick(val, unit)}
      sx={{ color: KIBANA_TEAL, fontWeight: 'bold', cursor: 'pointer', '&:hover': { textDecoration: 'underline' }, py: 0.5 }}
    >
      {label}
    </Typography>
  );

  return (
    <Box sx={{ display: "flex", alignItems: "stretch", gap: 1, mb: 3, width: '100%' }}>
      
      {/* 1. Index Info */}
      <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#f5f7fa', border: `1px solid ${BORDER_COLOR}`, borderRadius: 1, px: 1.5, gap: 1, minWidth: 'fit-content' }}>
        <StorageIcon sx={{ color: KIBANA_TEAL, fontSize: 18 }} />
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold', display: 'block', lineHeight: 1, mb: 0.2 }}>{t('indexTitle')}</Typography>
          <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#1a1c21', fontSize: '0.8rem' }}>logs-sentinel_one.threats</Typography>
        </Box>
      </Box>

      {/* 2. Search Section */}
      <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#f5f7fa', border: `1px solid ${BORDER_COLOR}`, borderRadius: 1, flexGrow: 1, overflow: 'hidden' }}>
        <Box sx={{ px: 1.5, display: 'flex', alignItems: 'center', height: '100%' }}><SearchIcon sx={{ color: KIBANA_TEAL, fontSize: 20 }} /></Box>
        <Box component="form" onSubmit={handleSearchSubmit} sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
          <TextField fullWidth size="small" placeholder="Search" value={tempQuery} onChange={(e) => setTempQuery(e.target.value)} sx={{ "& .MuiOutlinedInput-notchedOutline": { border: 'none' }, "& .MuiInputBase-input": { py: 1, px: 1, fontSize: '0.9rem' } }} />
        </Box>
      </Box>

      {/* 3. Splitted Time Picker Section */}
      <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#f5f7fa', border: `1px solid ${open ? KIBANA_TEAL : BORDER_COLOR}`, borderRadius: 1, minWidth: 320, overflow: 'hidden' }}>
        <Box onClick={handleQuickClick} sx={{ px: 1, borderRight: `1px solid ${BORDER_COLOR}`, display: 'flex', alignItems: 'center', height: '100%', gap: 0.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
          <CalendarMonthIcon sx={{ color: KIBANA_TEAL, fontSize: 20 }} />
          <KeyboardArrowDownIcon sx={{ color: KIBANA_TEAL, fontSize: 18 }} />
        </Box>

        {/* Start Point Clickable */}
        <Box onClick={handleFromClick} sx={{ px: 1.5, height: '100%', display: 'flex', alignItems: 'center', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, borderBottom: `2px solid ${open && popoverType === 'detailed' && editingPoint === 'from' ? KIBANA_TEAL : 'transparent'}` }}>
          <Typography sx={{ fontSize: '0.9rem', color: '#1a1c21' }}>{`~ ${fromValue} ${unitMap[fromUnit]} ago`}</Typography>
        </Box>

        <ArrowForwardIcon sx={{ fontSize: 14, color: 'text.disabled' }} />

        {/* End Point Clickable */}
        <Box onClick={handleToClick} sx={{ px: 1.5, height: '100%', display: 'flex', alignItems: 'center', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, borderBottom: `2px solid ${open && popoverType === 'detailed' && editingPoint === 'to' ? KIBANA_TEAL : 'transparent'}` }}>
          <Typography sx={{ fontSize: '0.9rem', color: '#1a1c21' }}>{toValue === null ? "now" : `~ ${toValue} ${unitMap[toUnit]} ago`}</Typography>
        </Box>
      </Box>

      <Button variant="outlined" startIcon={<RefreshIcon sx={{ fontSize: 20 }} />} onClick={onRefresh} sx={{ borderColor: BORDER_COLOR, color: KIBANA_TEAL, textTransform: 'none', fontWeight: 'bold', px: 2, bgcolor: '#fff', '&:hover': { borderColor: KIBANA_TEAL, bgcolor: 'action.hover' } }}>Refresh</Button>

      <Popover open={open} anchorEl={anchorEl} onClose={handleClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} transformOrigin={{ vertical: 'top', horizontal: 'left' }} PaperProps={{ sx: { width: popoverType === 'quick' ? 450 : 480, mt: 1, borderRadius: 1, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', overflow: 'hidden' } }}>
        {popoverType === 'quick' ? (
          <Box sx={{ p: 2 }}>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Quick select</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}><ChevronLeftIcon sx={{ fontSize: 20, color: 'text.secondary' }} /><ChevronRightIcon sx={{ fontSize: 20, color: 'text.secondary' }} /></Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <FormControl size="small" sx={{ width: 100 }}><Select value="Last" sx={{ height: 32, fontSize: '0.85rem', bgcolor: '#f5f7fa' }}><MenuItem value="Last">Last</MenuItem></Select></FormControl>
                <TextField size="small" type="number" value={popoverVal} onChange={(e) => setPopoverVal(Number(e.target.value))} sx={{ width: 80, "& .MuiInputBase-input": { height: 16, fontSize: '0.85rem', bgcolor: '#f5f7fa' } }} />
                <FormControl size="small" sx={{ flexGrow: 1 }}><Select value={popoverUnit} onChange={(e) => setPopoverUnit(e.target.value)} sx={{ height: 32, fontSize: '0.85rem', bgcolor: '#f5f7fa' }}><MenuItem value="m">minutes</MenuItem><MenuItem value="h">hours</MenuItem><MenuItem value="d">days</MenuItem></Select></FormControl>
                <Button variant="outlined" size="small" onClick={handleApplyTime} sx={{ borderColor: KIBANA_TEAL, color: KIBANA_TEAL, height: 32, fontWeight: 'bold', textTransform: 'none' }}>Apply</Button>
              </Box>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', display: 'block', mb: 1 }}>Commonly used</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                <CommonRange label="Today" val={1} unit="d" /><CommonRange label="Last 24 hours" val={24} unit="h" />
                <CommonRange label="This week" val={7} unit="d" /><CommonRange label="Last 7 days" val={7} unit="d" />
                <CommonRange label="Last 15 minutes" val={15} unit="m" /><CommonRange label="Last 30 days" val={30} unit="d" />
              </Box>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', display: 'block', mb: 1 }}>Refresh every</Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField size="small" defaultValue="0" sx={{ width: 80, "& .MuiInputBase-input": { height: 16, fontSize: '0.85rem', bgcolor: '#f5f7fa' } }} />
                <FormControl size="small" sx={{ flexGrow: 1 }}><Select defaultValue="seconds" sx={{ height: 32, fontSize: '0.85rem', bgcolor: '#f5f7fa' }}><MenuItem value="seconds">seconds</MenuItem></Select></FormControl>
                <Button variant="outlined" size="small" startIcon={<PlayArrowIcon />} sx={{ borderColor: BORDER_COLOR, color: 'text.secondary', height: 32, textTransform: 'none' }}>Start</Button>
              </Box>
            </Box>
          </Box>
        ) : (
          <Box>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#f5f7fa', p: 1, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', color: KIBANA_TEAL }}>{editingPoint === 'from' ? 'SET START POINT' : 'SET END POINT'}</Typography>
            </Box>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="fullWidth" sx={{ "& .MuiTab-root": { textTransform: 'none', fontWeight: 'bold', minHeight: 48 }, "& .MuiTabs-indicator": { backgroundColor: KIBANA_TEAL, height: 3 } }}>
                <Tab label="Absolute" /><Tab label="Relative" /><Tab label="Now" />
              </Tabs>
            </Box>
            <Box sx={{ p: 2 }}>
              {tabValue === 0 && <Typography variant="body2" sx={{ textAlign: 'center', py: 4, color: 'text.disabled' }}>Calendar interface would be here</Typography>}
              {tabValue === 1 && (
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField size="small" type="number" value={popoverVal} onChange={(e) => setPopoverVal(Number(e.target.value))} sx={{ width: 150, "& .MuiInputBase-root": { bgcolor: '#f5f7fa' } }} />
                  <FormControl size="small" sx={{ flexGrow: 1 }}>
                    <Select value={popoverUnit} onChange={(e) => setPopoverUnit(e.target.value)} sx={{ bgcolor: '#f5f7fa' }}>
                      <MenuItem value="m">Minutes ago</MenuItem><MenuItem value="h">Hours ago</MenuItem><MenuItem value="d">Days ago</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              )}
              {tabValue === 2 && (
                <Box sx={{ py: 2, textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>Setting this to "now" will always use the current time.</Typography>
                  <Button fullWidth variant="outlined" onClick={() => { setTabValue(2); handleApplyTime(); }} sx={{ borderColor: KIBANA_TEAL, color: KIBANA_TEAL, textTransform: 'none', fontWeight: 'bold' }}>Set to now</Button>
                </Box>
              )}
            </Box>
            {tabValue !== 2 && (
              <Box sx={{ p: 1.5, bgcolor: '#f5f7fa', display: 'flex', justifyContent: 'flex-end' }}>
                <Button size="small" variant="contained" onClick={handleApplyTime} sx={{ bgcolor: KIBANA_TEAL, fontWeight: 'bold', textTransform: 'none' }}>Apply</Button>
              </Box>
            )}
          </Box>
        )}
      </Popover>
    </Box>
  );
};

export default ControlBar;