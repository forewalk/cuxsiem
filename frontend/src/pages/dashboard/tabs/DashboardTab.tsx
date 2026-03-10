import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { 
  Box, Paper, Typography, LinearProgress, Divider, 
  IconButton, TextField, useTheme,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Menu, MenuItem, ListItemIcon, ListItemText, Stack,
  Autocomplete, ToggleButton, ToggleButtonGroup
} from "@mui/material";
import ControlBar from "../components/ControlBar";
import CategoryBarChartWidget from "../components/CategoryBarChartWidget";
import PieChartWidget from "../components/PieChartWidget";
import { getDashboardStats, resetDashboard, saveDashboardLayout, getIndexFields } from "../../../services/dashboardService";
import type { DashboardStatsResponse, DashboardPanel } from "../../../services/dashboardService";
import { useLanguageStore } from "../../../stores/useLanguageStore";
import { useAuth } from "../../../hooks/useAuth";
import { useSettingsStore } from "../../../stores/useSettingsStore";
import useThreatStore from "../../../stores/useThreatStore";
import dayjs from "dayjs";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import NorthWestIcon from '@mui/icons-material/NorthWest';
import SettingsIcon from '@mui/icons-material/Settings';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import BarChartIcon from '@mui/icons-material/BarChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import TouchedIcon from '@mui/icons-material/AdsClick';
import { useSearchParams, useNavigate } from 'react-router-dom';

// i18n
import koMessages from "../../../locales/ko.json";
import enMessages from "../../../locales/en.json";
import jaMessages from "../../../locales/ja.json";
import cnMessages from "../../../locales/cn.json";

const translations: Record<string, Record<string, string>> = { ko: koMessages, en: enMessages, ja: jaMessages, cn: cnMessages };

// --- Panel Settings Modal (Type + Query + Field) ---
const PanelSettingsModal: React.FC<{
  open: boolean; onClose: () => void; panel: DashboardPanel | null;
  onSave: (key: string, type: string, query: string, field?: string) => void;
  onCancel: () => void;
  t: (k: string) => string;
}> = ({ open, onClose, panel, onSave, onCancel, t }) => {
  const [type, setType] = useState("metric");
  const [query, setQuery] = useState("");
  const [field, setField] = useState("");
  const [availableFields, setAvailableFields] = useState<string[]>([]);

  useEffect(() => {
    if (open && panel) {
      setType(panel.widget_type || "metric");
      // 현재 패널에 적용된 쿼리를 표시 (사용자가 수정한게 있으면 그것을, 없으면 시스템 기본값을 보여줌)
      const currentQuery = panel.custom_query !== null ? panel.custom_query : (panel.default_query || "*");
      setQuery(currentQuery);
      setField(panel.target_field || "");
      const fetchFields = async () => {
        try {
          const fields = await getIndexFields("logs-sentinel_one.threats");
          setAvailableFields(fields.map(f => f.name));
        } catch (e) { console.error(e); }
      };
      fetchFields();
    }
  }, [open, panel]);

  const handleApply = () => {
    if (panel) onSave(panel.panel_key, type, query, field);
    onClose();
  };

  if (!panel) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 'bold' }}>{t('panelSettings')}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontWeight: 'bold' }}>{t('selectWidgetType')}</Typography>
            <ToggleButtonGroup value={type} exclusive onChange={(_, next) => next && setType(next)} fullWidth size="small">
              <ToggleButton value="metric" sx={{ py: 1, gap: 1 }}><TouchedIcon fontSize="small" /> {t('metric')}</ToggleButton>
              <ToggleButton value="bar" sx={{ py: 1, gap: 1 }}><BarChartIcon fontSize="small" /> {t('barChart')}</ToggleButton>
              <ToggleButton value="pie" sx={{ py: 1, gap: 1 }}><PieChartIcon fontSize="small" /> {t('pieChart')}</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontWeight: 'bold' }}>조회 쿼리 (OpenSearch DSL or String)</Typography>
            <TextField fullWidth multiline rows={3} value={query} onChange={(e) => setQuery(e.target.value)} variant="outlined" placeholder="*" sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.85rem' } }} />
          </Box>
          {type !== "metric" && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontWeight: 'bold' }}>{t('targetField')}</Typography>
              <Autocomplete freeSolo options={availableFields} value={field} onInputChange={(_, newValue) => setField(newValue)} renderInput={(params) => (
                <TextField {...params} variant="outlined" placeholder="e.g. threatInfo.severity" />
              )} />
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={() => { onCancel(); onClose(); }} color="inherit">{t('cancel')}</Button>
        <Button onClick={handleApply} variant="contained" color="primary">{t('apply')}</Button>
      </DialogActions>
    </Dialog>
  );
};

