# 기획서: 솔루션 라이선스 관리 (Solution License Management)

## 1. 개요
솔루션의 무단 사용을 방지하고 구독 모델 및 계약 기간 관리를 위해 라이선스 관리 시스템을 도입합니다. Elasticsearch의 라이선스 관리 방식을 벤치마킹하여 JSON 파일 형태의 라이선스를 사용하며, 만료 시 핵심 기능(로그인 등) 사용을 제한합니다.

## 2. 라이선스 규격 (Elasticsearch 스타일)
`docs/workflows/license/wooribank-non_production-*.json` 파일을 참조하여 다음과 같은 필드를 포함합니다.

| 필드명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `uid` | String (UUID) | 라이선스 고유 식별자 |
| `type` | String | 라이선스 등급 (예: basic, gold, platinum, enterprise) |
| `issue_date_in_millis` | Long (Epoch) | 라이선스 발급 일시 |
| `start_date_in_millis` | Long (Epoch) | 라이선스 효력 시작 일시 |
| `expiry_date_in_millis` | Long (Epoch) | 라이선스 만료 일시 |
| `max_nodes` | Integer | 허용 가능한 최대 노드/에이전트 수 |
| `issued_to` | String | 라이선스 발급 대상 (고객사명) |
| `issuer` | String | 발급 주체 |
| `signature` | String (Base64) | 데이터 위변조 방지를 위한 디지털 서명 |

## 3. 핵심 기능 및 요구사항

### 3.1 라이선스 상태 검증 로직
- **시간 검증**: 현재 서버 시간이 `start_date_in_millis`와 `expiry_date_in_millis` 사이에 있는지 확인.
- **서명 검증**: (Phase 1) 서명 필드의 존재 여부 및 간단한 체크섬 확인. (Phase 2) 비대칭키(RSA/ECDSA)를 이용한 실제 서명 검증 도입.
- **주기적 검사**: 백엔드 스케줄러를 통해 1시간마다 또는 특정 이벤트 발생 시 라이선스 상태 갱신.

### 3.2 만료 시 제어 (License Enforcement)
- **로그인 차단**: 라이선스가 만료되었거나 유효하지 않은 경우, 로그인 시도 시 전용 에러 메시지 반환 및 진입 차단.
- **UI 경고**: 관리자 화면 상단에 라이선스 만료 임박(예: 30일 전) 또는 만료 상태 알림 배너 노출.
- **기능 제한**: 대시보드 및 로그 검색 기능을 읽기 전용으로 전환하거나 비활성화.

### 3.3 관리자 기능
- [고급 설정] 메뉴 내 라이선스 탭 추가.
- 라이선스 파일(.json) 업로드 기능.
- 현재 라이선스 상세 정보(발급처, 만료일 D-Day 등) 표시.

## 4. 구현 전략
- **Security First**: 라이선스 검증 로직은 백엔드 `AuthMiddleware` 및 `Repository` 레이어에서 중복 체크하여 우회를 방지합니다.
- **Fallback**: 라이선스 정보가 OpenSearch에 없는 경우 초기 설치 상태(Trial 또는 라이선스 없음)로 간주하여 업로드 페이지로 유도합니다.

## 5. 단계별 개발 계획
1.  **Phase 1**: JSON 라이선스 스키마 정의 및 기본적인 날짜 기반 만료 체크 로직 구현.
2.  **Phase 2**: 로그인 API 연동 및 만료 시 접근 제한 UI 구현.
3.  **Phase 3**: 디지털 서명 검증 로직 강화 및 `max_nodes` 연동.
