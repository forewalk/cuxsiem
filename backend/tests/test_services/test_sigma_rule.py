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

        assert doc["type"] == "sigma"
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

        assert doc["type"] == "sigma"
        assert doc["name"] == "Minimal Rule"
        assert doc["level_normalized"] == "medium"
        assert doc["tags"] == []
        assert doc["mitre_technique_ids"] == []
        assert doc["mitre_tactic_ids"] == []
        assert doc["false_positives"] == []
        assert doc["references"] == []


class TestCustomRuleCRUD:
    def setup_method(self):
        self.service = SigmaRuleService()
        self.service.repository = MagicMock()

    @pytest.mark.asyncio
    async def test_create_custom_rule(self):
        self.service.repository.create_rule = AsyncMock(return_value={
            "id": "cr-1", "type": "custom", "name": "My Custom Rule",
            "detection_config": {"query": {"match_all": {}}},
        })
        result = await self.service.create_custom_rule({
            "name": "My Custom Rule",
            "detection_config": {"query": {"match_all": {}}},
            "level_normalized": "high",
            "mitre_technique_ids": ["T1059"],
        })
        assert result["type"] == "custom"
        assert result["name"] == "My Custom Rule"
        call_args = self.service.repository.create_rule.call_args[0][0]
        assert call_args["type"] == "custom"
        assert call_args["level_normalized"] == "high"
        assert call_args["mitre_technique_ids"] == ["T1059"]

    @pytest.mark.asyncio
    async def test_create_custom_rule_defaults(self):
        self.service.repository.create_rule = AsyncMock(return_value={"id": "cr-2", "type": "custom"})
        await self.service.create_custom_rule({
            "name": "Default Rule",
            "detection_config": {"query": {"match_all": {}}},
        })
        call_args = self.service.repository.create_rule.call_args[0][0]
        assert call_args["level_normalized"] == "medium"
        assert call_args["mitre_technique_ids"] == []
        assert call_args["status"] == "active"

    @pytest.mark.asyncio
    async def test_update_custom_rule(self):
        self.service.repository.get_rule_by_id = AsyncMock(return_value={
            "id": "cr-1", "type": "custom", "name": "Old Name",
        })
        self.service.repository.update_rule = AsyncMock(return_value={
            "id": "cr-1", "type": "custom", "name": "New Name",
        })
        result = await self.service.update_custom_rule("cr-1", {"name": "New Name"})
        assert result["name"] == "New Name"

    @pytest.mark.asyncio
    async def test_update_sigma_rule_rejected(self):
        self.service.repository.get_rule_by_id = AsyncMock(return_value={
            "id": "sr-1", "type": "sigma", "name": "Sigma Rule",
        })
        result = await self.service.update_custom_rule("sr-1", {"name": "Changed"})
        assert result is None

    @pytest.mark.asyncio
    async def test_update_nonexistent_rule_rejected(self):
        self.service.repository.get_rule_by_id = AsyncMock(return_value=None)
        result = await self.service.update_custom_rule("nonexistent", {"name": "Changed"})
        assert result is None

    @pytest.mark.asyncio
    async def test_list_rules_with_type_filter(self):
        self.service.repository.list_rules = AsyncMock(return_value=(2, [
            {"id": "cr-1", "type": "custom"},
            {"id": "cr-2", "type": "custom"},
        ]))
        total, items = await self.service.list_rules(rule_type="custom")
        self.service.repository.list_rules.assert_called_once()
        call_kwargs = self.service.repository.list_rules.call_args[1]
        assert call_kwargs["rule_type"] == "custom"


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


class TestFilterOptions:
    def setup_method(self):
        self.service = SigmaRuleService()
        self.service.repository = MagicMock()

    @pytest.mark.asyncio
    async def test_get_filter_options(self):
        self.service.repository.get_filter_options = AsyncMock(return_value={
            "log_types": ["linux", "windows"],
            "categories": ["network_connection", "process_creation"],
            "severities": ["critical", "high", "medium", "low", "info"],
            "sources": ["sigma", "custom"],
        })
        result = await self.service.get_filter_options()
        assert "windows" in result["log_types"]
        assert "process_creation" in result["categories"]
        assert result["severities"] == ["critical", "high", "medium", "low", "info"]
        assert result["sources"] == ["sigma", "custom"]

    @pytest.mark.asyncio
    async def test_get_filter_options_with_product(self):
        self.service.repository.get_filter_options = AsyncMock(return_value={
            "log_types": [],
            "categories": ["image_load", "process_creation"],
            "severities": ["critical", "high", "medium", "low", "info"],
            "sources": ["sigma", "custom"],
        })
        result = await self.service.get_filter_options(log_source_product="windows")
        self.service.repository.get_filter_options.assert_called_once_with(log_source_product="windows")
        assert result["log_types"] == []
        assert result["categories"] == ["image_load", "process_creation"]

    @pytest.mark.asyncio
    async def test_list_rules_with_category_filter(self):
        self.service.repository.list_rules = AsyncMock(return_value=(1, [
            {"id": "r-1", "type": "sigma", "log_source_category": "process_creation"},
        ]))
        total, items = await self.service.list_rules(log_source_category="process_creation")
        call_kwargs = self.service.repository.list_rules.call_args[1]
        assert call_kwargs["log_source_category"] == "process_creation"

    @pytest.mark.asyncio
    async def test_list_rules_with_multi_severity_filter(self):
        self.service.repository.list_rules = AsyncMock(return_value=(3, [
            {"id": "r-1", "level_normalized": "critical"},
            {"id": "r-2", "level_normalized": "high"},
            {"id": "r-3", "level_normalized": "medium"},
        ]))
        total, items = await self.service.list_rules(severity="critical,high,medium")
        call_kwargs = self.service.repository.list_rules.call_args[1]
        assert call_kwargs["severity"] == "critical,high,medium"

    @pytest.mark.asyncio
    async def test_list_rules_with_multi_source_filter(self):
        self.service.repository.list_rules = AsyncMock(return_value=(2, [
            {"id": "r-1", "type": "sigma"},
            {"id": "r-2", "type": "custom"},
        ]))
        total, items = await self.service.list_rules(rule_type="sigma,custom")
        call_kwargs = self.service.repository.list_rules.call_args[1]
        assert call_kwargs["rule_type"] == "sigma,custom"

    @pytest.mark.asyncio
    async def test_list_rules_with_log_type_keywords(self):
        self.service.repository.list_rules = AsyncMock(return_value=(2, [
            {"id": "r-1", "log_source_product": "windows"},
            {"id": "r-2", "log_source_category": "process_creation"},
        ]))
        total, items = await self.service.list_rules(
            log_type_keywords="windows,sysmon,powershell,windefend"
        )
        call_kwargs = self.service.repository.list_rules.call_args[1]
        assert call_kwargs["log_type_keywords"] == "windows,sysmon,powershell,windefend"
        assert total == 2

    @pytest.mark.asyncio
    async def test_list_rules_with_keywords_and_severity(self):
        self.service.repository.list_rules = AsyncMock(return_value=(1, [
            {"id": "r-1", "log_source_product": "windows", "level_normalized": "critical"},
        ]))
        total, items = await self.service.list_rules(
            log_type_keywords="windows,sysmon",
            severity="critical",
        )
        call_kwargs = self.service.repository.list_rules.call_args[1]
        assert call_kwargs["log_type_keywords"] == "windows,sysmon"
        assert call_kwargs["severity"] == "critical"
