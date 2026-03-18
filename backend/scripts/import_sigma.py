#!/usr/bin/env python3
"""
Sigma Rule Import 스크립트

Sigma YAML 파일을 파싱하여 OpenSearch cs_detection_rules 인덱스에 적재합니다.

사용법:
    cd backend
    python scripts/import_sigma.py
    python scripts/import_sigma.py --dry-run
    python scripts/import_sigma.py --path /custom/sigma/dir
"""

import argparse
import logging
import os
import sys
import uuid
from collections import defaultdict
from datetime import datetime
from pathlib import Path

import yaml

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.opensearch import get_opensearch_client
from app.services.sigma_rule import SigmaRuleService

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

DEFAULT_SIGMA_PATH = os.path.join(os.path.dirname(__file__), "..", "resources")
MAX_FILE_SIZE = 1 * 1024 * 1024  # 1MB

RULES_INDEX = "cs_detection_rules"
HISTORY_INDEX = "cs_detection_rule_history"
JOBS_INDEX = "cs_rule_import_jobs"


INDEX_MAPPINGS = {
    RULES_INDEX: {
        "mappings": {
            "properties": {
                "detection_config": {"type": "object", "enabled": False},
            }
        }
    },
    HISTORY_INDEX: {},
    JOBS_INDEX: {},
}


def preflight_check(client) -> bool:
    try:
        info = client.info()
        logger.info(f"OpenSearch 연결 확인: {info.get('version', {}).get('number', 'unknown')}")
    except Exception as e:
        logger.error(f"OpenSearch 연결 실패: {e}")
        return False

    for idx, body in INDEX_MAPPINGS.items():
        if not client.indices.exists(index=idx):
            logger.warning(f"인덱스 '{idx}' 없음 — 자동 생성합니다")
            try:
                client.indices.create(index=idx, body=body if body else None)
                logger.info(f"인덱스 '{idx}' 생성 완료")
            except Exception as e:
                logger.error(f"인덱스 '{idx}' 생성 실패: {e}")
                return False
    return True


def scan_yaml_files(sigma_path: str) -> list[Path]:
    root = Path(sigma_path)
    if not root.exists():
        logger.error(f"디렉토리 없음: {sigma_path}")
        return []
    files = sorted(root.rglob("*.yml")) + sorted(root.rglob("*.yaml"))
    logger.info(f"YAML 파일 {len(files)}개 발견: {sigma_path}")
    return files


def parse_file(file_path: Path, service: SigmaRuleService) -> dict | None:
    """YAML 파일 하나를 파싱하여 OpenSearch 문서로 변환. 실패 시 None + error dict."""
    if file_path.stat().st_size > MAX_FILE_SIZE:
        return None, {"file": str(file_path), "error": f"파일 크기 초과 ({file_path.stat().st_size} bytes)"}

    try:
        raw = file_path.read_text(encoding="utf-8")
    except Exception as e:
        return None, {"file": str(file_path), "error": f"파일 읽기 실패: {e}"}

    try:
        parsed = yaml.safe_load(raw)
    except yaml.YAMLError as e:
        return None, {"file": str(file_path), "error": f"YAML 파싱 실패: {e}"}

    if not isinstance(parsed, dict):
        return None, {"file": str(file_path), "error": "YAML이 dict가 아님"}

    validation_error = service.validate_sigma_yaml(parsed)
    if validation_error:
        return None, {"file": str(file_path), "error": validation_error}

    rel_path = str(file_path)
    doc = service.parse_sigma_yaml(parsed, rel_path, raw)
    return doc, None