// --- Add Panel Dialog ---
const AddPanelDialog: React.FC<{
  open: boolean; onClose: () => void; onAdd: (data: { type: string, title: string, query: string, field?: string }) => void; t: (k: string) => string;
}> = ({ open, onClose, onAdd, t }) => {
  const [step, setStep] = useState(1); const [type, setType] = useState("metric"); const [title, setTitle] = useState(""); const [query, setQuery] = useState(""); const [field, setField] = useState("threatInfo.threatName");
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  useEffect(() => { 
    if (open) { 
      setStep(1); setType("metric"); setTitle(""); setQuery(""); setField("threatInfo.threatName"); 
      const fetchFields = async () => {
        try {
          const fields = await getIndexFields("logs-sentinel_one.threats");
          setAvailableFields(fields.map(f => f.name));
        } catch (e) { console.error(e); }
      };
      fetchFields();
    } 
  }, [open]);
  const handleNext = () => setStep(2); const handleBack = () => setStep(1); const handleAdd = () => { onAdd({ type, title, query, field }); onClose(); };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 'bold' }}>{step === 1 ? t('selectWidgetType') : t('addPanel')}</DialogTitle>
      <DialogContent>
        {step === 1 ? (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Paper variant="outlined" onClick={() => { setType("metric"); handleNext(); }} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main' } }}><TouchedIcon color="primary" /><Box><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{t('metric')}</Typography><Typography variant="caption" color="text.secondary">단일 숫자 지표</Typography></Box></Paper>
            <Paper variant="outlined" onClick={() => { setType("bar"); handleNext(); }} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main' } }}><BarChartIcon color="primary" /><Box><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{t('barChart')}</Typography><Typography variant="caption" color="text.secondary">막대 그래프</Typography></Box></Paper>
            <Paper variant="outlined" onClick={() => { setType("pie"); handleNext(); }} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main' } }}><PieChartIcon color="primary" /><Box><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{t('pieChart')}</Typography><Typography variant="caption" color="text.secondary">원형 그래프</Typography></Box></Paper>
          </Stack>
        ) : (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField fullWidth label={t('panelTitle')} value={title} onChange={(e) => setTitle(e.target.value)} variant="outlined" autoFocus />
            <TextField fullWidth label="Query" multiline rows={2} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="*" variant="outlined" />
            {type !== "metric" && (
              <Autocomplete freeSolo options={availableFields} value={field} onInputChange={(_, newValue) => setField(newValue)} renderInput={(params) => (
                <TextField {...params} label={t('targetField')} variant="outlined" placeholder="e.g. threatInfo.severity" />
              )} />
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">{t('cancel')}</Button>
        {step === 2 && <Button onClick={handleBack} color="inherit">이전</Button>}
        {step === 2 && <Button onClick={handleAdd} variant="contained" color="primary" disabled={!title}>{t('addPanel')}</Button>}
      </DialogActions>
    </Dialog>
  );
};

// --- Editable Title Component ---
const EditableTitle: React.FC<{ 
  panelKey: string; initialTitle: string; onSave: (key: string, newTitle: string) => void;
  variant?: "h6" | "subtitle2" | "caption"; isEditing: boolean; setIsEditing: (val: boolean) => void;
}> = ({ panelKey, initialTitle, onSave, variant = "subtitle2", isEditing, setIsEditing }) => {
  const [title, setTitle] = useState(initialTitle);
  useEffect(() => { setTitle(initialTitle); }, [initialTitle]);
  const handleSave = () => { if (title !== initialTitle) onSave(panelKey, title); setIsEditing(false); };
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setTitle(initialTitle); setIsEditing(false); } };
  if (isEditing) return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%', maxWidth: 350, position: 'relative', zIndex: 30 }}>
      <TextField size="small" fullWidth value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={handleKeyDown} autoFocus variant="outlined" sx={{ '& .MuiOutlinedInput-root': { height: 28, fontSize: '0.8rem', bgcolor: 'background.paper' } }} />
      <Box sx={{ display: 'flex' }}><IconButton size="small" onClick={handleSave} color="primary"><CheckIcon sx={{ fontSize: 18 }} /></IconButton><IconButton size="small" onClick={() => { setTitle(initialTitle); setIsEditing(false); }}><CloseIcon sx={{ fontSize: 18 }} /></IconButton></Box>
    </Box>
  );
  return <Typography variant={variant} sx={{ fontWeight: 'bold' }}>{title}</Typography>;
};

