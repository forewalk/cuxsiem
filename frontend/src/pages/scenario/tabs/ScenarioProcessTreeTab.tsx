import React, { useState } from 'react';
import {
  Box, Typography, Stack, Chip, Select, MenuItem,
  IconButton, Tooltip, Divider, TextField, InputAdornment,
} from '@mui/material';
import {
  AccountTree as ProcessTreeIcon,
  Search as SearchIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  FitScreen as FitIcon,
  Warning as WarningIcon,
  InsertDriveFile as FileIcon,
  LibraryBooks as LibIcon,
  Wifi as NetIcon,
  Storage as RegIcon,
  ConstructionOutlined as ConstructionIcon,
  Circle as DotIcon,
} from '@mui/icons-material';
import { useTranslation } from '../../../hooks/useTranslation';

// ── 타입 정의 ────────────────────────────────────────────────────────────────
type NodeStatus = 'running' | 'terminated' | 'detected' | 'child';
type ResourceType = 'file' | 'lib' | 'net' | 'reg' | 'mem';

interface ProcessNode {
  id: string;
  x: number; y: number; w: number; h: number;
  status: NodeStatus;
  label: string;
  name: string;
  pid?: number;
  user?: string;
  decoded?: string;
  resources: { type: ResourceType; count: number }[];
}
interface ProcessEdge {
  from: string; to: string;
  label?: string;
  threat?: boolean;
}

// ── 색상 팔레트 (다크 캔버스 고정) ──────────────────────────────────────────
const C = {
  canvas:      '#0d1117',
  running:     { border: '#29b6f6', label: '#29b6f6', bg: 'rgba(41,182,246,0.09)' },
  terminated:  { border: '#546e7a', label: '#90a4ae', bg: 'rgba(84,110,122,0.09)' },
  detected:    { border: '#ef5350', label: '#ef5350', bg: 'rgba(239,83,80,0.13)' },
  child:       { border: '#42a5f5', label: '#64b5f6', bg: 'rgba(66,165,245,0.09)' },
  edgeNormal:  '#29b6f6',
  edgeThreat:  '#ef5350',
  edgeLabel:   '#78909c',
  text:        '#e0e0e0',
  textSub:     '#90a4ae',
};

// ── 목업 데이터 ───────────────────────────────────────────────────────────────
const NODES: Record<string, ProcessNode> = {
  explorer: {
    id: 'explorer', x: 20, y: 195, w: 190, h: 92,
    status: 'running', label: 'RUNNING PROCESS', name: 'explorer.exe',
    pid: 1234, user: 'Admin',
    resources: [{ type: 'file', count: 513 }, { type: 'file', count: 2 }],
  },
  taskmgr: {
    id: 'taskmgr', x: 295, y: 20, w: 190, h: 78,
    status: 'terminated', label: 'TERMINATED PROCESS', name: 'taskmgr.exe',
    pid: 5604, user: 'Guest',
    resources: [{ type: 'lib', count: 1 }],
  },
  cmd1: {
    id: 'cmd1', x: 295, y: 130, w: 190, h: 78,
    status: 'terminated', label: 'TERMINATED PROCESS', name: 'cmd.exe',
    pid: 1, user: 'Admin',
    resources: [{ type: 'lib', count: 1 }, { type: 'lib', count: 2 }],
  },
  cmd2: {
    id: 'cmd2', x: 295, y: 248, w: 190, h: 78,
    status: 'terminated', label: 'TERMINATED PROCESS', name: 'cmd.exe',
    pid: 542, user: 'Guest',
    resources: [{ type: 'file', count: 2 }, { type: 'file', count: 2 }],
  },
  powershell: {
    id: 'powershell', x: 295, y: 358, w: 190, h: 78,
    status: 'child', label: 'CHILD-TEXT', name: 'powershell.exe',
    pid: 9101, user: 'Admin',
    resources: [{ type: 'lib', count: 3 }, { type: 'reg', count: 3 }],
  },
  psblock1: {
    id: 'psblock1', x: 580, y: 95, w: 220, h: 96,
    status: 'detected', label: 'POWERSHELL SCRIPT BLOCK',
    name: 'BLOCK [Encoded Command]',
    decoded: 'Decoded: iex (New-Object System.Net.WebClient)…',
    resources: [{ type: 'net', count: 3 }, { type: 'net', count: 1 }],
  },
  psblock2: {
    id: 'psblock2', x: 580, y: 243, w: 220, h: 96,
    status: 'detected', label: 'POWERSHELL SCRIPT BLOCK',
    name: 'BLOCK [Encoded Command]',
    decoded: 'Decoded: iex (New-Object System.Net.WebClien…',
    resources: [{ type: 'net', count: 1 }],
  },
  taskplorer: {
    id: 'taskplorer', x: 580, y: 378, w: 220, h: 78,
    status: 'running', label: 'RUNNING PROCESS', name: 'taskplorer.exe',
    pid: 9274, user: 'Admin',
    resources: [{ type: 'lib', count: 1 }, { type: 'mem', count: 2 }],
  },
};

