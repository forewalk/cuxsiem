import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  Box, Paper, Typography, LinearProgress, Divider, 
  IconButton, TextField, Tooltip, useTheme,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Menu, MenuItem, ListItemIcon, ListItemText
} from "@mui/material";
import ControlBar from "../components/ControlBar";
import CategoryBarChartWidget from "../components/CategoryBarChartWidget";
import PieChartWidget from "../components/PieChartWidget";
import { getDashboardStats, resetDashboard, saveDashboardLayout } from "../../../services/dashboardService";
import type { DashboardStatsResponse, DashboardPanel } from "../../../services/dashboardService";
import { useLanguageStore } from "../../../stores/useLanguageStore";
import dayjs from "dayjs";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import NorthWestIcon from '@mui/icons-material/NorthWest';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import SettingsIcon from '@mui/icons-material/Settings';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';

// i18n
import koMessages from "../../../locales/ko.json";
import enMessages from "../../../locales/en.json";
import jaMessages from "../../../locales/ja.json";
import cnMessages from "../../../locales/cn.json";

const translations: Record<string, Record<string, string>> = { ko: koMessages, en: enMessages, ja: jaMessages, cn: cnMessages };

// --- Query Edit Modal ---
const QueryEditModal: React.FC<{
  open: boolean; onClose: () => void; panelKey: string; initialQuery: string;
  onSave: (key: string, query: string | null) => void;
}> = ({ open, onClose, panelKey, initialQuery, onSave }) => {
  const [query, setQuery] = useState(initialQuery || "");
  useEffect(() => { setQuery(initialQuery || ""); }, [initialQuery]);
  const handleSave = () => { onSave(panelKey, query); onClose(); };
  const handleResetQuery = () => { onSave(panelKey, null); onClose(); };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 'bold' }}>패널 쿼리 편집</DialogTitle>
      <DialogContent>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>OpenSearch DSL 쿼리 또는 쿼리 스트링을 입력하세요</Typography>
        <TextField fullWidth multiline rows={4} value={query} onChange={(e) => setQuery(e.target.value)} variant="outlined" placeholder="*" autoFocus sx={{ mt: 1, '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.85rem' } }} />
      </DialogContent>
      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}><Button onClick={handleResetQuery} variant="text" color="error">쿼리 초기화</Button><Box><Button onClick={onClose} color="inherit" sx={{ mr: 1 }}>취소</Button><Button onClick={handleSave} variant="contained" color="primary">확인</Button></Box></DialogActions>
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
  onQueryEdit: (key: string) => void; onTitleEdit: (key: string) => void; onClone: (key: string) => void; onDelete: (key: string) => void;
  isDragging: boolean; isOver: boolean; isEditMode: boolean; children: React.ReactNode;
}> = ({ panel, onDragStart, onDragEnd, onDragOver, onDrop, onResizeEnd, onQueryEdit, onTitleEdit, onClone, onDelete, isDragging, isOver, isEditMode, children }) => {
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
    const containerId = panel.dashboard_id === "threat-status" ? "threat-dashboard-grid-container" : "agent-dashboard-grid-container";
    const gridContainer = document.getElementById(containerId);
    let finalRatio = panel.grid_width; const finalHeight = Math.max(100, Math.round((startHeight.current + deltaY) / 20) * 20);
    if (gridContainer) { finalRatio = getSnapRatio(startWidth.current + deltaX, gridContainer.getBoundingClientRect().width); }
    setVisualWidth(0); setVisualHeight('auto'); 
    document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp);
    onResizeEnd(panel.panel_key, finalRatio, finalHeight);
  }, [panel.panel_key, panel.dashboard_id, panel.grid_width, onMouseMove, onResizeEnd]);

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
          <Box sx={{ position: 'absolute', top: 4, right: 4, zIndex: 20 }}>
            <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ p: 0.5, color: 'text.disabled', '&:hover': { color: 'primary.main', bgcolor: 'action.hover' } }}><SettingsIcon fontSize="small" /></IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}><MenuItem onClick={() => { onTitleEdit(panel.panel_key); setAnchorEl(null); }}><ListItemIcon><EditIcon fontSize="small" /></ListItemIcon><ListItemText primary="제목 수정" /></MenuItem><MenuItem onClick={() => { onQueryEdit(panel.panel_key); setAnchorEl(null); }}><ListItemIcon><FilterAltIcon fontSize="small" /></ListItemIcon><ListItemText primary="쿼리 수정" /></MenuItem><MenuItem onClick={() => { onClone(panel.panel_key); setAnchorEl(null); }}><ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon><ListItemText primary="패널 복제" /></MenuItem><Divider /><MenuItem onClick={() => { onDelete(panel.panel_key); setAnchorEl(null); }} sx={{ color: 'error.main' }}><ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon><ListItemText primary="패널 삭제" /></MenuItem></Menu>
          </Box>
        )}
        {isEditMode && <Box className="resize-handle" onMouseDown={onMouseDownLocal} sx={{ position: 'absolute', right: 8, bottom: 8, width: 32, height: 32, cursor: 'nwse-resize', zIndex: 30, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', color: 'primary.main', p: 0.5, '&:hover': { opacity: 1 } }}><NorthWestIcon sx={{ fontSize: 16, transform: 'rotate(180deg)' }} /></Box>}
        <Box sx={{ pointerEvents: isDragging || resizing ? 'none' : 'auto', height: '100%' }}>{children}</Box>
      </Box>
    </Box>
  );
};

const DashboardTab: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useLanguageStore();
  const [data, setData] = useState<DashboardStatsResponse | null>(null);
  const [originalPanels, setOriginalPanels] = useState<DashboardPanel[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [queryEditPanel, setQueryEditPanel] = useState<string | null>(null);
  const [editingTitleKey, setEditingTitleKey] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const lastMoveRef = useRef<{ dragged: string, target: string } | null>(null);

  const fromValue = searchParams.get("from_value") ? Number(searchParams.get("from_value")) : 15;
  const fromUnit = searchParams.get("from_unit") || "m";
  const toValue = searchParams.get("to_value") ? Number(searchParams.get("to_value")) : null;
  const toUnit = searchParams.get("to_unit") || "m";
  const fromDate = searchParams.get("from_date");
  const toDate = searchParams.get("to_date");
  const searchQuery = searchParams.get("q") || "";

  const t = useMemo(() => (key: string): string => (translations[language] || translations["ko"] || {})[key] || key, [language]);

  const fetchData = useCallback(async () => {
    try { 
      setLoading(true); 
      const stats = await getDashboardStats("threat-status", fromValue || undefined, fromUnit, toValue ?? undefined, toUnit, fromDate ?? undefined, toDate ?? undefined, searchQuery || undefined); 
      if (stats && stats.summary) { setData(stats); }
    } catch (err) { console.error("Error fetching dashboard data:", err); }
    finally { setLoading(false); }
  }, [fromValue, fromUnit, toValue, toUnit, fromDate, toDate, searchQuery]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleTimeChange = useCallback((fv: number | null, fu: string, tv: number | null, tu: string, fd: string | null, td: string | null) => {
    const np = new URLSearchParams(searchParams);
    if (fv !== null) np.set("from_value", fv.toString()); else np.delete("from_value");
    np.set("from_unit", fu); if (tv !== null) np.set("to_value", tv.toString()); else np.delete("to_value");
    np.set("to_unit", tu); if (fd) np.set("from_date", fd); else np.delete("from_date"); if (td) np.set("to_date", td); else np.delete("to_date");
    setSearchParams(np);
  }, [searchParams, setSearchParams]);

  const handleSearchQueryChange = useCallback((q: string) => {
    const np = new URLSearchParams(searchParams);
    if (q) np.set("q", q); else np.delete("q"); setSearchParams(np);
  }, [searchParams, setSearchParams]);

  const handleEditToggle = () => { if (!isEditMode) setOriginalPanels(data?.panels ? JSON.parse(JSON.stringify(data.panels)) : null); setIsEditMode(!isEditMode); };
  const handleCancel = () => { if (originalPanels && data) setData({ ...data, panels: JSON.parse(JSON.stringify(originalPanels)) }); setEditingTitleKey(null); setIsEditMode(false); };
  const handleSave = async () => { if (!data) return; setLoading(true); try { await saveDashboardLayout("threat-status", data.panels); setOriginalPanels(JSON.parse(JSON.stringify(data.panels))); setEditingTitleKey(null); setIsEditMode(false); } finally { setLoading(false); } };

  const handleClonePanel = (pk: string) => { if (!data) return; const original = data.panels.find(p => p.panel_key === pk); if (!original) return; const newPanel = { ...JSON.parse(JSON.stringify(original)), panel_key: `${original.panel_key}_copy_${Date.now()}` }; setData({ ...data, panels: [...data.panels, newPanel] }); };
  const handleDeletePanel = (pk: string) => { if (!data) return; setData({ ...data, panels: data.panels.filter(p => p.panel_key !== pk) }); };
  const handleTitleSave = (pk: string, newTitle: string) => { if (data) setData({...data, panels: data.panels.map(p => p.panel_key === pk ? { ...p, custom_titles: { ...(p.custom_titles || {}), [language]: newTitle } } : p)}); };
  const handleQuerySave = (pk: string, newQuery: string | null) => { if (data) setData({ ...data, panels: data.panels.map(p => p.panel_key === pk ? { ...p, custom_query: newQuery || "" } : p) }); };

  const handleDragStart = (key: string) => setDraggedKey(key);
  const handleDragEnd = () => { setDraggedKey(null); setOverKey(null); lastMoveRef.current = null; };
  const handleDragOver = (targetKey: string) => {
    if (!isEditMode || !draggedKey || draggedKey === targetKey || !data) return;
    if (lastMoveRef.current?.dragged === draggedKey && lastMoveRef.current?.target === targetKey) return;
    const items = [...data.panels]; const draggedIdx = items.findIndex(p => p.panel_key === draggedKey); const targetIdx = items.findIndex(p => p.panel_key === targetKey);
    if (draggedIdx === -1 || targetIdx === -1) return; const [movedItem] = items.splice(draggedIdx, 1); items.splice(targetIdx, 0, movedItem);
    lastMoveRef.current = { dragged: draggedKey, target: targetKey }; setData({ ...data, panels: items.map((p, i) => ({ ...p, display_order: i + 1 })) });
  };

  const handleResizeEnd = (pk: string, finalWidthRatio: number, finalHeight: number) => {
    if (!data) return;
    setData({ ...data, panels: data.panels.map(p => p.panel_key === pk ? { ...p, grid_width: finalWidthRatio, grid_height: finalHeight } : p) });
  };

  const renderPanelContent = (panel: DashboardPanel) => {
    if (!data) return null;
    const pk = panel.panel_key;
    const commonSummaryKeys = ["total_threats", "unresolved_threats", "resolved_threats", "active_threats", "blocked_threats", "mitigated_threats", "suspicious_threats"];
    if (commonSummaryKeys.some(k => pk.startsWith(k))) {
      const baseKey = commonSummaryKeys.find(k => pk.startsWith(k)) || "total_threats";
      const colorMap: any = { unresolved_threats: "warning.main", resolved_threats: "success.main", active_threats: "error.main", blocked_threats: "info.main", mitigated_threats: "primary.main", suspicious_threats: "secondary.main" };
      const valMap: any = { total_threats: data.summary?.total_threats, unresolved_threats: data.summary?.unresolved_threats, resolved_threats: data.summary?.resolved_threats, active_threats: data.summary?.active_threats, blocked_threats: data.summary?.blocked_threats, mitigated_threats: data.summary?.mitigated_threats, suspicious_threats: data.summary?.suspicious_threats };
      return (
        <Paper elevation={1} sx={{ p: 2.5, borderRadius: 1.5, display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
          <EditableTitle panelKey={pk} initialTitle={panel.custom_titles[language] || panel.custom_titles["ko"] || t(panel.default_title_key)} onSave={handleTitleSave} variant="caption" isEditing={editingTitleKey === pk} setIsEditing={(v) => setEditingTitleKey(v ? pk : null)} />
          <Typography variant="h4" sx={{ fontWeight: "bold", color: colorMap[baseKey] || "text.primary", mt: 0.5 }}>{(valMap[baseKey] ?? 0).toLocaleString()}</Typography>
        </Paper>
      );
    }
    const chartMap: any = { detection_engine: data.detection_stats, severity_dist: data.severity_stats, prevalent_threats: data.prevalent_threats, mitigation_stats: data.mitigation_stats, agent_status_dist: data.agent_status_stats, confidence_level_dist: data.confidence_level_stats, incident_status_dist: data.incident_status_stats, top_threat_techniques: data.threat_technique_stats, infected_agents_dist: data.infected_agent_stats };
    const chartData = chartMap[pk.split('_copy')[0]] || [];
    const widget = pk.includes('engine') || pk.includes('severity') || pk.includes('status') ? <PieChartWidget data={chartData} /> : <CategoryBarChartWidget data={chartData} color="#20b2aa" />;
    return (
      <Paper elevation={1} sx={{ p: 2, height: "100%", display: 'flex', flexDirection: 'column', borderRadius: 1.5, overflow: 'hidden' }}>
        <EditableTitle panelKey={pk} initialTitle={panel.custom_titles[language] || panel.custom_titles["ko"] || t(panel.default_title_key)} onSave={handleTitleSave} isEditing={editingTitleKey === pk} setIsEditing={(v) => setEditingTitleKey(v ? pk : null)} />
        <Box sx={{ flexGrow: 1, minHeight: 0, mt: 1 }}>{widget}</Box>
      </Paper>
    );
  };

  return (
    <Box sx={{ flexGrow: 1, overflowY: "auto", height: "100%", p: { xs: 1.5, sm: 2, md: 3 }, bgcolor: "background.default", position: 'relative' }}>
      {loading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }} />}
      <Box sx={{ mb: 1 }}><ControlBar t={t} fromValue={fromValue} fromUnit={fromUnit} toValue={toValue} toUnit={toUnit} fromDate={fromDate} toDate={toDate} onTimeChange={handleTimeChange} searchQuery={searchQuery} onSearchQueryChange={handleSearchQueryChange} onRefresh={fetchData} onReset={() => setResetDialogOpen(true)} isEditMode={isEditMode} onEdit={handleEditToggle} onCancel={handleCancel} onSave={handleSave} lastUpdated={data?.last_updated ? dayjs(data.last_updated).add(9, 'hour').format("HH:mm:ss") : undefined} /></Box>
      <Box id="threat-dashboard-grid-container" sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {data?.panels?.map((panel) => (
          <DraggablePanel key={panel.panel_key} panel={panel} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragOver={handleDragOver} onDrop={() => {}} onResizeEnd={handleResizeEnd} onQueryEdit={setQueryEditPanel} onTitleEdit={setEditingTitleKey} onClone={handleClonePanel} onDelete={handleDeletePanel} isDragging={draggedKey === panel.panel_key} isOver={overKey === panel.panel_key} isEditMode={isEditMode}>{renderPanelContent(panel)}</DraggablePanel>
        ))}
      </Box>
      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}><DialogTitle>{t('resetDashboardConfirmTitle')}</DialogTitle><DialogContent><Typography>{t('resetDashboardConfirmMessage')}</Typography></DialogContent><DialogActions><Button onClick={() => setResetDialogOpen(false)}>{t('cancel')}</Button><Button onClick={async () => { await resetDashboard("threat-status"); fetchData(); setResetDialogOpen(false); setIsEditMode(false); }} variant="contained">{t('reset')}</Button></DialogActions></Dialog>
      <QueryEditModal open={!!queryEditPanel} onClose={() => setQueryEditPanel(null)} panelKey={queryEditPanel || ""} initialQuery={(() => { const p = data?.panels?.find(p => p.panel_key === queryEditPanel); return p?.custom_query || p?.default_query || ""; })()} onSave={handleQuerySave} />
    </Box>
  );
};

export default DashboardTab;
