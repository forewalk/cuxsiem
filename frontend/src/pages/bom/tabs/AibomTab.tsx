import React from 'react';
import {
  Box, Typography, Paper, Stack, Chip, Divider, Button,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  Alert, List, ListItem, ListItemIcon, ListItemText,
} from '@mui/material';
import {
  SmartToy as AibomIcon,
  Download as DownloadIcon,
  Tag as ChecksumIcon,
  ConstructionOutlined as ConstructionIcon,
  Storage as DatasetIcon,
  Psychology as ModelIcon,
  AccountTree as DependencyIcon,
  VerifiedUser as ComplianceIcon,
  LightbulbOutlined as IdeaIcon,
} from '@mui/icons-material';
import { useTranslation } from '../../../hooks/useTranslation';

// 목업: AI 모델 정보
const MOCK_MODELS = [
  { name: 'claude-sonnet-4-6', provider: 'Anthropic', version: '4.6', framework: 'API', license: 'Commercial', purpose: '로그 분석·요약' },
  { name: 'text-embedding-3-small', provider: 'OpenAI', version: '3-small', framework: 'API', license: 'Commercial', purpose: '벡터 임베딩' },
];

// 목업: 학습 데이터셋
const MOCK_DATASETS = [
  { name: 'CVE Database', source: 'NVD / MITRE', license: 'Public Domain', size: '~500K records', usage: '취약점 참조' },
  { name: 'MITRE ATT&CK', source: 'MITRE', license: 'CC BY 4.0', size: '~1K techniques', usage: '전술·기법 분류' },
];

// 목업: AI 프레임워크 의존성
const MOCK_AI_DEPS = [
  { name: 'anthropic', version: '0.51.0', purl: 'pkg:pypi/anthropic@0.51.0', license: 'MIT' },
  { name: 'openai', version: '1.68.2', purl: 'pkg:pypi/openai@1.68.2', license: 'Apache-2.0' },
  { name: 'sentence-transformers', version: '3.4.1', purl: 'pkg:pypi/sentence-transformers@3.4.1', license: 'Apache-2.0' },
];

const AIBOM_PREVIEW = `{
  "bomFormat": "CycloneDX",
  "specVersion": "1.6",
  "metadata": {
    "component": { "type": "application", "name": "cruxsiem-ai" }
  },
  "components": [
    {
      "type": "ml-model",
      "name": "claude-sonnet-4-6",
      "version": "4.6",
      "supplier": { "name": "Anthropic" },
      "modelCard": {
        "modelParameters": { "task": "log-analysis" },
        "considerations": { "bias": "...", "limitations": "..." }
      }
    }
  ],
  "externalReferences": [
    { "type": "documentation", "url": "https://www.anthropic.com/model-card" },
    { "type": "dataset", "comment": "MITRE ATT&CK v15" }
  ]
}`;

