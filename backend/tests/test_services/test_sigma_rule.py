import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.sigma_rule import (
    SigmaRuleService,
    normalize_severity,
    extract_mitre_from_tags,
    compute_content_hash,
)


class TestNormalizeSeverity:
    def test_standard_levels(self):
        assert normalize_severity("critical") == ("critical", "critical")
        assert normalize_severity("high") == ("high", "high")
        assert normalize_severity("medium") == ("medium", "medium")
        assert normalize_severity("low") == ("low", "low")

    def test_informational_maps_to_info(self):
        assert normalize_severity("informational") == ("informational", "info")

    def test_case_insensitive(self):
        assert normalize_severity("HIGH") == ("high", "high")
        assert normalize_severity("Critical") == ("critical", "critical")

    def test_missing_defaults_to_medium(self):
        assert normalize_severity(None) == ("", "medium")
        assert normalize_severity("") == ("", "medium")

    def test_unknown_defaults_to_medium(self):
        assert normalize_severity("severe") == ("severe", "medium")
        assert normalize_severity("warning") == ("warning", "medium")


class TestExtractMitreFromTags:
    def test_extracts_techniques(self):
        tags = ["attack.execution", "attack.t1059.001", "attack.t1027"]
        techniques, tactics = extract_mitre_from_tags(tags)
        assert "T1059.001" in techniques
        assert "T1027" in techniques

    def test_extracts_tactics(self):
        tags = ["attack.execution", "attack.defense_evasion", "attack.t1059.001"]
        techniques, tactics = extract_mitre_from_tags(tags)
        assert "execution" in tactics
        assert "defense_evasion" in tactics

    def test_empty_tags(self):
        techniques, tactics = extract_mitre_from_tags([])
        assert techniques == []
        assert tactics == []

    def test_none_tags(self):
        techniques, tactics = extract_mitre_from_tags(None)
        assert techniques == []
        assert tactics == []

    def test_non_attack_tags_ignored(self):
        tags = ["cve.2024.1234", "custom.tag"]
        techniques, tactics = extract_mitre_from_tags(tags)
        assert techniques == []
        assert tactics == []


class TestComputeContentHash:
    def test_same_content_same_hash(self):
        data = {"title": "Test", "level": "high"}
        assert compute_content_hash(data) == compute_content_hash(data)

    def test_key_order_does_not_matter(self):
        data1 = {"title": "Test", "level": "high"}
        data2 = {"level": "high", "title": "Test"}
        assert compute_content_hash(data1) == compute_content_hash(data2)

    def test_different_content_different_hash(self):
        data1 = {"title": "Test A"}
        data2 = {"title": "Test B"}
        assert compute_content_hash(data1) != compute_content_hash(data2)


class TestSigmaRuleServiceValidation:
    def setup_method(self):
        self.service = SigmaRuleService()

    def test_valid_yaml(self):
        parsed = {
            "title": "Test Rule",
            "logsource": {"category": "process_creation", "product": "windows"},
            "detection": {"selection": {"field": "value"}, "condition": "selection"},
        }
        assert self.service.validate_sigma_yaml(parsed) is None

    def test_missing_title(self):
        parsed = {
            "logsource": {"category": "process_creation"},
            "detection": {"selection": {"field": "value"}, "condition": "selection"},
        }
        assert "title" in self.service.validate_sigma_yaml(parsed)

    def test_missing_logsource(self):
        parsed = {
            "title": "Test",
            "detection": {"selection": {"field": "value"}, "condition": "selection"},
        }
        assert "logsource" in self.service.validate_sigma_yaml(parsed)

    def test_missing_detection(self):
        parsed = {
            "title": "Test",
            "logsource": {"category": "process_creation"},
        }
        assert "detection" in self.service.validate_sigma_yaml(parsed)


