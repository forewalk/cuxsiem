/**
 * ResizablePanel
 *
 * 너비 조절 + 접기/펼치기 핸들을 제공하는 공통 패널 컴포넌트.
 *
 * - direction='left' (기본): 패널이 왼쪽, 핸들이 오른쪽 (Panel 1, Panel 2 용)
 * - direction='right': 핸들이 왼쪽, 패널이 오른쪽 (Panel 3 등 오른쪽 패널 용)
 *
 * 사용법:
 *   <ResizablePanel initialWidth={320}>
 *     {(width) => <ListComponent width={width} />}
 *   </ResizablePanel>
 *
 *   <ResizablePanel direction="right" initialWidth={420}>
 *     <Paper>...</Paper>
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
  /** @deprecated 더 이상 사용하지 않음 (하위호환용) */
  containerId?: string;
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  /** 패널 방향: 'left'=패널 왼쪽+핸들 오른쪽, 'right'=핸들 왼쪽+패널 오른쪽 */
  direction?: 'left' | 'right';
  /** true 시 xs~sm 모바일에서 패널과 핸들 모두 숨김 */
  hideOnMobile?: boolean;
}

const ResizablePanel: React.FC<ResizablePanelProps> = ({
  children,
  initialWidth = 280,
  minWidth = 160,
  maxWidth = 500,
  direction = 'left',
  hideOnMobile = false,
}) => {
  const theme = useTheme();
  const [width, setWidth] = useState(initialWidth);
  const [collapsed, setCollapsed] = useState(false);
  const isResizing = useRef(false);
  const savedWidth = useRef(initialWidth);

  const displayVal = hideOnMobile ? { xs: 'none', md: 'flex' } : 'flex';
  const isRight = direction === 'right';

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    const startX = e.clientX;
    const startWidth = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const onMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = ev.clientX - startX;
      const newWidth = isRight ? startWidth - delta : startWidth + delta;
      setWidth(Math.min(maxWidth, Math.max(minWidth, newWidth)));
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

  const collapseIcon = isRight
    ? (collapsed ? <ChevronLeftIcon /> : <ChevronRightIcon />)
    : (collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />);

  const tooltipPlacement = isRight ? 'left' : 'right';

  const panelBox = (
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
  );

  const handleBox = (
    <Box
      sx={{
        width: 20,
        flexShrink: 0,
        display: displayVal,
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Tooltip title={collapsed ? '패널 펼치기' : '패널 접기'} placement={tooltipPlacement}>
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
          {collapseIcon}
        </IconButton>
      </Tooltip>

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
  );

  return isRight ? (
    <>{handleBox}{panelBox}</>
  ) : (
    <>{panelBox}{handleBox}</>
  );
};

export default ResizablePanel;
