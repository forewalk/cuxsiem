import React from 'react';
import {
  Box, Typography, Paper, Stack, Chip, Divider, Button,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  ToggleButton, ToggleButtonGroup, Alert,
} from '@mui/material';
import {
  Code as SbomIcon,
  UploadFile as UploadIcon,
  Download as DownloadIcon,
  Tag as ChecksumIcon,
  ConstructionOutlined as ConstructionIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { useTranslation } from '../../../hooks/useTranslation';

// CycloneDX 1.6 필수 필드 기준 목업 컴포넌트 목록
const MOCK_COMPONENTS = [
  { name: 'fastapi', version: '0.115.0', type: 'library', purl: 'pkg:pypi/fastapi@0.115.0', license: 'MIT' },
  { name: 'uvicorn', version: '0.32.0', type: 'library', purl: 'pkg:pypi/uvicorn@0.32.0', license: 'BSD-3-Clause' },
  { name: 'opensearch-py', version: '2.7.0', type: 'library', purl: 'pkg:pypi/opensearch-py@2.7.0', license: 'Apache-2.0' },
  { name: 'pydantic-settings', version: '2.6.0', type: 'library', purl: 'pkg:pypi/pydantic-settings@2.6.0', license: 'MIT' },
  { name: 'pyotp', version: '2.8.0', type: 'library', purl: 'pkg:pypi/pyotp@2.8.0', license: 'MIT' },
  { name: 'cryptography', version: '41.0.0', type: 'library', purl: 'pkg:pypi/cryptography@41.0.0', license: 'Apache-2.0' },
];

// CycloneDX JSON 구조 미리보기 (필수 필드)
const CYCLONEDX_PREVIEW = `{
  "bomFormat": "CycloneDX",
  "specVersion": "1.6",
  "version": 1,
  "metadata": {
    "timestamp": "2026-03-15T00:00:00Z",
    "tools": [{ "name": "CruxSIEM BOM Generator", "version": "1.0" }],
    "component": { "type": "application", "name": "cruxsiem-backend" }
  },
  "components": [ ... ],
  "dependencies": [ ... ]
}`;

const SPDX_PREVIEW = `{
  "spdxVersion": "SPDX-2.3",
  "dataLicense": "CC0-1.0",
  "SPDXID": "SPDXRef-DOCUMENT",
  "name": "cruxsiem-backend",
  "documentNamespace": "https://cruxsiem/sbom/...",
  "packages": [ ... ],
  "relationships": [ ... ]
}`;

const SbomTab: React.FC = () => {
  const { t } = useTranslation();
  const [format, setFormat] = React.useState<'cyclonedx' | 'spdx'>('cyclonedx');

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto', height: '100%', p: 3 }}>
      {/* 헤더 */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
        <SbomIcon color="primary" />
        <Typography variant="h5" fontWeight={600}>SBOM</Typography>
        <Typography variant="h5" fontWeight={400} color="text.secondary">
          Software Bill of Materials
        </Typography>
        <Chip label={t('heartbeatBeta')} size="small" variant="outlined" color="warning" icon={<ConstructionIcon />} />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        소프트웨어 구성 요소를 표준 형식(CycloneDX·SPDX)으로 출력하여 공급망 보안 및 취약점 관리에 활용합니다.
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Stack spacing={3}>

        {/* 1. 파일 업로드 */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
            패키지 파일 업로드
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            분석할 의존성 파일을 업로드하세요. 지원 형식: <code>requirements.txt</code>, <code>package.json</code>, <code>pom.xml</code>, <code>go.mod</code>
          </Typography>
          <Box
            sx={{
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              bgcolor: 'action.hover',
            }}
          >
            <UploadIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              파일을 드래그하거나 버튼으로 선택하세요
            </Typography>
            <Stack direction="row" spacing={1} justifyContent="center">
              <Button variant="outlined" startIcon={<UploadIcon />} disabled>
                requirements.txt
              </Button>
              <Button variant="outlined" startIcon={<UploadIcon />} disabled>
                package.json
              </Button>
            </Stack>
          </Box>
        </Paper>

        {/* 2. 출력 형식 및 미리보기 */}
        <Paper sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>출력 형식</Typography>
            <ToggleButtonGroup
              value={format}
              exclusive
              onChange={(_, v) => v && setFormat(v)}
              size="small"
            >
              <ToggleButton value="cyclonedx">CycloneDX 1.6</ToggleButton>
              <ToggleButton value="spdx">SPDX 2.3</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {format === 'cyclonedx' && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>CycloneDX 1.6</strong> 필수 필드: bomFormat · specVersion · version · metadata · components · dependencies
            </Alert>
          )}
          {format === 'spdx' && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>SPDX 2.3</strong> 필수 필드: spdxVersion · dataLicense · SPDXID · name · documentNamespace · packages · relationships
            </Alert>
          )}

          <Box
            component="pre"
            sx={{
              bgcolor: 'action.hover',
              borderRadius: 1,
              p: 2,
              fontSize: '0.78rem',
              fontFamily: 'monospace',
              overflowX: 'auto',
              color: 'text.secondary',
              m: 0,
            }}
          >
            {format === 'cyclonedx' ? CYCLONEDX_PREVIEW : SPDX_PREVIEW}
          </Box>
        </Paper>

        {/* 3. 컴포넌트 목록 (목업) */}
        <Paper sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight={600}>컴포넌트 목록</Typography>
              <Typography variant="caption" color="text.secondary">
                {MOCK_COMPONENTS.length}개 컴포넌트 (목업 데이터)
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" size="small" startIcon={<ChecksumIcon />} disabled>
                MD5 체크섬
              </Button>
              <Button variant="contained" size="small" startIcon={<DownloadIcon />} disabled>
                JSON 다운로드
              </Button>
            </Stack>
          </Stack>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Version</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>License</TableCell>
                  <TableCell>PURL</TableCell>
                  <TableCell align="center">취약점</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {MOCK_COMPONENTS.map((c) => (
                  <TableRow key={c.purl} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{c.name}</TableCell>
                    <TableCell>{c.version}</TableCell>
                    <TableCell><Chip label={c.type} size="small" variant="outlined" /></TableCell>
                    <TableCell>{c.license}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary' }}>{c.purl}</TableCell>
                    <TableCell align="center">
                      <CheckIcon fontSize="small" color="success" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

      </Stack>
    </Box>
  );
};

export default SbomTab;