const EDGES: ProcessEdge[] = [
  { from: 'explorer', to: 'taskmgr',   label: '28 ms' },
  { from: 'explorer', to: 'cmd1',      label: '45 ms' },
  { from: 'explorer', to: 'cmd2' },
  { from: 'explorer', to: 'powershell',label: '120 ms' },
  { from: 'cmd1',     to: 'psblock1',  label: '880 ms', threat: true },
  { from: 'cmd2',     to: 'psblock2',  label: '790 ms', threat: true },
  { from: 'powershell',to: 'taskplorer',label: '490 ms' },
];

const CANVAS_W = 830;
const CANVAS_H = 510;

// ── 리소스 아이콘 ─────────────────────────────────────────────────────────────
const ResIcon: Record<ResourceType, React.ReactNode> = {
  file: <FileIcon sx={{ fontSize: 10 }} />,
  lib:  <LibIcon  sx={{ fontSize: 10 }} />,
  net:  <NetIcon  sx={{ fontSize: 10 }} />,
  reg:  <RegIcon  sx={{ fontSize: 10 }} />,
  mem:  <RegIcon  sx={{ fontSize: 10 }} />,
};

// ── 단일 노드 렌더 ────────────────────────────────────────────────────────────
const NodeCard: React.FC<{ node: ProcessNode }> = ({ node }) => {
  const c = C[node.status];
  const isDetected = node.status === 'detected';
  return (
    <Box
      sx={{
        position: 'absolute', left: node.x, top: node.y,
        width: node.w, height: node.h,
        bgcolor: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: '4px',
        px: 1, py: 0.75,
        boxSizing: 'border-box',
        cursor: 'pointer',
        '&:hover': { filter: 'brightness(1.2)' },
        transition: 'filter 0.15s',
      }}
    >
      {/* 상태 레이블 */}
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.3 }}>
        {isDetected && <WarningIcon sx={{ fontSize: 11, color: c.label }} />}
        <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: c.label, letterSpacing: '0.05em', lineHeight: 1 }}>
          {node.label}
        </Typography>
      </Stack>
      {/* 프로세스 이름 */}
      <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: C.text, lineHeight: 1.2, mb: 0.3 }}>
        {node.name}
      </Typography>
      {/* PID / User 또는 decoded */}
      {node.decoded ? (
        <Typography sx={{ fontSize: '0.62rem', color: C.textSub, lineHeight: 1.2, mb: 0.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.decoded}
        </Typography>
      ) : (
        <Typography sx={{ fontSize: '0.65rem', color: C.textSub, lineHeight: 1.3, mb: 0.4 }}>
          PID: {node.pid} | User: {node.user}
        </Typography>
      )}
      {/* 리소스 카운터 */}
      <Stack direction="row" spacing={1}>
        {node.resources.map((r, i) => (
          <Stack key={i} direction="row" alignItems="center" spacing={0.25}
            sx={{ color: C.textSub, fontSize: '0.62rem' }}>
            {ResIcon[r.type]}
            <Typography sx={{ fontSize: '0.62rem', color: C.textSub }}>{r.count}</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
};

// ── SVG 커넥터 라인 ───────────────────────────────────────────────────────────
const EdgeLines: React.FC = () => (
  <svg
    style={{ position: 'absolute', top: 0, left: 0, width: CANVAS_W, height: CANVAS_H, pointerEvents: 'none' }}
  >
    {EDGES.map((edge) => {
      const src = NODES[edge.from];
      const dst = NODES[edge.to];
      if (!src || !dst) return null;
      const x1 = src.x + src.w;
      const y1 = src.y + src.h / 2;
      const x2 = dst.x;
      const y2 = dst.y + dst.h / 2;
      const mx = (x1 + x2) / 2;
      const color = edge.threat ? C.edgeThreat : C.edgeNormal;
      const lx = mx;
      const ly = (y1 + y2) / 2 - 6;
      return (
        <g key={`${edge.from}-${edge.to}`}>
          <path
            d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
            fill="none" stroke={color} strokeWidth={1.5}
            strokeDasharray={edge.threat ? '5,3' : undefined}
            opacity={0.8}
          />
          {edge.label && (
            <text x={lx} y={ly} fill={C.edgeLabel} fontSize={10} textAnchor="middle" fontFamily="monospace">
              {edge.label}
            </text>
          )}
        </g>
      );
    })}
  </svg>
);

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
const ScenarioProcessTreeTab: React.FC = () => {
  const { t } = useTranslation();
  const [scenario, setScenario] = useState('apt-2026-001');
  const [zoom, setZoom] = useState(1);

  return (
    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* 헤더 */}
      <Box sx={{ px: 3, pt: 2.5, pb: 1.5, flexShrink: 0 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <ProcessTreeIcon color="primary" />
          <Typography variant="h5" fontWeight={600}>{t('processTree')}</Typography>
          <Chip label={t('heartbeatBeta')} size="small" variant="outlined" color="warning" icon={<ConstructionIcon />} />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {t('processTreeDesc')}
        </Typography>
      </Box>
      <Divider />

      {/* 툴바 */}
      <Box sx={{ px: 2, py: 1, flexShrink: 0, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Select value={scenario} onChange={(e) => setScenario(e.target.value)} size="small" sx={{ minWidth: 200 }}>
            <MenuItem value="apt-2026-001">APT-2026-001 · PowerShell Lateral Move</MenuItem>
            <MenuItem value="apt-2026-002">APT-2026-002 · LSASS Credential Dump</MenuItem>
            <MenuItem value="apt-2026-003">APT-2026-003 · Registry Persistence</MenuItem>
          </Select>
          <TextField
            size="small" placeholder={t('search')}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            sx={{ width: 200 }}
            disabled
          />
          <Box sx={{ flexGrow: 1 }} />
          {/* 줌 컨트롤 */}
          <Stack direction="row" alignItems="center">
            <Tooltip title="축소">
              <IconButton size="small" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}>
                <ZoomOutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Typography variant="caption" sx={{ minWidth: 40, textAlign: 'center' }}>
              {Math.round(zoom * 100)}%
            </Typography>
            <Tooltip title="확대">
              <IconButton size="small" onClick={() => setZoom(z => Math.min(2, z + 0.1))}>
                <ZoomInIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="전체화면 맞춤">
              <IconButton size="small" onClick={() => setZoom(1)}>
                <FitIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>

      {/* 캔버스 */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', bgcolor: C.canvas, p: 2 }}>
        <Box
          sx={{
            position: 'relative',
            width: CANVAS_W,
            height: CANVAS_H,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
          }}
        >
          <EdgeLines />
          {Object.values(NODES).map((node) => (
            <NodeCard key={node.id} node={node} />
          ))}
        </Box>
      </Box>

      {/* 범례 */}
      <Box sx={{ px: 3, py: 1.5, borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Stack direction="row" spacing={3} alignItems="center">
          <Typography variant="caption" color="text.disabled">범례</Typography>
          {([
            { status: 'running',    label: 'RUNNING' },
            { status: 'terminated', label: 'TERMINATED' },
            { status: 'child',      label: 'CHILD' },
            { status: 'detected',   label: 'DETECTED (위협)' },
          ] as { status: NodeStatus; label: string }[]).map(({ status, label }) => (
            <Stack key={status} direction="row" alignItems="center" spacing={0.5}>
              <DotIcon sx={{ fontSize: 10, color: C[status].border }} />
              <Typography variant="caption" color="text.secondary">{label}</Typography>
            </Stack>
          ))}
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="caption" color="text.disabled">
            시나리오: {scenario.toUpperCase()} · 목업 데이터
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
};

export default ScenarioProcessTreeTab;
