# 알림 규칙 관리 (Notification Rule Management) 기술 문서

## 📝 개요
이 문서는 알림 규칙의 생명주기(Lifecycle)와 프론트엔드/백엔드 구현 상세를 다룹니다.

## 🏗 구현 상세

### 1. 규칙 객체 구조
```typescript
interface NotificationRule {
  id: string;
  name: string;
  condition_config: { query: any }; // OpenSearch DSL
  interval_min: number;            # 실행 주기
  window_min: number;              # 탐지 범위
  channels: {                      # 발송 채널
    webhooks: WebhookConfig[];
    slack: SlackConfig[];
  };
  is_active: boolean;              # 활성화 여부
}
```

### 2. 주요 기능
- **Dynamic Channel Management**: 사용자가 UI에서 Webhook이나 Slack 채널을 원하는 만큼 추가하고 삭제할 수 있는 동적 폼 관리 로직 구현.
- **Query Validation**: 규칙 저장 전 DSL 쿼리의 구문 오류를 프론트엔드 레벨에서 1차 검증.
- **CRUD Operations**: `FastAPI` 엔드포인트를 통한 `OpenSearch` 데이터 싱크.

## 🔗 관련 문서
- [알림 센터 통합 기술 문서](../notification/9_notification_technical_doc.md): 탐지 엔진 및 발송 로직에 대한 상세 정보 포함.

---
**최종 업데이트:** 2026-02-12