const AibomTab: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto', height: '100%', p: 3 }}>
      {/* 헤더 */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
        <AibomIcon color="primary" />
        <Typography variant="h5" fontWeight={600}>AIBOM</Typography>
        <Typography variant="h5" fontWeight={400} color="text.secondary">
          AI Bill of Materials
        </Typography>
        <Chip label={t('heartbeatBeta')} size="small" variant="outlined" color="warning" icon={<ConstructionIcon />} />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        AI/ML 시스템에 사용된 모델·데이터셋·프레임워크를 CycloneDX 1.6 AI 확장 스펙으로 문서화합니다.
        CISA AI 투명성 권고 및 EU AI Act 공급망 추적 요건을 충족합니다.
      </Typography>
      <Alert severity="info" sx={{ mb: 3 }} icon={<IdeaIcon />}>
        <strong>AIBOM 표준 참조:</strong> CycloneDX 1.6 ml-model 타입 · CISA AI BOM 가이드라인 · NTIA SBOM 프레임워크 확장
      </Alert>

      <Divider sx={{ mb: 3 }} />

      <Stack spacing={3}>

        {/* 1. AI 모델 정보 */}
        <Paper sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <ModelIcon color="action" fontSize="small" />
            <Typography variant="h6" fontWeight={600}>AI 모델 정보</Typography>
          </Stack>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>모델명</TableCell>
                  <TableCell>제공사</TableCell>
                  <TableCell>버전</TableCell>
                  <TableCell>프레임워크</TableCell>
                  <TableCell>라이선스</TableCell>
                  <TableCell>용도</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {MOCK_MODELS.map((m) => (
                  <TableRow key={m.name} hover>
                    <TableCell sx={{ fontWeight: 500, fontFamily: 'monospace' }}>{m.name}</TableCell>
                    <TableCell>{m.provider}</TableCell>
                    <TableCell>{m.version}</TableCell>
                    <TableCell><Chip label={m.framework} size="small" variant="outlined" /></TableCell>
                    <TableCell>{m.license}</TableCell>
                    <TableCell>{m.purpose}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* 2. 학습 데이터셋 */}
        <Paper sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <DatasetIcon color="action" fontSize="small" />
            <Typography variant="h6" fontWeight={600}>참조 데이터셋</Typography>
          </Stack>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>데이터셋</TableCell>
                  <TableCell>출처</TableCell>
                  <TableCell>라이선스</TableCell>
                  <TableCell>규모</TableCell>
                  <TableCell>활용 목적</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {MOCK_DATASETS.map((d) => (
                  <TableRow key={d.name} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{d.name}</TableCell>
                    <TableCell>{d.source}</TableCell>
                    <TableCell>{d.license}</TableCell>
                    <TableCell>{d.size}</TableCell>
                    <TableCell>{d.usage}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* 3. AI 프레임워크 의존성 */}
        <Paper sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <DependencyIcon color="action" fontSize="small" />
            <Typography variant="h6" fontWeight={600}>AI 프레임워크 의존성</Typography>
          </Stack>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Version</TableCell>
                  <TableCell>PURL</TableCell>
                  <TableCell>License</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {MOCK_AI_DEPS.map((d) => (
                  <TableRow key={d.purl} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{d.name}</TableCell>
                    <TableCell>{d.version}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary' }}>{d.purl}</TableCell>
                    <TableCell>{d.license}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* 4. CycloneDX AIBOM 출력 미리보기 */}
        <Paper sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight={600}>CycloneDX 1.6 AIBOM 출력 구조</Typography>
              <Typography variant="caption" color="text.secondary">ml-model 타입 + modelCard 확장 필드</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" size="small" startIcon={<ChecksumIcon />} disabled>MD5 체크섬</Button>
              <Button variant="contained" size="small" startIcon={<DownloadIcon />} disabled>JSON 다운로드</Button>
            </Stack>
          </Stack>
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
            {AIBOM_PREVIEW}
          </Box>
        </Paper>

        {/* 5. 향후 기획 아이디어 */}
        <Paper sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <ComplianceIcon color="action" fontSize="small" />
            <Typography variant="h6" fontWeight={600}>향후 구현 계획</Typography>
          </Stack>
          <List dense>
            {[
              'AI 모델 카드 자동 생성 (편향·공정성·한계 기술)',
              '모델 버전별 변경 이력 추적 (Model Lineage)',
              '파인튜닝 데이터셋 출처 및 라이선스 검증',
              'EU AI Act 위험 등급 자동 분류 (minimal / limited / high / unacceptable)',
              'NIST AI RMF 매핑 및 컴플라이언스 체크리스트',
              'OpenSSF Model Transparency 연동',
              '취약한 AI 라이브러리 CVE 자동 탐지',
            ].map((item) => (
              <ListItem key={item} sx={{ py: 0.25 }}>
                <ListItemIcon sx={{ minWidth: 28 }}>
                  <IdeaIcon fontSize="small" color="warning" />
                </ListItemIcon>
                <ListItemText primary={item} primaryTypographyProps={{ variant: 'body2' }} />
              </ListItem>
            ))}
          </List>
        </Paper>

      </Stack>
    </Box>
  );
};

export default AibomTab;