class TestSigmaRuleServiceParse:
    def setup_method(self):
        self.service = SigmaRuleService()

    def test_parse_full_yaml(self):
        parsed = {
            "id": "abc-123",
            "title": "PowerShell Encoded Command",
            "description": "Detects encoded PS commands",
            "level": "critical",
            "status": "stable",
            "author": "Florian Roth",
            "date": "2022/01/15",
            "references": ["https://example.com"],
            "license": "MIT",
            "logsource": {"category": "process_creation", "product": "windows"},
            "detection": {"selection": {"CommandLine|contains": "-enc"}, "condition": "selection"},
            "tags": ["attack.execution", "attack.t1059.001", "attack.defense_evasion", "attack.t1027"],
            "falsepositives": ["Admin scripts"],
        }
        doc = self.service.parse_sigma_yaml(parsed, "windows/test.yml", "raw yaml string")

        assert doc["sigma_id"] == "abc-123"
        assert doc["name"] == "PowerShell Encoded Command"
        assert doc["level_original"] == "critical"
        assert doc["level_normalized"] == "critical"
        assert doc["sigma_status"] == "stable"
        assert doc["author"] == "Florian Roth"
        assert doc["log_source_product"] == "windows"
        assert doc["log_source_category"] == "process_creation"
        assert "T1059.001" in doc["mitre_technique_ids"]
        assert "T1027" in doc["mitre_technique_ids"]
        assert "execution" in doc["mitre_tactic_ids"]
        assert "defense_evasion" in doc["mitre_tactic_ids"]
        assert doc["false_positives"] == ["Admin scripts"]
        assert doc["raw_yaml"] == "raw yaml string"
        assert doc["file_path"] == "windows/test.yml"
        assert doc["content_hash"] is not None

    def test_parse_minimal_yaml(self):
        parsed = {
            "title": "Minimal Rule",
            "logsource": {"category": "process_creation"},
            "detection": {"selection": {"field": "val"}, "condition": "selection"},
        }
        doc = self.service.parse_sigma_yaml(parsed, "test.yml", "")

        assert doc["name"] == "Minimal Rule"
        assert doc["level_normalized"] == "medium"
        assert doc["tags"] == []
        assert doc["mitre_technique_ids"] == []
        assert doc["mitre_tactic_ids"] == []
        assert doc["false_positives"] == []
        assert doc["references"] == []


class TestSigmaRuleServiceCRUD:
    def setup_method(self):
        self.service = SigmaRuleService()
        self.service.repository = MagicMock()

    @pytest.mark.asyncio
    async def test_list_rules(self):
        self.service.repository.list_rules = AsyncMock(return_value=(1, [{"id": "1", "name": "Rule"}]))
        total, items = await self.service.list_rules(skip=0, limit=20)
        assert total == 1
        assert len(items) == 1
        self.service.repository.list_rules.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_rule(self):
        self.service.repository.get_rule_by_id = AsyncMock(return_value={"id": "1", "name": "Rule"})
        rule = await self.service.get_rule("1")
        assert rule["name"] == "Rule"

    @pytest.mark.asyncio
    async def test_get_rule_not_found(self):
        self.service.repository.get_rule_by_id = AsyncMock(return_value=None)
        rule = await self.service.get_rule("nonexistent")
        assert rule is None

    @pytest.mark.asyncio
    async def test_toggle_status(self):
        self.service.repository.toggle_status = AsyncMock(return_value={"id": "1", "status": "inactive"})
        result = await self.service.toggle_status("1")
        assert result["status"] == "inactive"

    @pytest.mark.asyncio
    async def test_delete_rule(self):
        self.service.repository.delete_rule = AsyncMock(return_value=True)
        result = await self.service.delete_rule("1", deleted_by="user-1")
        assert result is True
        self.service.repository.delete_rule.assert_called_once_with("1", deleted_by="user-1")

    @pytest.mark.asyncio
    async def test_get_stats(self):
        self.service.repository.get_stats = AsyncMock(return_value={
            "total": 100,
            "by_severity": {"critical": 10},
            "by_status": {"active": 90},
            "mitre_coverage": {"tactics_count": 5, "techniques_count": 30},
        })
        stats = await self.service.get_stats()
        assert stats["total"] == 100
