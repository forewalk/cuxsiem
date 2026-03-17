import React, { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Popover from "@mui/material/Popover";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

import RefreshIcon from "@mui/icons-material/Refresh";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import AddIcon from "@mui/icons-material/Add";
import DownloadIcon from "@mui/icons-material/Download";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import CloseIcon from "@mui/icons-material/Close";
import StorageIcon from "@mui/icons-material/Storage";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useLanguageStore } from "../../../stores/useLanguageStore";
import dayjs from "dayjs";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import TimeRangePicker from "../../../components/shared/TimeRangePicker";
import ControlSearchBar from "../../../components/shared/ControlSearchBar";

// dayjs 로케일 임포트
import 'dayjs/locale/ko';
import 'dayjs/locale/ja';
import 'dayjs/locale/en';

interface ControlBarProps {
  t: (key: string, params?: Record<string, string>) => string;
  fromValue: number | null;
  fromUnit: string;
  toValue: number | null;
  toUnit: string;
  fromDate: string | null;
  toDate: string | null;
  onTimeChange: (fromVal: number | null, fromUnit: string, toVal: number | null, toUnit: string, fDate: string | null, tDate: string | null) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onRefresh: () => void;
  onReset?: () => void;
  onAdd?: () => void;
  isEditMode?: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
  onSave?: () => void;
  lastUpdated?: string;
  totalLogs?: number;
  indexOptions?: string[];
  selectedIndex?: string;
  onIndexChange?: (index: string) => void;
  userRole?: string;
  onDownload?: () => void;
}

