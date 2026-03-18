/**
 * ResizablePanel
 *
 * 왼쪽 패널(너비 조절 + 접기/펼치기)과 리사이즈 핸들을 한 번에 제공하는 공통 컴포넌트.
 *
 * 사용법:
 *   // 1) 일반 children
 *   <ResizablePanel containerId="my-container" initialWidth={280}>
 *     <Paper>...</Paper>
 *   </ResizablePanel>
 *
 *   // 2) render-prop (현재 너비를 자식에게 전달할 때)
 *   <ResizablePanel containerId="my-container" initialWidth={320}>
 *     {(width) => <ListComponent width={width} />}
 *   </ResizablePanel>
 */
import React, { useRef, useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useTheme } from '@mui/material/styles';

interface ResizablePanelProps {
  /** 패널 내부 콘텐츠. 함수를 넘기면 현재 너비(px)를 인자로 받는 render-prop */
  children: React.ReactNode | ((width: number) => React.ReactNode);
  /** 너비 계산 기준 컨테이너의 id */
  containerId: string;
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  /** true 시 xs~sm 모바일에서 패널과 핸들 모두 숨김 */
  hideOnMobile?: boolean;
}

const ResizablePanel: React.FC<ResizablePanelProps> = ({
  children,
  containerId,
  initialWidth = 280,
  minWidth = 160,
  maxWidth = 500,
  hideOnMobile = false,
}) => {
  const theme = useTheme();
  const [width, setWidth] = useState(initialWidth);
  const [collapsed, setCollapsed] = useState(false);
  const isResizing = useRef(false);
  const savedWidth = useRef(initialWidth);

  const displayVal = hideOnMobile ? { xs: 'none', md: 'flex' } : 'flex';

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const onMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      const containerLeft =
        document.getElementById(containerId)?.getBoundingClientRect().left ?? 0;
      setWidth(Math.min(maxWidth, Math.max(minWidth, ev.clientX - containerLeft)));
    };
    const onUp = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const toggle = () => {
    if (collapsed) {
      setCollapsed(false);
    } else {
      savedWidth.current = width;
      setCollapsed(true);
    }
  };

  const content =
    typeof children === 'function' ? (children as (w: number) => React.ReactNode)(width) : children;

  return (
    <>
      {/* ── 왼쪽 패널 ─────────────────────────────── */}
      <Box
        sx={{
          width: collapsed ? 0 : width,
          flexShrink: 0,
          overflow: 'hidden',
          display: displayVal,
          flexDirection: 'column',
          height: '100%',
          transition: 'width 0.18s ease',
        }}
      >
        {content}
      </Box>

      {/* ── 핸들 (토글 버튼 + 드래그 영역) ───────── */}
      <Box
        sx={{
          width: 20,
          flexShrink: 0,
          display: displayVal,
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* 토글 버튼 */}
        <Tooltip title={collapsed ? '패널 펼치기' : '패널 접기'} placement="right">
          <IconButton
            size="small"
            onClick={toggle}
            sx={{
              mt: 1,
              flexShrink: 0,
              width: 18,
              height: 18,
              borderRadius: '3px',
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: 'background.paper',
              '&:hover': { bgcolor: 'action.hover' },
              '& svg': { fontSize: 13 },
            }}
          >
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </Tooltip>

        {/* 드래그 영역 (접혔을 때는 비활성) */}
        <Box
          onMouseDown={collapsed ? undefined : handleResizeMouseDown}
          sx={{
            flexGrow: 1,
            width: '100%',
            cursor: collapsed ? 'default' : 'col-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '&:hover > div, &:active > div': collapsed
              ? {}
              : { bgcolor: 'primary.main' },
          }}
        >
          {!collapsed && (
            <Box
              sx={{
                width: 2,
                height: 40,
                borderRadius: 1,
                bgcolor: 'divider',
                transition: 'background-color 0.2s',
              }}
            />
          )}
        </Box>
      </Box>
    </>
  );
};

export default ResizablePanel;
