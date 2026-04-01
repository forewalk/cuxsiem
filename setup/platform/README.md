# setup/platform/

모니터링 및 관리 도구 Docker Compose 설정 가이드.
OpenSearch Dashboards, Kafbat, Heartbeat를 단일 Compose로 운영.

---

## 포함 서비스

| 서비스 | 이미지 | 포트 | 역할 |
|--------|--------|------|------|
| opensearch-dashboards | opensearchproject/opensearch-dashboards:3.5.0 | 5601 | OpenSearch 시각화 |
| kafbat | kafbat/kafka-ui:ec46dff | 8080 | Kafka 토픽·컨슈머 모니터링 |
| heartbeat | docker.elastic.co/beats/heartbeat:8.13.0 | — | 서비스 상태 주기적 체크 |

> 실제 docker-compose.yml: `setup/OPA/platform/docker-compose.yml`

---

## 시작·중지

```bash
cd setup/OPA/platform

# 시작
docker compose up -d

# 중지
docker compose down

# 로그 확인
docker compose logs -f
```

---

## OpenSearch Dashboards 설정

```yaml
OPENSEARCH_HOSTS: https://opensearch:9200
OPENSEARCH_USERNAME: admin
OPENSEARCH_PASSWORD: <비밀번호>
OPENSEARCH_SSL_VERIFICATIONMODE: certificate
SERVER_SSL_ENABLED: "true"
OPENSEARCH_DASHBOARDS_MULTITENANCY_ENABLED: "true"
```

- 접속: `https://<WEBUI_IP>:5601`
- 인증서 경로: `setup/OPA/platform/opensearch-dashboard/certs/`

---

## Kafbat (Kafka UI) 설정

```yaml
KAFKA_CLUSTERS_0_NAME: cruxsiem-kafka
KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: pipeline:9092
DYNAMIC_CONFIG_ENABLED: "true"
```

- 접속: `http://<WEBUI_IP>:8080`

---

## Heartbeat 모니터링 대상

```yaml
# heartbeat.yml
monitors:
  - type: http
    id: cruxsiem-webui
    urls: ["https://<WEBUI_IP>:443"]
    schedule: "@every 60s"

  - type: http
    id: opensearch-dashboards
    urls: ["https://<WEBUI_IP>:5601"]
    schedule: "@every 60s"

  - type: http
    id: kafbat
    urls: ["http://<WEBUI_IP>:8080"]
    schedule: "@every 60s"

  - type: tcp
    id: opensearch
    hosts: ["<OPENSEARCH_IP>:9200"]
    schedule: "@every 60s"

  - type: tcp
    id: kafka
    hosts: ["<KAFKA_IP>:9092"]
    schedule: "@every 60s"
```

**출력**: Kafka 토픽 `heartbeat` → Vector → OpenSearch `heartbeat` 인덱스

> 실제 설정 파일: `setup/OPA/platform/heartbeat/heartbeat.yml`

---

## 네트워크 설정

Docker 내부 네트워크: `platform-net` (bridge)

외부 호스트 접근을 위해 `/etc/hosts` 또는 DNS에 아래 항목 추가:

```
<OPENSEARCH_IP>   opensearch  sentinel
<KAFKA_IP>        pipeline
<WEBUI_IP>        webui
```

---

## 인증서 배치 위치

```
setup/OPA/platform/
├── opensearch-dashboard/certs/    # Dashboards SSL 인증서
└── kafbat/certs/                  # Kafbat SSL 인증서 (필요 시)
```

> CA 인증서는 `setup/OPA/kafka/certs/ca.crt` 공유 사용