const ControlBar: React.FC<ControlBarProps> = ({
  t,
  fromValue,
  fromUnit,
  toValue,
  toUnit,
  fromDate,
  toDate,
  onTimeChange,
  searchQuery,
  onSearchQueryChange,
  onRefresh,
  onReset,
  onAdd,
  isEditMode,
  onEdit,
  onCancel,
  onSave,
  lastUpdated,
  totalLogs,
  indexOptions = [],
  selectedIndex = '*',
  onIndexChange,
  onDownload
}) => {
  const theme = useTheme();
  const { language } = useLanguageStore();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [downloading, setDownloading] = useState(false);
  const [indexAnchorEl, setIndexAnchorEl] = useState<HTMLDivElement | null>(null);

  const KIBANA_TEAL = "#005a5e";
  const BORDER_COLOR = theme.palette.divider;
  const BG_COLOR = theme.palette.mode === 'dark' ? theme.palette.background.paper : "#f5f7fa";
  const TEXT_COLOR = theme.palette.text.primary;
  const indexOpen = Boolean(indexAnchorEl);

  const handleRemoveFilter = (indexToRemove: number) => {
    const filters = searchQuery.split(" AND ");
    const newFilters = filters.filter((_, index) => index !== indexToRemove);
    onSearchQueryChange(newFilters.join(" AND "));
  };

  const handleDownloadPdf = async () => {
    // 부모로부터 주입된 다운로드 함수가 있으면 그것을 실행 (예: 엑셀 다운로드)
    if (onDownload) {
      onDownload();
      return;
    }

    // 기본 동작: PDF 캡처
    // 컨테이너 ID 중 화면에 보이는 것을 찾음 (display:none 탭 제외)
    const containerIds = [
      'agent-dashboard-grid-container',
      'threat-dashboard-grid-container',
      'threat-list-tab-container',
      'agent-list-tab-container'
    ];
    const element = containerIds
      .map(id => document.getElementById(id))
      .find(el => el && el.offsetParent !== null) || null;

    if (!element) {
      console.warn('Dashboard container not found');
      return;
    }

    try {
      setDownloading(true);

      // 캡처 시 불필요한 요소 잠시 숨기기 (필요한 경우)
      const canvas = await html2canvas(element, {
        scale: 2, // 해상도 향상
        useCORS: true,
        logging: false,
        backgroundColor: theme.palette.mode === 'dark' ? '#121212' : '#F4F5F7',
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const margin = 40; // 여백 설정 (px)
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // 페이지 크기를 이미지 크기 + 여백으로 설정
      const pdf = new jsPDF({
        orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
        unit: 'px',
        format: [imgWidth + (margin * 2), imgHeight + (margin * 2)]
      });

      pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
      const filename = `dashboard_${dayjs().format('YYYYMMDD_HHmmss')}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    } finally {
      setDownloading(false);
    }
  };

  const handleIndexClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (indexOptions.length === 0) return;
    event.stopPropagation();
    setIndexAnchorEl(event.currentTarget as HTMLDivElement);
  };

  const handleIndexClose = () => setIndexAnchorEl(null);

  const handleIndexSelect = (index: string) => {
    if (onIndexChange) onIndexChange(index);
    handleIndexClose();
  };

  return (
    <Box className="no-print" sx={{ display: "flex", flexDirection: "column", gap: { xs: 0.5, md: 0.75 }, mb: { xs: 1, md: 2 }, width: '100%' }}>
      <Box sx={{
        display: "flex",
        flexDirection: { xs: 'column', lg: 'row' },
        alignItems: "stretch",
        gap: 0.5,
        width: '100%'
      }}>

        {/* 1. Index Info (Interactive) - Only if indexOptions provided */}
        {indexOptions.length > 0 && (
          <Box
            onClick={handleIndexClick}
            sx={{
              display: { xs: 'none', sm: 'flex' },
              alignItems: 'center',
              bgcolor: BG_COLOR,
              border: `1px solid ${indexOpen ? KIBANA_TEAL : BORDER_COLOR}`,
              borderRadius: 1,
              px: 1,
              gap: 0.75,
              minHeight: 32,
              cursor: 'pointer',
              '&:hover': { bgcolor: theme.palette.action.hover }
            }}
          >
            <StorageIcon sx={{ color: KIBANA_TEAL, fontSize: 16 }} />
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: TEXT_COLOR, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
              {selectedIndex === '*' ? t('allLogs') : selectedIndex}
            </Typography>
            <KeyboardArrowDownIcon sx={{ color: KIBANA_TEAL, fontSize: 14 }} />
          </Box>
        )}

        {/* 2. Search Section + Search Button (공유 컴포넌트) */}
        <ControlSearchBar
          t={t}
          placeholder={t('searchPlaceholder') || t('search')}
          onSubmit={(value) => {
            if (value.trim()) {
              const newQuery = searchQuery ? `${searchQuery} AND ${value.trim()}` : value.trim();
              onSearchQueryChange(newQuery);
            }
          }}
        />

        <Box sx={{ display: 'flex', gap: 0.5, width: { xs: '100%', lg: 'auto' } }}>
          {/* 3. Time Picker Section (공유 컴포넌트) */}
          <TimeRangePicker
            t={t} language={language}
            fromValue={fromValue} fromUnit={fromUnit}
            toValue={toValue} toUnit={toUnit}
            fromDate={fromDate} toDate={toDate}
            onTimeChange={onTimeChange} onRefresh={onRefresh}
          />

          {/* 4. Refresh Button */}
          <Button
            variant="contained"
            disableElevation
            startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
            onClick={onRefresh}
            sx={{
              bgcolor: KIBANA_TEAL,
              color: '#fff',
              textTransform: 'none',
              fontWeight: 'bold',
              px: 1.5,
              minWidth: { xs: 'fit-content', md: 80 },
              minHeight: 32,
              fontSize: '0.8rem',
              '&:hover': { bgcolor: '#004a4d' }
            }}
          >
            {isMobile ? '' : t('refresh')}
          </Button>
        </Box>
      </Box>

      {/* 5. Filter Tags Section */}
      {searchQuery && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
          <FilterAltIcon sx={{ color: KIBANA_TEAL, fontSize: 16 }} />
          {searchQuery.split(" AND ").map((filter, index) => (
            <Box key={index} sx={{
              display: 'flex',
              alignItems: 'center',
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(0, 90, 94, 0.2)' : '#eef6f6',
              border: `1px solid ${KIBANA_TEAL}`,
              borderRadius: 0.5,
              px: 0.75,
              py: 0.1
            }}>
              <Typography variant="caption" sx={{ color: TEXT_COLOR, fontSize: '0.75rem' }}>
                {filter.trim()}
              </Typography>
              <IconButton size="small" onClick={() => handleRemoveFilter(index)} sx={{ ml: 0.5, p: 0.1, color: TEXT_COLOR }}>
                <CloseIcon sx={{ fontSize: 12 }} />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      {(lastUpdated || totalLogs !== undefined || onReset || onEdit) && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.25, gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {lastUpdated && (
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                {t('lastUpdated')}: {lastUpdated}
              </Typography>
            )}
            {lastUpdated && totalLogs !== undefined && (
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>•</Typography>
            )}
            {totalLogs !== undefined && (
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                {t('totalLogs') || 'Total Logs'}: {totalLogs.toLocaleString()}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {!isEditMode && onEdit && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                onClick={onEdit}
                sx={{
                  fontSize: '0.65rem', color: 'text.secondary', borderColor: 'divider', textTransform: 'none', height: 22, px: 1.5, borderRadius: 1,
                  '&:hover': { bgcolor: 'action.hover', borderColor: KIBANA_TEAL, color: KIBANA_TEAL }
                }}
              >
                {t('edit')}
              </Button>
            )}

            {!isEditMode && !onEdit && onReset && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<RestartAltIcon sx={{ fontSize: 14 }} />}
                onClick={onReset}
                sx={{
                  fontSize: '0.65rem',
                  color: 'text.secondary',
                  borderColor: 'divider',
                  textTransform: 'none',
                  height: 22,
                  px: 1,
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'action.hover', color: 'error.main', borderColor: 'error.main' }
                }}
              >
                {t('reset')}
              </Button>
            )}

            {!isEditMode && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
                onClick={handleDownloadPdf}
                disabled={downloading}
                sx={{
                  fontSize: '0.65rem', color: 'text.secondary', borderColor: 'divider', textTransform: 'none', height: 22, px: 1.5, borderRadius: 1,
                  '&:hover': { bgcolor: 'action.hover', borderColor: KIBANA_TEAL, color: KIBANA_TEAL }
                }}
              >
                {downloading ? t('downloading') : t('download')}
              </Button>
            )}

            {isEditMode && (
              <>
                {onAdd && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                    onClick={onAdd}
                    sx={{
                      fontSize: '0.65rem', color: KIBANA_TEAL, borderColor: KIBANA_TEAL, textTransform: 'none', height: 22, px: 1, borderRadius: 1,
                      '&:hover': { bgcolor: 'action.hover', borderColor: '#004a4d' }
                    }}
                  >
                    {t('addPanel')}
                  </Button>
                )}

                {onReset && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<RestartAltIcon sx={{ fontSize: 14 }} />}
                    onClick={onReset}
                    sx={{
                      fontSize: '0.65rem',
                      color: 'text.secondary',
                      borderColor: 'divider',
                      textTransform: 'none',
                      height: 22,
                      px: 1,
                      borderRadius: 1,
                      '&:hover': { bgcolor: 'action.hover', color: 'error.main', borderColor: 'error.main' }
                    }}
                  >
                    {t('reset')}
                  </Button>
                )}

                {onCancel && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={onCancel}
                    sx={{
                      fontSize: '0.65rem',
                      color: 'text.secondary',
                      borderColor: 'divider',
                      textTransform: 'none',
                      height: 22,
                      px: 1.5,
                      borderRadius: 1,
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    {t('cancel')}
                  </Button>
                )}

                {onSave && (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<SaveIcon sx={{ fontSize: 14 }} />}
                    onClick={onSave}
                    sx={{
                      fontSize: '0.65rem',
                      bgcolor: KIBANA_TEAL,
                      color: 'white',
                      textTransform: 'none',
                      height: 22,
                      px: 1.5,
                      borderRadius: 1,
                      '&:hover': { bgcolor: '#004a4d' }
                    }}
                  >
                    {t('save')}
                  </Button>
                )}
              </>
            )}
          </Box>
        </Box>
      )}

      {/* 인덱스 선택 팝오버 */}
      <Popover open={indexOpen} anchorEl={indexAnchorEl} onClose={handleIndexClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{ sx: { width: 300, mt: 1, borderRadius: 1, boxShadow: theme.shadows[10], bgcolor: theme.palette.background.paper, overflow: 'hidden' } }}
      >
        <Box sx={{ p: 0 }}>
          <Box sx={{ p: 1, borderBottom: `1px solid ${BORDER_COLOR}`, bgcolor: BG_COLOR }}>
            <TextField
              fullWidth
              size="small"
              placeholder={t('search')}
              autoFocus
              onChange={(e) => {
                const val = e.target.value.toLowerCase();
                const items = document.querySelectorAll('.index-item');
                items.forEach((item: any) => {
                  item.style.display = item.innerText.toLowerCase().includes(val) ? 'block' : 'none';
                });
              }}
              sx={{ "& .MuiInputBase-input": { fontSize: '0.8rem', py: 0.5 } }}
            />
          </Box>
          <Box sx={{ maxHeight: 300, overflowY: 'auto', py: 0.5 }}>
            {indexOptions.map((index) => (
              <MenuItem
                key={index}
                className="index-item"
                onClick={() => handleIndexSelect(index)}
                selected={selectedIndex === index}
                sx={{
                  fontSize: '0.8rem',
                  py: 1,
                  '&.Mui-selected': { bgcolor: `${KIBANA_TEAL}22`, color: KIBANA_TEAL, fontWeight: 'bold' }
                }}
              >
                {index === '*' ? t('allLogs') : index}
              </MenuItem>
            ))}
          </Box>
        </Box>
      </Popover>
    </Box>
  );
};

export default ControlBar;