// --- Draggable Wrapper ---
const DraggablePanel: React.FC<{
  panel: DashboardPanel;
  onDragStart: (key: string) => void; onDragEnd: () => void; onDragOver: (key: string) => void; onDrop: () => void;
  onResizeEnd: (key: string, newWidth: number, newHeight: number) => void;
  onSettingsEdit: (key: string) => void; onTitleEdit: (key: string) => void; onClone: (key: string) => void; onDelete: (key: string) => void;
  isDragging: boolean; isOver: boolean; isEditMode: boolean; t: (k: string) => string; children: React.ReactNode;
}> = ({ panel, onDragStart, onDragEnd, onDragOver, onDrop, onResizeEnd, onSettingsEdit, onTitleEdit, onClone, onDelete, isDragging, isOver, isEditMode, t, children }) => {
  const theme = useTheme();
  const [resizing, setResizing] = useState(false);
  const [visualWidth, setVisualWidth] = useState<number | string>(0);
  const [visualHeight, setVisualHeight] = useState<number | string>(panel.grid_height || 300);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const startWidth = useRef(0);
  const startHeight = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);

  const getSnapRatio = (widthPx: number, totalW: number) => {
    const ratios = [1, 2, 3, 4, 5, 6, 7, 8]; const targetRatio = widthPx / totalW;
    let bestRatio = 8; let minDiff = Infinity;
    ratios.forEach(r => { const diff = Math.abs((1 / r) - targetRatio); if (diff < minDiff) { minDiff = diff; bestRatio = r; } });
    return bestRatio;
  };

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizingRef.current) return;
    const deltaX = e.clientX - startX.current; const deltaY = e.clientY - startY.current;
    setVisualWidth(Math.max(100, startWidth.current + deltaX)); setVisualHeight(Math.max(100, Math.round((startHeight.current + deltaY) / 20) * 20));
  }, []);

  const onMouseUp = useCallback(async (e: MouseEvent) => {
    if (!isResizingRef.current) return;
    const deltaX = e.clientX - startX.current; const deltaY = e.clientY - startY.current;
    isResizingRef.current = false; setResizing(false);
    const gridContainer = document.getElementById("threat-dashboard-grid-container");
    let finalRatio = panel.grid_width; const finalHeight = Math.max(100, Math.round((startHeight.current + deltaY) / 20) * 20);
    if (gridContainer) { finalRatio = getSnapRatio(startWidth.current + deltaX, gridContainer.getBoundingClientRect().width); }
    setVisualWidth(0); setVisualHeight('auto'); 
    document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp);
    onResizeEnd(panel.panel_key, finalRatio, finalHeight);
  }, [panel.panel_key, panel.grid_width, onMouseMove, onResizeEnd]);

  const onMouseDownLocal = (e: React.MouseEvent) => {
    if (!isEditMode) return; e.preventDefault(); e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return; startX.current = e.clientX; startY.current = e.clientY; startWidth.current = rect.width; startHeight.current = rect.height;
    setVisualWidth(rect.width); setVisualHeight(rect.height); isResizingRef.current = true; setResizing(true);
    document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp);
  };

  const currentWidthStyle = useMemo(() => { if (resizing) return visualWidth; const denom = panel.grid_width || 4; return `calc(${100 / denom}% - ${16 * (denom - 1) / denom}px)`; }, [resizing, visualWidth, panel.grid_width]);

  return (
    <Box sx={{ position: 'relative', width: currentWidthStyle, height: resizing ? visualHeight : (panel.grid_height || 'auto'), maxWidth: '100%' }}>
      {resizing && <Box sx={{ width: visualWidth, height: visualHeight, bgcolor: 'action.hover', borderRadius: 1.5, border: '1px dashed', borderColor: 'divider', position: 'absolute', top: 0, left: 0, zIndex: 0, maxWidth: '100%' }} />}
      <Box ref={containerRef} draggable={isEditMode && !resizing} onDragStart={(e) => { if (isResizingRef.current || !isEditMode) { e.preventDefault(); return; } setTimeout(() => onDragStart(panel.panel_key), 0); }} onDragEnd={onDragEnd} onDragOver={(e) => { e.preventDefault(); onDragOver(panel.panel_key); }} onDrop={(e) => { e.preventDefault(); onDrop(); }}
        sx={{ opacity: isDragging ? 0.3 : 1, transition: resizing ? 'none' : 'all 0.3s ease', cursor: isEditMode ? (isResizingRef.current ? 'nwse-resize' : 'grab') : 'default', position: resizing ? 'absolute' : 'relative', top: 0, left: 0, height: '100%', width: '100%', borderRadius: 1.5, zIndex: isDragging || resizing ? 1000 : 1, outline: (isOver && !isDragging) || (resizing) ? `2px dashed ${theme.palette.primary.main}` : 'none', outlineOffset: (isOver || resizing) ? '4px' : '0px', bgcolor: resizing ? theme.palette.background.paper : 'transparent' }}>
        {isEditMode && <Box className="drag-handle-area" sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 40, cursor: 'grab', zIndex: 5, '&:active': { cursor: 'grabbing' } }} />}
        {isEditMode && (
          <Box className="no-print" sx={{ position: 'absolute', top: 4, right: 4, zIndex: 20 }}>
            <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ p: 0.5, color: 'text.disabled', '&:hover': { color: 'primary.main', bgcolor: 'action.hover' } }}><SettingsIcon fontSize="small" /></IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
              <MenuItem onClick={() => { onTitleEdit(panel.panel_key); setAnchorEl(null); }}><ListItemIcon><EditIcon fontSize="small" /></ListItemIcon><ListItemText primary={t('editTitle')} /></MenuItem>
              <MenuItem onClick={() => { onSettingsEdit(panel.panel_key); setAnchorEl(null); }}><ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon><ListItemText primary={t('panelSettings')} /></MenuItem>
              <MenuItem onClick={() => { onClone(panel.panel_key); setAnchorEl(null); }}><ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon><ListItemText primary={t('clonePanel')} /></MenuItem>
              <Divider />
              <MenuItem onClick={() => { onDelete(panel.panel_key); setAnchorEl(null); }} sx={{ color: 'error.main' }}><ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon><ListItemText primary={t('deletePanel')} /></MenuItem>
            </Menu>
          </Box>
        )}
        {isEditMode && <Box className="no-print" onMouseDown={onMouseDownLocal} sx={{ position: 'absolute', right: 8, bottom: 8, width: 32, height: 32, cursor: 'nwse-resize', zIndex: 30, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', color: 'primary.main', p: 0.5, '&:hover': { opacity: 1 } }}><NorthWestIcon sx={{ fontSize: 16, transform: 'rotate(180deg)' }} /></Box>}
        <Box sx={{ pointerEvents: isDragging || resizing ? 'none' : 'auto', height: '100%' }}>{children}</Box>
      </Box>
    </Box>
  );
};

const DashboardTab: React.FC = () => {
  const { language } = useLanguageStore();
  const { user } = useAuth();
  const { settings, fetchSettings } = useSettingsStore();

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // 전역 스토어 사용
  const { searchQuery, timeRange, setSearchQuery, setTimeRange } = useThreatStore();
  
  const [data, setData] = useState<DashboardStatsResponse | null>(null);
  const [originalPanels, setOriginalPanels] = useState<DashboardPanel[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [settingsEditPanelKey, setSettingsEditPanelKey] = useState<string | null>(null);
  const [editingTitleKey, setEditingTitleKey] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [modalSnapshot, setModalSnapshot] = useState<DashboardPanel[] | null>(null);
  const lastMoveRef = useRef<{ dragged: string, target: string } | null>(null);
  const initializedRef = useRef(false);

  // URL 쿼리 파라미터에서 초기 상태 로드 및 스토어 동기화
  useEffect(() => {
    // 이 탭과 관련된 파라미터가 있는지 확인
    const hasTimeParams = searchParams.has('fromValue') || searchParams.has('fromDate');
    const hasQueryParam = searchParams.has('query');
    
    // 만약 다른 탭의 파라미터(예: threatFromValue)만 있고 현재 탭 파라미터가 없으면 무시
    if (!hasTimeParams && !hasQueryParam) {
      const hasOtherTabParams = searchParams.has('threatFromValue') || searchParams.has('threatFromDate') || searchParams.has('edrQuery');
      if (hasOtherTabParams) return;
    }

    const query = searchParams.get('query') || "";
    const fromVal = searchParams.get('fromValue');
    const fromUn = searchParams.get('fromUnit');
    const toVal = searchParams.get('toValue');
    const toUn = searchParams.get('toUnit');
    const fromDt = searchParams.get('fromDate');
    const toDt = searchParams.get('toDate');

    const currentStore = useThreatStore.getState();
    
    // 쿼리 업데이트
    if (hasQueryParam && currentStore.searchQuery !== query) {
      setSearchQuery(query);
    }

    // 시간 범위 업데이트
    if (hasTimeParams) {
      const newTimeRange = {
        fromValue: fromVal ? parseInt(fromVal, 10) : null,
        fromUnit: fromUn || 'm',
        toValue: toVal ? parseInt(toVal, 10) : null,
        toUnit: toUn || 'm',
        fromDate: fromDt || null,
        toDate: toDt || null,
      };

      if (JSON.stringify(currentStore.timeRange) !== JSON.stringify(newTimeRange)) {
        setTimeRange(newTimeRange);
      }
    }
  }, [searchParams, setSearchQuery, setTimeRange]);

  // 고급 설정 로드 (초기 1회)
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // 초기 설정값 적용 (스토어 업데이트)
  useEffect(() => {
    // URL 파라미터가 없는 경우에만 settings.time_filter_duration으로 초기화
    if (settings && !initializedRef.current && !searchParams.get('fromValue') && !searchParams.get('fromDate')) {
      setTimeRange({
        fromValue: settings.time_filter_duration ?? 15,
        fromUnit: settings.time_filter_unit ?? 'm',
        toValue: null,
        toUnit: 'm',
        fromDate: null,
        toDate: null
      });
      initializedRef.current = true;
    }
  }, [settings, setTimeRange, searchParams]);

  const { fromValue, fromUnit, toValue, toUnit, fromDate, toDate } = timeRange;

  const t = useMemo(() => (key: string): string => (translations[language] || translations["ko"] || {})[key] || key, [language]);

  const fetchData = useCallback(async (currentPanels?: DashboardPanel[]) => {
    try { 
      setLoading(true); 
      const stats = await getDashboardStats("threat-status", fromValue !== null ? fromValue : undefined, fromUnit, toValue !== null ? toValue : undefined, toUnit, fromDate ?? undefined, toDate ?? undefined, searchQuery || undefined, currentPanels); 
      if (stats && stats.summary) { setData(stats); }
    } catch (err) { console.error("Error fetching dashboard data:", err); }
    finally { setLoading(false); }
  }, [fromValue, fromUnit, toValue, toUnit, fromDate, toDate, searchQuery]);

  useEffect(() => { 
    if (!isEditMode) fetchData(); 
  }, [fetchData, isEditMode]);

  const handleTimeChange = useCallback((fv: number | null, fu: string, tv: number | null, tu: string, fd: string | null, td: string | null) => {
    // URLSearchParams 업데이트 (navigate 사용)
    const newParams = new URLSearchParams(searchParams);
    if (fv !== null) newParams.set('fromValue', fv.toString()); else newParams.delete('fromValue');
    if (fu) newParams.set('fromUnit', fu); else newParams.delete('fromUnit');
    if (tv !== null) newParams.set('toValue', tv.toString()); else newParams.delete('toValue');
    if (tu) newParams.set('toUnit', tu); else newParams.delete('toUnit');
    if (fd) newParams.set('fromDate', fd); else newParams.delete('fromDate');
    if (td) newParams.set('toDate', td); else newParams.delete('toDate');
    navigate(`?${newParams.toString()}`, { replace: false });
  }, [searchParams, navigate]);

  const handleSearchQueryChange = useCallback((q: string) => {
    // URLSearchParams 업데이트 (navigate 사용)
    const newParams = new URLSearchParams(searchParams);
    if (q) newParams.set('query', q);
    else newParams.delete('query');
    navigate(`?${newParams.toString()}`, { replace: false });
  }, [searchParams, navigate]);

  const handleEditToggle = () => { if (!isEditMode) setOriginalPanels(data?.panels ? JSON.parse(JSON.stringify(data.panels)) : null); setIsEditMode(!isEditMode); };
  const handleCancel = () => { if (originalPanels && data) setData({ ...data, panels: JSON.parse(JSON.stringify(originalPanels)) }); setEditingTitleKey(null); setIsEditMode(false); };
  const handleSave = async () => { if (!data) return; setLoading(true); try { await saveDashboardLayout("threat-status", data.panels); setOriginalPanels(JSON.parse(JSON.stringify(data.panels))); setEditingTitleKey(null); setIsEditMode(false); fetchData(); } finally { setLoading(false); } };

  const handleAddPanel = async (newP: { type: string, title: string, query: string, field?: string }) => {
    if (!data) return;
    const panelKey = `custom_${newP.type}_${Date.now()}`;
    const newPanel: DashboardPanel = {
      dashboard_id: "threat-status", panel_key: panelKey, custom_titles: { [language]: newP.title }, default_title_key: "", grid_width: newP.type === "metric" ? 4 : 2, grid_height: newP.type === "metric" ? 120 : 380, custom_query: newP.query, default_query: "*", widget_type: newP.type, target_field: newP.field, is_visible: true, display_order: (data?.panels?.length || 0) + 1, current_value: 0, chart_data: []
    };
    const updated = [...(data?.panels || []), newPanel]; setData({ ...data, panels: updated }); fetchData(updated);
  };

  const handleClonePanel = (pk: string) => { if (!data) return; const original = data.panels.find(p => p.panel_key === pk); if (!original) return; const newPanel = { ...JSON.parse(JSON.stringify(original)), panel_key: `${original.panel_key}_copy_${Date.now()}` }; const updated = [...data.panels, newPanel]; setData({ ...data, panels: updated }); fetchData(updated); };
  const handleDeletePanel = (pk: string) => { if (!data) return; const updated = data.panels.filter(p => p.panel_key !== pk); setData({ ...data, panels: updated }); fetchData(updated); };
  const handleTitleSave = (pk: string, newTitle: string) => { if (data) setData({...data, panels: data.panels.map(p => p.panel_key === pk ? { ...p, custom_titles: { ...(p.custom_titles || {}), [language]: newTitle } } : p)}); };
  const handleSettingsSave = (pk: string, newType: string, newQuery: string, newField?: string) => { 
    if (data) { 
      const updated = data.panels.map(p => p.panel_key === pk ? { ...p, widget_type: newType, custom_query: newQuery, target_field: newField || p.target_field } : p); 
      setData({ ...data, panels: updated }); 
      fetchData(updated); 
    } 
  };

  const handleDragStart = (key: string) => setDraggedKey(key);
  const handleDragEnd = () => { setDraggedKey(null); setOverKey(null); lastMoveRef.current = null; };
  const handleDragOver = (targetKey: string) => {
    if (!isEditMode || !draggedKey || draggedKey === targetKey || !data) return;
    if (lastMoveRef.current?.dragged === draggedKey && lastMoveRef.current?.target === targetKey) return;
    const items = [...data.panels]; const draggedIdx = items.findIndex(p => p.panel_key === draggedKey); const targetIdx = items.findIndex(p => p.panel_key === targetKey);
    if (draggedIdx === -1 || targetIdx === -1) return; const [movedItem] = items.splice(draggedIdx, 1); items.splice(targetIdx, 0, movedItem);
    lastMoveRef.current = { dragged: draggedKey, target: targetKey }; setData({ ...data, panels: items.map((p, i) => ({ ...p, display_order: i + 1 })) });
  };

  const handleResizeEnd = (pk: string, finalWidthRatio: number, finalHeight: number) => { if (!data) return; setData({ ...data, panels: data.panels.map(p => p.panel_key === pk ? { ...p, grid_width: finalWidthRatio, grid_height: finalHeight } : p) }); };

  const renderPanelContent = (panel: DashboardPanel) => {
    if (!data) return null;
    const pk = panel.panel_key;
    const isMetric = panel.widget_type === "metric";
    if (isMetric) {
      const commonSummaryKeys = ["total_threats", "unresolved_threats", "resolved_threats", "active_threats", "blocked_threats", "mitigated_threats", "suspicious_threats"];
      const baseKey = commonSummaryKeys.find(k => pk.startsWith(k)) || "";
      const colorMap: any = { unresolved_threats: "warning.main", resolved_threats: "success.main", active_threats: "error.main", blocked_threats: "info.main", mitigated_threats: "primary.main", suspicious_threats: "secondary.main" };
      const val = (pk.startsWith("custom_") || pk.includes("_copy") || !baseKey) ? (panel.current_value || 0) : ((data.summary as any)[baseKey] ?? 0);
      return (
        <Paper elevation={1} sx={{ p: 2.5, borderRadius: 1.5, display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
          <EditableTitle panelKey={pk} initialTitle={panel.custom_titles[language] || panel.custom_titles["ko"] || t(panel.default_title_key)} onSave={handleTitleSave} variant="caption" isEditing={editingTitleKey === pk} setIsEditing={(v) => setEditingTitleKey(v ? pk : null)} />
          <Typography variant="h4" sx={{ fontWeight: "bold", color: colorMap[baseKey] || "text.primary", mt: 0.5 }}>{(val || 0).toLocaleString()}</Typography>
        </Paper>
      );
    }
    const chartData = panel.chart_data || [];
    const widget = panel.widget_type === "pie" ? (
      <PieChartWidget 
        data={chartData} 
        height={panel.grid_height}
        onSliceClick={(label) => {
          if (panel.target_field) {
            // 불리언 값인 경우 따옴표 없이 처리
            const isBool = label.toLowerCase() === 'true' || label.toLowerCase() === 'false';
            const filterValue = isBool ? label.toLowerCase() : `"${label}"`;
            const filter = `${panel.target_field}:${filterValue}`;
            handleSearchQueryChange(searchQuery ? `${searchQuery} AND ${filter}` : filter);
          }
        }}
      />
    ) : (
      <CategoryBarChartWidget 
        data={chartData} 
        height={panel.grid_height}
        onBarClick={(label) => {
          if (panel.target_field) {
            // 불리언 값인 경우 따옴표 없이 처리
            const isBool = label.toLowerCase() === 'true' || label.toLowerCase() === 'false';
            const filterValue = isBool ? label.toLowerCase() : `"${label}"`;
            const filter = `${panel.target_field}:${filterValue}`;
            handleSearchQueryChange(searchQuery ? `${searchQuery} AND ${filter}` : filter);
          }
        }}
      />
    );
    return (
      <Paper elevation={1} sx={{ p: 2, height: "100%", display: 'flex', flexDirection: 'column', borderRadius: 1.5, overflow: 'hidden' }}>
        <EditableTitle panelKey={pk} initialTitle={panel.custom_titles[language] || panel.custom_titles["ko"] || t(panel.default_title_key)} onSave={handleTitleSave} isEditing={editingTitleKey === pk} setIsEditing={(v) => setEditingTitleKey(v ? pk : null)} />
        <Box sx={{ flexGrow: 1, minHeight: 0, mt: 1 }}>{widget}</Box>
      </Paper>
    );
  };

  const selectedPanelForSettings = useMemo(() => data?.panels.find(p => p.panel_key === settingsEditPanelKey) || null, [data, settingsEditPanelKey]);

  const handleModalCancel = () => {
    if (modalSnapshot && data) {
      setData({ ...data, panels: JSON.parse(JSON.stringify(modalSnapshot)) });
      setModalSnapshot(null);
    }
  };

  const handleSettingsEditOpen = (key: string) => {
    if (data) {
      setModalSnapshot(JSON.parse(JSON.stringify(data.panels)));
      setSettingsEditPanelKey(key);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, overflowY: "auto", height: "100%", p: { xs: 1.5, sm: 2, md: 3 }, bgcolor: "background.default", position: 'relative' }}>
      {loading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }} />}
      <Box sx={{ mb: 1 }}><ControlBar t={t} fromValue={fromValue} fromUnit={fromUnit} toValue={toValue} toUnit={toUnit} fromDate={fromDate} toDate={toDate} onTimeChange={handleTimeChange} searchQuery={searchQuery} onSearchQueryChange={handleSearchQueryChange} onRefresh={() => fetchData(isEditMode ? data?.panels : undefined)} onReset={() => setResetDialogOpen(true)} onAdd={() => setAddDialogOpen(true)} isEditMode={isEditMode} onEdit={handleEditToggle} onCancel={handleCancel} onSave={handleSave} lastUpdated={data?.last_updated ? dayjs(data.last_updated).add(9, 'hour').format("HH:mm:ss") : undefined} totalLogs={data?.summary?.total_logs} userRole={user?.role} /></Box>
      <Box id="threat-dashboard-grid-container" sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {data?.panels?.map((panel) => (
          <DraggablePanel key={panel.panel_key} panel={panel} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragOver={handleDragOver} onDrop={() => {}} onResizeEnd={handleResizeEnd} onSettingsEdit={handleSettingsEditOpen} onTitleEdit={setEditingTitleKey} onClone={handleClonePanel} onDelete={handleDeletePanel} isDragging={draggedKey === panel.panel_key} isOver={overKey === panel.panel_key} isEditMode={isEditMode} t={t}>{renderPanelContent(panel)}</DraggablePanel>
        ))}
      </Box>
      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}><DialogTitle>{t('resetDashboardConfirmTitle')}</DialogTitle><DialogContent><Typography>{t('resetDashboardConfirmMessage')}</Typography></DialogContent><DialogActions><Button onClick={() => setResetDialogOpen(false)}>{t('cancel')}</Button><Button onClick={async () => { await resetDashboard("threat-status"); fetchData(); setResetDialogOpen(false); setIsEditMode(false); }} variant="contained">{t('reset')}</Button></DialogActions></Dialog>
      <AddPanelDialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} onAdd={handleAddPanel} t={t} />
      <PanelSettingsModal open={!!settingsEditPanelKey} onClose={() => { setSettingsEditPanelKey(null); setModalSnapshot(null); }} panel={selectedPanelForSettings} onSave={handleSettingsSave} onCancel={handleModalCancel} t={t} />
    </Box>
  );
};

export default DashboardTab;