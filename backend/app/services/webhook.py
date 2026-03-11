import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional

import httpx

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT = 10


async def send_webhook(
    url: str,
    payload: Dict[str, Any],
    headers: Optional[Dict[str, str]] = None,
    timeout: int = DEFAULT_TIMEOUT,
) -> Dict[str, Any]:
    """
    Webhook URL로 JSON POST 요청을 보내고 결과를 반환한다.
    반환: {"status", "url", "status_code", "sent_at", "error"}
    """
    result: Dict[str, Any] = {
        "status": "failure",
        "sent_at": datetime.utcnow().isoformat(),
        "url": url,
        "status_code": None,
        "error": None,
    }

    if not url:
        result["status"] = "skipped"
        result["error"] = "Webhook URL 미설정"
        return result

    request_headers = {"Content-Type": "application/json"}
    if headers:
        request_headers.update(headers)

    try:
        async with httpx.AsyncClient(timeout=timeout, verify=False) as client:
            response = await client.post(url, json=payload, headers=request_headers)
            result["status_code"] = response.status_code

            if 200 <= response.status_code < 300:
                result["status"] = "success"
            else:
                result["status"] = "failure"
                result["error"] = f"HTTP {response.status_code}: {response.text[:200]}"

    except httpx.ConnectError as e:
        result["status"] = "failure"
        result["error"] = f"연결 거부: {e}"
        logger.error(f"[Webhook] 연결 거부 ({url}): {e}")

    except httpx.TimeoutException as e:
        result["status"] = "failure"
        result["error"] = f"요청 타임아웃 ({timeout}s): {e}"
        logger.error(f"[Webhook] 타임아웃 ({url}): {e}")

    except httpx.HTTPStatusError as e:
        result["status"] = "failure"
        result["status_code"] = e.response.status_code
        result["error"] = f"HTTP {e.response.status_code}: {e.response.text[:200]}"
        logger.error(f"[Webhook] HTTP 오류 ({url}): {e}")

    except Exception as e:
        result["status"] = "failure"
        result["error"] = f"{type(e).__name__}: {e}"
        logger.error(f"[Webhook] 예기치 않은 오류 ({url}): {e}")

    return result


async def send_test_webhook(url: str, headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    """Webhook 연결 테스트용 요청"""
    test_payload = {
        "type": "test",
        "message": "CruxSIEM Webhook 연결 테스트",
        "timestamp": datetime.utcnow().isoformat(),
    }
    return await send_webhook(url, test_payload, headers)
