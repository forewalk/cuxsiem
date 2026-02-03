# dashboard 기능 기획서 검토 결과

**검토일:** 2026-02-03
**검토자:** Gemini AI
**원본 기획서:** `1_dashboard_spec.md`
**상태:** 검토 완료

---

## 📋 검토 요약

### 전체 평가
제공된 SVG 디자인 리소스를 바탕으로 SIEM의 핵심 기능인 시각화 대시보드를 잘 정의했습니다. OpenSearch 데이터를 활용한 실시간 모니터링 구조가 핵심이며, MUI를 활용한 반응형 레이아웃 설계가 적절합니다.

### 주요 발견사항
- ✅ 잘 작성된 부분: SVG 기반의 명확한 화면 구성 요소 정의, 단계별 범위(Phase 1/2) 구분.
- ⚠️  개선 필요 부분: OpenSearch 쿼리 결과와 차트 데이터 간의 매핑 구조 구체화 필요.
- ❌ 누락된 부분: 각 위젯별 데이터 소스(Index) 정의 및 권한 제어 연동 계획.

---

## 1. 요구사항 완전성 검토

### 1.1 기능 요구사항 분석
**명확성:** 상단 컨트롤 바와 통계 차트의 역할이 명확함.
**완전성:** 기본적인 조회 기능은 충분하나, 위젯별로 어떤 인덱스(`cs_log_events` 등)를 참조할지에 대한 정의가 보완되어야 함.
**추가 필요 기능:** 
- 대시보드 레이아웃 저장 기능 (사용자별 커스텀 배치가 가능할 경우)
- 특정 기간 데이터 부재 시의 Empty State 처리

---

## 2. 기술적 실현 가능성 평가

### 2.1 현재 시스템과의 호환성
**기존 아키텍처:**
- FastAPI + OpenSearch 환경에서 `aggs` (Aggregation) 쿼리를 통해 막대 차트 데이터를 효율적으로 추출 가능.
- 기존 Repository -> Service 레이어 구조에 `DashboardRepository` 추가 필요.

**데이터베이스 (OpenSearch):**
- 스키마 변경 필요 사항 없음. 기존 로그 인덱스의 타임스탬프 필드를 활용.

**API 구조:**
- `GET /api/v1/dashboard/stats`: 차트용 집계 데이터 반환 엔드포인트 설계 권장.

---

## 5. 데이터 모델 검토

### 5.1 OpenSearch 쿼리 제안
```json
// 막대 차트용 시간별 로그 카운트 집계 예시
{
  "aggs": {
    "logs_over_time": {
      "date_histogram": {
        "field": "created_at",
        "fixed_interval": "1h"
      }
    }
  }
}
```

### 5.2 Pydantic 스키마 제안
```python
from pydantic import BaseModel
from datetime import datetime

class DashboardStatResponse(BaseModel):
    timestamp: datetime
    count: int
    severity: str | None = None
```

---

## 6. 명확화가 필요한 사항

### 6.1 질문 사항
1. **질문 1: 위젯 배치의 고정성**
   - 현재 기획서 내용: 반응형 그리드 적용
   - 명확화 필요 이유: 사용자가 위젯의 위치나 크기를 바꿀 수 있는 '대시보드 편집' 기능을 포함할 것인지 결정 필요.
   - 제안 사항: 초기 버전(Phase 1)에서는 고정된 레이아웃을 제공하고, Phase 2에서 편집 기능을 추가하는 것을 권장.

2. **질문 2: 데이터 갱신 방식**
   - 현재 기획서 내용: 자동 갱신
   - 명확화 필요 이유: WebSocket을 통한 실시간 푸시인지, 클라이언트 측의 Polling(예: 30초마다 요청)인지 정의 필요.
   - 제안 사항: 구현 단순성을 위해 초기에는 Polling 방식을 제안.

---

## 10. 검토 질문에 대한 답변

### 섹션 6.1의 질문들에 대한 답변

#### 질문 1: 위젯 배치의 고정성
**선택한 옵션:** 초기 버전 고정 레이아웃 (Fixed Layout)
**선택 이유:** 빠른 프로토타이핑과 SVG 디자인(bar_chart, control_bar) 구현에 집중하기 위함.

#### 질문 2: 데이터 갱신 방식
**선택한 옵션:** 클라이언트 Polling (30s/1m/Manual)
**선택 이유:** OpenSearch의 집계 쿼리 부하를 조절하기 용이하며, 일반적인 SIEM 대시보드 관행에 부합함.

---

## 12. 다음 단계

### 12.1 권장 액션
1. 위의 검토 내용을 바탕으로 `docs/workflows/dashboard/3_dashboard_spec_final.md`를 생성하세요.
2. 확정된 요구사항을 기반으로 `/create-dev-plan dashboard`를 실행하여 4단계로 진입하세요.

**검토 완료 일시:** 2026-02-03 15:45
**다음 단계:** `/finalize-spec dashboard` 명령 실행
