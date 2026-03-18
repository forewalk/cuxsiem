# Detector 생성 폼 기획서

**작성일:** 2026-03-18
**버전:** 1.0
**상태:** 초안

---

## 1. 개요

### 1.1 목적
Detector 생성 시 로그 타입을 선택하고, 해당 로그 타입에 속하는 탐지 규칙을 필터/선택하여 연결하는 워크플로우를 제공한다.

### 1.2 범위
**포함:**
- Detector 생성 폼 UI 재설계
- 로그 타입 그룹 드롭다운 (복수 선택)
- 규칙 필터링 (검색, 심각도, Source)
- 규칙 테이블 (활성화 토글, 규칙명, 심각도, 로그타입, Source, 설명)

**제외:**
- 백엔드 API 변경 (기존 API 활용)
- 스케줄러/탐지 엔진 로직

---

## 2. 로그 타입 분류 체계

### 2.1 그룹 및 항목

| 그룹 | 로그 타입 |
|------|-----------|
| Access Management | AD/LDAP, Apache Access, Okta |
| Applications | Github, Google Workspace, Microsoft 365 |
| Cloud Services | AWS Cloudtrail, AWS S3, Microsoft Azure |
| Network Activity | DNS, Network, VPC Flow |
| Security | WAF |
| System Activity | Linux System Logs, Microsoft Windows |

- 복수 선택 가능
- 선택된 로그 타입은 Chip으로 표시

---

## 3. UI 구조

### 3.1 Detector 생성 폼 레이아웃

```
┌─────────────────────────────────────────────────┐
│ [헤더] Detector 생성            [취소] [저장]    │
├─────────────────────────────────────────────────┤
│                                                  │
│ ── 기본 정보 ──                                  │
│ [Detector 이름]       [설명 (multiline)]         │
│                                                  │
│ ── 로그 타입 선택 ──                             │
│ [Log Type ▼ (복수선택, 그룹 헤더 포함)]          │
│ 선택됨: [DNS ×] [Network ×] [Linux System ×]    │
│                                                  │
│ ── 탐지 규칙 선택 ──                             │
│ [🔍 검색] [심각도 ▼] [Source ▼ (Standard/Custom)]│
│ ┌───┬──────────────┬────────┬────────┬──────┬───┐│
│ │ ⚡│ 규칙명        │ 심각도 │ 로그타입│Source│설명││
│ ├───┼──────────────┼────────┼────────┼──────┼───┤│
│ │ 🔘│ DNS Query... │ Medium │ DNS    │Sigma │...││
│ │ 🔘│ Network...   │ High   │Network │Custom│...││
│ └───┴──────────────┴────────┴────────┴──────┴───┘│
│                                                  │
│ ── 스케줄 ──                                     │
│ [실행 주기(분)]                                   │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 3.2 규칙 테이블 컬럼

| 컬럼 | 설명 | 너비 |
|------|------|------|
| 활성화 토글 | 해당 규칙을 Detector에 연결할지 on/off | 고정 50px |
| 규칙명 | 규칙 이름 (ellipsis) | flex |
| 심각도 | SeverityChip 표시 | 80px |
| 로그 타입 | log_source_category or product | 100px |
| Source | Standard(Sigma) / Custom | 80px |
| 설명 | 규칙 설명 (ellipsis) | flex |

### 3.3 필터 동작

- **로그 타입 선택** → 해당 로그 타입의 규칙만 테이블에 표시
- **검색** → 규칙명/설명에서 텍스트 검색
- **심각도 드롭다운** → critical/high/medium/low/info 필터
- **Source 드롭다운** → Standard(type=sigma) / Custom(type=custom) 필터

### 3.4 규칙 ↔ 로그 타입 매핑

규칙의 `log_source_category`, `log_source_product`, `log_source_service` 필드를 기반으로 로그 타입 매핑:

| 로그 타입 | 매핑 기준 (product / category / service) |
|-----------|------------------------------------------|
| AD/LDAP | product: windows, category: authentication |
| Apache Access | product: apache |
| Okta | product: okta |
| Github | product: github |
| Google Workspace | product: google_workspace |
| Microsoft 365 | product: m365 |
| AWS Cloudtrail | product: cloudtrail |
| AWS S3 | product: s3 |
| Microsoft Azure | product: azure |
| DNS | category: dns |
| Network | category: network, proxy |
| VPC Flow | product: vpcflow |
| WAF | product: waf |
| Linux System Logs | product: linux |
| Microsoft Windows | product: windows |

---

## 4. 데이터 흐름

### 4.1 저장 시 생성되는 Detector 데이터

```json
{
  "name": "사용자 입력",
  "description": "사용자 입력",
  "detector_type": "선택된 로그타입 중 첫번째 or 'multi'",
  "target_indices": ["logs-*"],
  "linked_rule_ids": ["토글 ON된 규칙 ID 목록"],
  "schedule_interval_min": 5,
  "severity": "연결된 규칙 중 최고 심각도 자동 설정",
  "is_active": true
}
```

---

## 5. 구현 계획

### Phase 1: 로그 타입 상수 및 매핑 유틸
- 로그 타입 그룹/항목 상수 정의
- 규칙 → 로그 타입 매핑 함수

### Phase 2: DetectorForm 재설계
- 기본 정보 (이름, 설명)
- 로그 타입 멀티셀렉트 드롭다운
- 규칙 테이블 + 필터
- 스케줄 설정

### Phase 3: 연동
- DetectionRuleTab에서 체크된 규칙 → DetectorForm 프리셋 유지
- 저장 시 linked_rule_ids 구성
