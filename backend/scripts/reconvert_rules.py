#!/usr/bin/env python3
"""
Sigma Rule 벌크 재변환 스크립트

기존 OpenSearch에 저장된 Sigma 룰의 raw_yaml을 pySigma로 재변환하여
opensearch_query 필드를 갱신합니다.

사용법:
    cd backend
    python scripts/reconvert_rules.py --all
    python scripts/reconvert_rules.py --all --dry-run
    python scripts/reconvert_rules.py --status failed
    python scripts/reconvert_rules.py --batch-size 200
"""

import argparse
import logging
import os
import sys
import time
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.opensearch import get_opensearch_client
from app.core.sigma_pipeline import SigmaPipelineManager

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

RULES_INDEX = "cs_detection_rules"
BATCH_SIZE = 100


def get_rules_to_reconvert(client, status_filter=None, batch_size=BATCH_SIZE):
    """재변환 대상 룰을 scroll API로 조회"""
    must = [{"term": {"type": "sigma"}}]
    must_not = [{"term": {"is_deleted": True}}]

    if status_filter:
        if status_filter == "not_converted":
            must_not.append({"exists": {"field": "query_conversion_status"}})
        else:
            must.append({"term": {"query_conversion_status": status_filter}})

    query = {"bool": {"must": must, "must_not": must_not}}
    result = client.search(
        index=RULES_INDEX,
        body={"query": query, "_source": ["id", "raw_yaml", "name", "sigma_id"], "size": batch_size},
        scroll="5m",
    )
    scroll_id = result.get("_scroll_id")
    hits = result.get("hits", {}).get("hits", [])
    total = result.get("hits", {}).get("total", {}).get("value", 0)

    all_rules = []
    while hits:
        for hit in hits:
            all_rules.append({"_id": hit["_id"], **hit["_source"]})
        result = client.scroll(scroll_id=scroll_id, scroll="5m")
        hits = result.get("hits", {}).get("hits", [])

    client.clear_scroll(scroll_id=scroll_id)
    return total, all_rules


def run_reconvert(status_filter=None, batch_size=BATCH_SIZE, dry_run=False):
    client = get_opensearch_client()
    manager = SigmaPipelineManager.get_instance()

    if not manager.is_available():
        logger.error("pySigma가 설치되지 않았습니다. 재변환을 중단합니다.")
        return

    logger.info("재변환 대상 조회 중...")
    total, rules = get_rules_to_reconvert(client, status_filter, batch_size=1000)
    logger.info(f"재변환 대상: {len(rules)}개 (전체 Sigma 룰: {total}개)")

    if dry_run:
        success = failed = 0
        error_types = {}
        for rule in rules:
            raw_yaml = rule.get("raw_yaml")
            if not raw_yaml:
                failed += 1
                continue
            result = manager.convert_rule(raw_yaml)
            if result.status == "success":
                success += 1
            else:
                failed += 1
                err_key = (result.error or "unknown")[:80]
                error_types[err_key] = error_types.get(err_key, 0) + 1

        logger.info("=" * 60)
        logger.info(f"Dry-run 완료: {len(rules)}개 처리")
        logger.info(f"  성공: {success}")
        logger.info(f"  실패: {failed}")
        if error_types:
            logger.info("  에러 유형:")
            for et, cnt in sorted(error_types.items(), key=lambda x: -x[1])[:10]:
                logger.info(f"    [{cnt}건] {et}")
        logger.info("=" * 60)
        return

    start_time = time.time()
    success = failed = 0
    error_samples = []

    for i in range(0, len(rules), batch_size):
        batch = rules[i:i + batch_size]
        bulk_body = []

        for rule in batch:
            raw_yaml = rule.get("raw_yaml")
            doc_id = rule["_id"]
            if not raw_yaml:
                failed += 1
                continue

            result = manager.convert_rule(raw_yaml)
            update_doc = result.to_dict()
            update_doc["updated_at"] = datetime.utcnow().isoformat()

            bulk_body.append({"update": {"_index": RULES_INDEX, "_id": doc_id}})
            bulk_body.append({"doc": update_doc})

            if result.status == "success":
                success += 1
            else:
                failed += 1
                if len(error_samples) < 10:
                    error_samples.append({"rule": rule.get("name", doc_id), "error": result.error})

        if bulk_body:
            client.bulk(body=bulk_body, refresh=False)

        logger.info(f"  진행: {min(i + batch_size, len(rules))}/{len(rules)} (성공={success}, 실패={failed})")

    client.indices.refresh(index=RULES_INDEX)
    elapsed = time.time() - start_time

    logger.info("=" * 60)
    logger.info(f"재변환 완료: {len(rules)}개 처리 ({elapsed:.1f}초)")
    logger.info(f"  성공: {success} ({100 * success / max(len(rules), 1):.1f}%)")
    logger.info(f"  실패: {failed}")
    if error_samples:
        logger.info("  실패 샘플:")
        for s in error_samples:
            logger.info(f"    - {s['rule']}: {s['error']}")
    logger.info("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sigma Rule 벌크 재변환")
    parser.add_argument("--all", action="store_true", help="모든 Sigma 룰 재변환")
    parser.add_argument("--status", default=None, help="특정 변환 상태 필터 (failed, pending, not_converted)")
    parser.add_argument("--batch-size", type=int, default=BATCH_SIZE, help="벌크 처리 배치 크기")
    parser.add_argument("--dry-run", action="store_true", help="실제 저장 없이 변환만 테스트")
    args = parser.parse_args()

    status_filter = args.status
    if args.all:
        status_filter = None

    run_reconvert(status_filter=status_filter, batch_size=args.batch_size, dry_run=args.dry_run)
