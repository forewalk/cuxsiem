#!/usr/bin/env python3
"""
Detection System Migration Script

기존 cs_detection_policies의 데이터를 새 모델로 마이그레이션합니다:
1. condition_config → cs_detection_rules에 type="custom" 룰로 복사
2. target_index + interval → cs_detection_policies에 Detector로 변환
3. 기존 cs_detection_rules에 type="sigma" 필드 추가 (누락 시)
4. cs_detection_events에 detector_id/detector_name 필드 추가

사용법:
    cd backend
    python scripts/migrate_detection_redesign.py
    python scripts/migrate_detection_redesign.py --dry-run
"""

import argparse
import json
import logging
import os
import sys
import uuid
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.opensearch import get_opensearch_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def migrate_sigma_rules_add_type(client, dry_run: bool):
    """기존 Sigma 룰에 type='sigma' 필드 추가 (누락된 문서만)"""
    logger.info("=== Step 1: cs_detection_rules에 type='sigma' 필드 추가 ===")

    try:
        result = client.search(
            index="cs_detection_rules",
            body={
                "size": 1000,
                "query": {
                    "bool": {
                        "must_not": [{"exists": {"field": "type"}}]
                    }
                },
                "_source": ["id", "name"],
            },
        )
    except Exception as e:
        logger.warning(f"cs_detection_rules 인덱스 조회 실패 (미존재?): {e}")
        return 0

    hits = result.get("hits", {}).get("hits", [])
    count = len(hits)
    logger.info(f"  type 필드 누락 문서: {count}건")

    if count == 0:
        return 0

    if dry_run:
        for hit in hits[:5]:
            logger.info(f"  [DRY-RUN] 업데이트 예정: {hit['_id']} - {hit['_source'].get('name', '')}")
        return count

    bulk_body = []
    for hit in hits:
        bulk_body.append({"update": {"_index": "cs_detection_rules", "_id": hit["_id"]}})
        bulk_body.append({"doc": {"type": "sigma"}})

    if bulk_body:
        resp = client.bulk(body=bulk_body, refresh=True)
        errors = sum(1 for item in resp.get("items", []) if item.get("update", {}).get("error"))
        logger.info(f"  완료: {count - errors}건 업데이트, {errors}건 실패")

    return count


def migrate_policies_to_detectors(client, dry_run: bool):
    """기존 DetectionPolicy → Custom Rule + Detector로 분리"""
    logger.info("=== Step 2: cs_detection_policies → Custom Rule + Detector 분리 ===")

    try:
        result = client.search(
            index="cs_detection_policies",
            body={
                "size": 1000,
                "query": {"match_all": {}},
            },
        )
    except Exception as e:
        logger.warning(f"cs_detection_policies 인덱스 조회 실패 (미존재?): {e}")
        return 0, 0

    hits = result.get("hits", {}).get("hits", [])
    logger.info(f"  기존 정책 수: {len(hits)}건")

    rules_created = 0
    detectors_updated = 0
    now = datetime.utcnow().isoformat()

    for hit in hits:
        policy = hit["_source"]
        policy_id = hit["_id"]
        policy_name = policy.get("name", "Unknown")

        condition_config = policy.get("condition_config")
        if condition_config:
            rule_id = str(uuid.uuid4())
            custom_rule = {
                "id": rule_id,
                "type": "custom",
                "name": f"[Migrated] {policy_name}",
                "description": policy.get("description"),
                "level_original": policy.get("severity", "medium"),
                "level_normalized": policy.get("severity", "medium"),
                "detection_config": condition_config,
                "log_source_category": None,
                "log_source_product": None,
                "log_source_service": None,
                "mitre_technique_ids": policy.get("mitre_technique_ids", []),
                "mitre_tactic_ids": policy.get("mitre_tactic_ids", []),
                "false_positives": [],
                "tags": [],
                "references": [],
                "status": "active",
                "is_deleted": False,
                "created_at": policy.get("created_at", now),
                "updated_at": now,
            }

            if dry_run:
                logger.info(f"  [DRY-RUN] Custom Rule 생성: '{custom_rule['name']}' (from policy '{policy_name}')")
            else:
                try:
                    client.index(index="cs_detection_rules", id=rule_id, body=custom_rule, refresh=True)
                    logger.info(f"  Custom Rule 생성: '{custom_rule['name']}' ({rule_id})")
                except Exception as e:
                    logger.error(f"  Custom Rule 생성 실패: {e}")
                    rule_id = None
            rules_created += 1
        else:
            rule_id = None

        target_index = policy.get("target_index", "logs-*")
        linked_rule_ids = policy.get("linked_rule_ids", [])
        if rule_id:
            linked_rule_ids.append(rule_id)

        detector_update = {
            "detector_type": "custom",
            "target_indices": [target_index] if isinstance(target_index, str) else target_index,
            "linked_rule_ids": linked_rule_ids,
            "field_mappings": [],
            "schedule_interval_min": policy.get("interval_min", 5),
            "total_findings_count": policy.get("total_events_count", 0),
            "updated_at": now,
        }

        if dry_run:
            logger.info(f"  [DRY-RUN] Detector 업데이트: '{policy_name}' ({policy_id})")
        else:
            try:
                existing = client.get(index="cs_detection_policies", id=policy_id)
                doc = existing["_source"]
                doc.update(detector_update)
                for obsolete_field in ("condition_config", "target_index", "interval_min",
                                       "total_events_count", "mitre_technique_ids", "mitre_tactic_ids"):
                    doc.pop(obsolete_field, None)
                client.index(index="cs_detection_policies", id=policy_id, body=doc, refresh=True)
                logger.info(f"  Detector 업데이트: '{policy_name}' ({policy_id})")
            except Exception as e:
                logger.error(f"  Detector 업데이트 실패 ({policy_id}): {e}")
        detectors_updated += 1

    return rules_created, detectors_updated


