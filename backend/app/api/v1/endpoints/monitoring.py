"""모니터링 API 엔드포인트 — Heartbeat 데이터 스트림 조회"""
from fastapi import APIRouter, Depends
from typing import List, Optional
from pydantic import BaseModel
from app.core.opensearch import get_opensearch
from app.api.v1.deps import get_current_active_user
from app.schemas.user import UserResponse

router = APIRouter(prefix="/monitoring", tags=["monitoring"])

HEARTBEAT_INDEX = "heartbeat"


class HeartbeatMonitor(BaseModel):
    id: str
    name: str
    type: str                       # 'http' | 'tcp'
    scheme: Optional[str] = None   # 'http' | 'https' | 'tcp'
    status: str                     # 'up' | 'down'
    url: str
    domain: Optional[str] = None
    port: Optional[int] = None
    duration_us: Optional[int] = None   # monitor.duration.us (전체 소요)
    tcp_rtt_us: Optional[int] = None    # tcp.rtt.connect.us (TCP connect RTT)
    http_rtt_us: Optional[int] = None   # http.rtt.total.us (HTTP 전체 RTT)
    timestamp: str
    # 단기 가용성 (현재 레코드의 state 기반)
    state_checks: Optional[int] = None  # state.checks
    state_up: Optional[int] = None      # state.up
    state_down: Optional[int] = None    # state.down
    # HTTP
    http_status_code: Optional[int] = None
    # TLS / SSL 인증서
    tls_established: Optional[bool] = None
    cert_not_after: Optional[str] = None
    cert_not_before: Optional[str] = None
    cert_subject: Optional[str] = None
    cert_cipher: Optional[str] = None
    cert_tls_version: Optional[str] = None


def _parse_hit(src: dict) -> HeartbeatMonitor:
    monitor = src.get("monitor", {})
    url = src.get("url", {})
    http = src.get("http", {})
    tcp = src.get("tcp", {})
    tls = src.get("tls", {})
    state = src.get("state", {})
    x509 = tls.get("server", {}).get("x509", {})

    http_status = http.get("response", {}).get("status_code")
    http_rtt = http.get("rtt", {}).get("total", {}).get("us")
    tcp_rtt = tcp.get("rtt", {}).get("connect", {}).get("us")
    subject = x509.get("subject")
    cert_subject = subject.get("common_name") if isinstance(subject, dict) else None

    return HeartbeatMonitor(
        id=monitor.get("id", ""),
        name=monitor.get("name", ""),
        type=monitor.get("type", ""),
        scheme=url.get("scheme"),
        status=monitor.get("status", ""),
        url=url.get("full", ""),
        domain=url.get("domain"),
        port=url.get("port"),
        duration_us=monitor.get("duration", {}).get("us"),
        tcp_rtt_us=tcp_rtt,
        http_rtt_us=http_rtt,
        timestamp=src.get("@timestamp", ""),
        state_checks=state.get("checks"),
        state_up=state.get("up"),
        state_down=state.get("down"),
        http_status_code=http_status if http_status is not None else None,
        tls_established=tls.get("established"),
        cert_not_after=tls.get("certificate_not_valid_after"),
        cert_not_before=tls.get("certificate_not_valid_before"),
        cert_subject=cert_subject,
        cert_cipher=tls.get("cipher"),
        cert_tls_version=tls.get("version"),
    )


@router.get("/heartbeat", response_model=List[HeartbeatMonitor])
async def get_heartbeat(
    current_user: UserResponse = Depends(get_current_active_user),
    os_client=Depends(get_opensearch),
):
    """
    Heartbeat 데이터 스트림에서 monitor.id별 최신 상태를 반환합니다.
    collapse + sort로 각 모니터의 가장 최근 레코드만 가져옵니다.
    """
    body = {
        "query": {"match_all": {}},
        "collapse": {"field": "monitor.id"},
        "sort": [{"@timestamp": {"order": "desc"}}],
        "size": 200,
        "_source": [
            "@timestamp",
            "monitor",
            "url",
            "state.checks",
            "state.up",
            "state.down",
            "http.response.status_code",
            "http.rtt.total",
            "tcp.rtt.connect",
            "tls.established",
            "tls.certificate_not_valid_after",
            "tls.certificate_not_valid_before",
            "tls.cipher",
            "tls.version",
            "tls.server.x509.subject",
        ],
    }

    response = os_client.search(index=HEARTBEAT_INDEX, body=body)
    hits = response.get("hits", {}).get("hits", [])
    return [_parse_hit(hit["_source"]) for hit in hits]
