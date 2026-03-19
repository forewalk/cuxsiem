"""필드 매핑 프리셋 — Sigma 규칙 필드 ↔ 로그 인덱스 필드 매핑 정의

프리셋은 pySigma 파이프라인과 프론트엔드 자동 매핑 UI에서 공유한다.
새 로그 소스를 지원할 때 여기에 프리셋을 추가하면 된다.
"""
from typing import Dict, Any, List


FIELD_MAPPING_PRESETS: Dict[str, Dict[str, Any]] = {
    "sentinelone_edr_v1": {
        "name": "SentinelOne EDR",
        "description": "SentinelOne EDR 로그에 대한 Sigma 필드 → 실제 필드 매핑",
        "mappings": {
            # Process fields
            "CommandLine": "src.process.cmdline",
            "ParentCommandLine": "src.process.parent.cmdline",
            "Image": "src.process.image.path",
            "ParentImage": "src.process.parent.image.path",
            "OriginalFileName": "src.process.image.originalFileName",
            "Product": "src.process.image.productName",
            "Description": "src.process.image.description",
            "Company": "src.process.publisher",
            "ProcessId": "src.process.pid",
            "ParentProcessId": "src.process.parent.pid",
            "User": "src.process.user",
            "IntegrityLevel": "src.process.integrityLevel",
            "ProcessName": "src.process.name",
            "ParentProcessName": "src.process.parent.name",
            # File fields
            "TargetFilename": "tgt.file.path",
            "TargetFileName": "tgt.file.path",
            "FileName": "tgt.file.name",
            # Hash fields
            "md5": "src.process.image.md5",
            "sha1": "src.process.image.sha1",
            "sha256": "src.process.image.sha256",
            "Hashes": "src.process.image.sha256",
            # Network fields
            "SourceIp": "src.ip.address",
            "DestinationIp": "dst.ip.address",
            "DestinationPort": "dst.port.number",
            "DestinationHostname": "dst.address.value",
            # DNS fields
            "QueryName": "event.dns.request",
            "QueryResults": "event.dns.response",
            # Registry fields
            "TargetObject": "registry.key",
            "RegistryKey": "registry.key",
            "RegistryValue": "registry.value",
            # Endpoint fields
            "ComputerName": "endpoint.name",
            "HostName": "endpoint.name",
            # Event fields
            "EventType": "event.type",
            "ServiceName": "service.name",
        },
    },
}

DEFAULT_PRESET_ID = "sentinelone_edr_v1"


def get_preset(preset_id: str) -> Dict[str, Any] | None:
    return FIELD_MAPPING_PRESETS.get(preset_id)


def get_preset_mappings(preset_id: str) -> Dict[str, str]:
    """프리셋의 매핑 딕셔너리만 반환 (rule_field → log_field)"""
    preset = FIELD_MAPPING_PRESETS.get(preset_id)
    if not preset:
        return {}
    return dict(preset["mappings"])


def list_presets() -> List[Dict[str, Any]]:
    """모든 프리셋의 요약 정보 반환"""
    result = []
    for pid, preset in FIELD_MAPPING_PRESETS.items():
        result.append({
            "id": pid,
            "name": preset["name"],
            "description": preset.get("description", ""),
            "field_count": len(preset["mappings"]),
        })
    return result


def get_preset_as_field_mapping_list(preset_id: str) -> List[Dict[str, str]]:
    """프리셋을 [{rule_field, log_field}] 형태로 변환"""
    mappings = get_preset_mappings(preset_id)
    return [{"rule_field": k, "log_field": v} for k, v in mappings.items()]
