"""SigmaRuleRepository 변환/재변환 관련 메서드 단위 테스트 (Mock OpenSearch)"""
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from datetime import datetime

from app.repositories.sigma_rule import SigmaRuleRepository


@pytest.fixture
def mock_client():
    return MagicMock()


@pytest.fixture
def repo(mock_client):
    with patch("app.repositories.sigma_rule.get_opensearch_client", return_value=mock_client):
        r = SigmaRuleRepository()
    return r


class TestUpdateConversionResult:
    @pytest.mark.asyncio
    async def test_success(self, repo, mock_client):
        mock_client.update.return_value = {"result": "updated"}
        result = await repo.update_conversion_result("rule-1", {
            "opensearch_query": {"query": {"match_all": {}}},
            "query_conversion_status": "success",
            "query_pipeline_id": "default",
            "query_converted_at": "2026-03-18T00:00:00",
        })
        assert result is True
        mock_client.update.assert_called_once()
        call_args = mock_client.update.call_args
        assert call_args[1]["id"] == "rule-1"
        doc = call_args[1]["body"]["doc"]
        assert doc["query_conversion_status"] == "success"
        assert "updated_at" in doc

    @pytest.mark.asyncio
    async def test_failure(self, repo, mock_client):
        mock_client.update.side_effect = Exception("not found")
        result = await repo.update_conversion_result("rule-missing", {
            "query_conversion_status": "failed",
        })
        assert result is False


class TestBulkUpdateConversion:
    @pytest.mark.asyncio
    async def test_bulk_success(self, repo, mock_client):
        mock_client.bulk.return_value = {
            "errors": False,
            "items": [
                {"update": {"_id": "r1", "status": 200}},
                {"update": {"_id": "r2", "status": 200}},
                {"update": {"_id": "r3", "status": 200}},
            ],
        }
        result = await repo.bulk_update_conversion([
            {"id": "r1", "query_conversion_status": "success", "opensearch_query": {}},
            {"id": "r2", "query_conversion_status": "success", "opensearch_query": {}},
            {"id": "r3", "query_conversion_status": "failed", "query_conversion_error": "err"},
        ])
        assert result["success"] == 3
        assert result["failed"] == 0

    @pytest.mark.asyncio
    async def test_bulk_partial_failure(self, repo, mock_client):
        mock_client.bulk.return_value = {
            "errors": True,
            "items": [
                {"update": {"_id": "r1", "status": 200}},
                {"update": {"_id": "r2", "status": 409, "error": {"type": "conflict"}}},
            ],
        }
        result = await repo.bulk_update_conversion([
            {"id": "r1", "query_conversion_status": "success"},
            {"id": "r2", "query_conversion_status": "success"},
        ])
        assert result["success"] == 1
        assert result["failed"] == 1

    @pytest.mark.asyncio
    async def test_bulk_empty(self, repo, mock_client):
        result = await repo.bulk_update_conversion([])
        assert result["success"] == 0
        assert result["failed"] == 0
        mock_client.bulk.assert_not_called()


class TestGetConversionStats:
    @pytest.mark.asyncio
    async def test_stats(self, repo, mock_client):
        mock_client.search.return_value = {
            "hits": {"total": {"value": 3100}},
            "aggregations": {
                "by_conversion_status": {
                    "buckets": [
                        {"key": "success", "doc_count": 3000},
                        {"key": "failed", "doc_count": 50},
                        {"key": "pending", "doc_count": 30},
                        {"key": "not_converted", "doc_count": 20},
                    ]
                }
            },
        }
        stats = await repo.get_conversion_stats()
        assert stats["total"] == 3100
        assert stats["success"] == 3000
        assert stats["failed"] == 50
        assert stats["pending"] == 30
        assert stats["not_converted"] == 20

    @pytest.mark.asyncio
    async def test_stats_error(self, repo, mock_client):
        mock_client.search.side_effect = Exception("connection error")
        stats = await repo.get_conversion_stats()
        assert stats["total"] == 0


class TestListRulesByConversionStatus:
    @pytest.mark.asyncio
    async def test_list_failed(self, repo, mock_client):
        mock_client.search.return_value = {
            "hits": {
                "total": {"value": 2},
                "hits": [
                    {"_id": "r1", "_source": {"id": "r1", "name": "Rule 1", "query_conversion_status": "failed"}},
                    {"_id": "r2", "_source": {"id": "r2", "name": "Rule 2", "query_conversion_status": "failed"}},
                ],
            }
        }
        total, items = await repo.list_rules_by_conversion_status("failed")
        assert total == 2
        assert all(item["query_conversion_status"] == "failed" for item in items)


class TestReconvertJobCRUD:
    @pytest.mark.asyncio
    async def test_create_reconvert_job(self, repo, mock_client):
        mock_client.index.return_value = {"result": "created"}
        job = await repo.create_reconvert_job({
            "job_id": "rcj-001",
            "status": "started",
            "requested_count": 50,
            "processed_count": 0,
            "success_count": 0,
            "failed_count": 0,
            "pipeline_id": "default",
            "started_at": "2026-03-18T00:00:00",
        })
        assert job["job_id"] == "rcj-001"
        assert job["status"] == "started"
        mock_client.index.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_reconvert_job(self, repo, mock_client):
        mock_client.update.return_value = {"result": "updated"}
        result = await repo.update_reconvert_job("rcj-001", {
            "processed_count": 25,
            "success_count": 24,
            "failed_count": 1,
        })
        assert result is True

    @pytest.mark.asyncio
    async def test_get_active_reconvert_job_found(self, repo, mock_client):
        mock_client.search.return_value = {
            "hits": {
                "total": {"value": 1},
                "hits": [
                    {"_source": {"job_id": "rcj-001", "status": "started", "requested_count": 100}},
                ],
            }
        }
        job = await repo.get_active_reconvert_job()
        assert job is not None
        assert job["job_id"] == "rcj-001"
        assert job["status"] == "started"

    @pytest.mark.asyncio
    async def test_get_active_reconvert_job_none(self, repo, mock_client):
        mock_client.search.return_value = {
            "hits": {"total": {"value": 0}, "hits": []}
        }
        job = await repo.get_active_reconvert_job()
        assert job is None