def run_import(sigma_path: str, dry_run: bool = False):
    client = get_opensearch_client()

    if not preflight_check(client):
        logger.error("Pre-flight 헬스체크 실패. Import를 중단합니다.")
        return

    service = SigmaRuleService()
    files = scan_yaml_files(sigma_path)
    if not files:
        logger.warning("Import할 YAML 파일이 없습니다.")
        return

    job_id = f"import-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"
    job = {
        "job_id": job_id,
        "status": "running",
        "total_files": len(files),
        "processed_files": 0,
        "inserted_count": 0,
        "updated_count": 0,
        "skipped_count": 0,
        "failed_count": 0,
        "conflict_count": 0,
        "errors": [],
        "started_at": datetime.utcnow().isoformat(),
    }

    # 1단계: 파싱 + 검증 + 중복 sigma_id 감지
    parsed_docs = {}  # sigma_id -> (doc, file_path)
    conflicts = set()

    for f in files:
        doc, err = parse_file(f, service)
        if err:
            job["failed_count"] += 1
            job["errors"].append(err)
            job["processed_files"] += 1
            logger.warning(f"SKIP {f}: {err['error']}")
            continue

        sigma_id = doc.get("sigma_id")
        if not sigma_id:
            job["failed_count"] += 1
            job["errors"].append({"file": str(f), "error": "sigma_id(id 필드) 누락"})
            job["processed_files"] += 1
            continue

        if sigma_id in parsed_docs:
            existing_hash = parsed_docs[sigma_id][0]["content_hash"]
            if existing_hash == doc["content_hash"]:
                job["skipped_count"] += 1
                logger.debug(f"중복 파일 스킵 (동일 content): {f}")
            else:
                conflicts.add(sigma_id)
                job["conflict_count"] += 1
                job["errors"].append({"file": str(f), "error": f"sigma_id 충돌: {sigma_id} (다른 content)"})
                logger.warning(f"CONFLICT {f}: sigma_id={sigma_id}")
            job["processed_files"] += 1
            continue

        parsed_docs[sigma_id] = (doc, str(f))
        job["processed_files"] += 1

    # 충돌된 sigma_id는 제외
    for cid in conflicts:
        if cid in parsed_docs:
            del parsed_docs[cid]

    if dry_run:
        # Dry-run: 기존 데이터와 비교만 수행
        for sigma_id, (doc, fpath) in parsed_docs.items():
            try:
                result = client.search(index=RULES_INDEX, body={"query": {"term": {"sigma_id": sigma_id}}, "size": 1})
                hits = result.get("hits", {}).get("hits", [])
                if not hits:
                    job["inserted_count"] += 1
                elif hits[0]["_source"].get("content_hash") == doc["content_hash"]:
                    job["skipped_count"] += 1
                else:
                    job["updated_count"] += 1
            except Exception:
                job["inserted_count"] += 1

        job["status"] = "completed (dry-run)"
        job["completed_at"] = datetime.utcnow().isoformat()
        _print_summary(job)
        return

    # 2단계: Upsert
    for sigma_id, (doc, fpath) in parsed_docs.items():
        try:
            result = client.search(index=RULES_INDEX, body={"query": {"term": {"sigma_id": sigma_id}}, "size": 1})
            hits = result.get("hits", {}).get("hits", [])

            if not hits:
                doc_id = str(uuid.uuid4())
                now = datetime.utcnow().isoformat()
                doc.update({"id": doc_id, "status": "active", "is_deleted": False, "revision": 1, "created_at": now, "updated_at": now})
                client.index(index=RULES_INDEX, id=doc_id, body=doc, refresh=False)
                job["inserted_count"] += 1
                logger.info(f"INSERT {sigma_id}: {doc['name']}")
            else:
                existing = hits[0]["_source"]
                existing_id = hits[0]["_id"]

                if existing.get("content_hash") == doc["content_hash"]:
                    job["skipped_count"] += 1
                    continue

                # 이전본을 history에 저장
                history_doc = {
                    "id": str(uuid.uuid4()),
                    "rule_id": existing_id,
                    "sigma_id": sigma_id,
                    "revision": existing.get("revision", 1),
                    "raw_yaml": existing.get("raw_yaml"),
                    "content_hash": existing.get("content_hash"),
                    "changed_at": datetime.utcnow().isoformat(),
                }
                client.index(index=HISTORY_INDEX, id=history_doc["id"], body=history_doc, refresh=False)

                new_rev = existing.get("revision", 1) + 1
                now = datetime.utcnow().isoformat()
                update_data = {
                    "name": doc["name"],
                    "description": doc.get("description"),
                    "level_original": doc["level_original"],
                    "level_normalized": doc["level_normalized"],
                    "sigma_status": doc.get("sigma_status"),
                    "author": doc.get("author"),
                    "sigma_date": doc.get("sigma_date"),
                    "references": doc.get("references", []),
                    "license": doc.get("license"),
                    "log_source_category": doc.get("log_source_category"),
                    "log_source_product": doc.get("log_source_product"),
                    "log_source_service": doc.get("log_source_service"),
                    "detection_config": doc.get("detection_config", {}),
                    "tags": doc.get("tags", []),
                    "mitre_technique_ids": doc.get("mitre_technique_ids", []),
                    "mitre_tactic_ids": doc.get("mitre_tactic_ids", []),
                    "false_positives": doc.get("false_positives", []),
                    "raw_yaml": doc.get("raw_yaml"),
                    "file_path": doc.get("file_path"),
                    "content_hash": doc["content_hash"],
                    "revision": new_rev,
                    "updated_at": now,
                }
                client.update(index=RULES_INDEX, id=existing_id, body={"doc": update_data}, refresh=False)
                job["updated_count"] += 1
                logger.info(f"UPDATE {sigma_id}: {doc['name']} (rev {new_rev})")

        except Exception as e:
            job["failed_count"] += 1
            job["errors"].append({"file": fpath, "error": f"Upsert 실패: {e}"})
            logger.error(f"ERROR {sigma_id}: {e}")

    client.indices.refresh(index=RULES_INDEX)

    job["status"] = "completed"
    job["completed_at"] = datetime.utcnow().isoformat()

    try:
        client.index(index=JOBS_INDEX, id=job_id, body=job, refresh=True)
    except Exception as e:
        logger.error(f"Import job 저장 실패: {e}")

    _print_summary(job)


def _print_summary(job: dict):
    logger.info("=" * 60)
    logger.info(f"Import 완료: {job['job_id']} ({job['status']})")
    logger.info(f"  전체 파일:  {job['total_files']}")
    logger.info(f"  신규:      {job['inserted_count']}")
    logger.info(f"  업데이트:  {job['updated_count']}")
    logger.info(f"  스킵:      {job['skipped_count']}")
    logger.info(f"  충돌:      {job['conflict_count']}")
    logger.info(f"  실패:      {job['failed_count']}")
    if job["errors"]:
        logger.info("  에러 목록:")
        for err in job["errors"][:10]:
            logger.info(f"    - {err['file']}: {err['error']}")
        if len(job["errors"]) > 10:
            logger.info(f"    ... 외 {len(job['errors']) - 10}건")
    logger.info("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sigma Rule Import")
    parser.add_argument("--path", default=DEFAULT_SIGMA_PATH, help="Sigma YAML 디렉토리 경로")
    parser.add_argument("--dry-run", action="store_true", help="Preview 모드 (실제 반영 안 함)")
    args = parser.parse_args()

    run_import(args.path, dry_run=args.dry_run)