def migrate_events_to_findings(client, dry_run: bool):
    """기존 cs_detection_events에 detector_id/detector_name 필드 추가"""
    logger.info("=== Step 3: cs_detection_events → Finding 필드 매핑 ===")

    try:
        result = client.search(
            index="cs_detection_events",
            body={
                "size": 1000,
                "query": {
                    "bool": {
                        "must": [{"exists": {"field": "policy_id"}}],
                        "must_not": [{"exists": {"field": "detector_id"}}],
                    }
                },
                "_source": ["id", "policy_id", "policy_name"],
            },
        )
    except Exception as e:
        logger.warning(f"cs_detection_events 인덱스 조회 실패: {e}")
        return 0

    hits = result.get("hits", {}).get("hits", [])
    count = len(hits)
    logger.info(f"  마이그레이션 대상 이벤트: {count}건")

    if count == 0:
        return 0

    if dry_run:
        for hit in hits[:5]:
            src = hit["_source"]
            logger.info(f"  [DRY-RUN] 이벤트 매핑: {hit['_id']} policy_id={src.get('policy_id')} → detector_id")
        return count

    bulk_body = []
    for hit in hits:
        src = hit["_source"]
        bulk_body.append({"update": {"_index": "cs_detection_events", "_id": hit["_id"]}})
        bulk_body.append({"doc": {
            "detector_id": src.get("policy_id"),
            "detector_name": src.get("policy_name", ""),
        }})

    if bulk_body:
        resp = client.bulk(body=bulk_body, refresh=True)
        errors = sum(1 for item in resp.get("items", []) if item.get("update", {}).get("error"))
        logger.info(f"  완료: {count - errors}건 업데이트, {errors}건 실패")

    return count


def main():
    parser = argparse.ArgumentParser(description="Detection system migration script")
    parser.add_argument("--dry-run", action="store_true", help="실제 변경 없이 시뮬레이션")
    args = parser.parse_args()

    if args.dry_run:
        logger.info("*** DRY-RUN 모드 ***")

    client = get_opensearch_client()

    sigma_count = migrate_sigma_rules_add_type(client, args.dry_run)
    rules_created, detectors_updated = migrate_policies_to_detectors(client, args.dry_run)
    events_count = migrate_events_to_findings(client, args.dry_run)

    logger.info("")
    logger.info("=== 마이그레이션 요약 ===")
    logger.info(f"  Sigma 룰 type 필드 추가: {sigma_count}건")
    logger.info(f"  Custom Rule 생성: {rules_created}건")
    logger.info(f"  Detector 변환: {detectors_updated}건")
    logger.info(f"  Event → Finding 매핑: {events_count}건")

    if args.dry_run:
        logger.info("(DRY-RUN: 실제 변경 없음)")


if __name__ == "__main__":
    main()
