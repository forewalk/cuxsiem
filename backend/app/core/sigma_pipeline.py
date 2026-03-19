"""pySigma 기반 Sigma → OpenSearch DSL 변환 엔진 래퍼"""
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)


class SigmaConversionResult:
    """변환 결과 데이터 클래스"""

    __slots__ = ("opensearch_query", "status", "error", "pipeline_id", "converted_at")

    def __init__(
        self,
        opensearch_query: Optional[Dict[str, Any]],
        status: str,
        error: Optional[str],
        pipeline_id: str,
        converted_at: str,
    ):
        self.opensearch_query = opensearch_query
        self.status = status
        self.error = error
        self.pipeline_id = pipeline_id
        self.converted_at = converted_at

    def to_dict(self) -> dict:
        return {
            "opensearch_query": self.opensearch_query,
            "query_conversion_status": self.status,
            "query_conversion_error": self.error,
            "query_pipeline_id": self.pipeline_id,
            "query_converted_at": self.converted_at,
        }


class SigmaPipelineManager:
    """pySigma 파이프라인 관리 및 변환 실행 (싱글톤)"""

    _instance: Optional["SigmaPipelineManager"] = None
    _backend = None
    _pipeline = None
    _pipeline_id: str = "default"

    @classmethod
    def get_instance(cls) -> "SigmaPipelineManager":
        if cls._instance is None:
            cls._instance = cls()
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        try:
            from sigma.backends.opensearch import OpensearchLuceneBackend
            from sigma.processing.pipeline import ProcessingPipeline, ProcessingItem
            from sigma.processing.transformations import FieldMappingTransformation

            self._pipeline = ProcessingPipeline(
                name="CruxSIEM Default",
                items=[
                    ProcessingItem(
                        identifier="crux_field_mapping",
                        transformation=FieldMappingTransformation({
                            "CommandLine": "process.command_line",
                            "ParentCommandLine": "process.parent.command_line",
                            "Image": "process.executable",
                            "ParentImage": "process.parent.executable",
                            "TargetFilename": "file.path",
                            "SourceIp": "source.ip",
                            "DestinationIp": "destination.ip",
                            "DestinationPort": "destination.port",
                            "User": "user.name",
                            "EventType": "event.action",
                            "ServiceName": "service.name",
                            "RegistryKey": "registry.key",
                            "RegistryValue": "registry.value",
                        }),
                    )
                ],
            )
            self._backend = OpensearchLuceneBackend(self._pipeline)
            self._pipeline_id = "default"
            logger.info("pySigma 파이프라인 초기화 완료 (pipeline=%s)", self._pipeline_id)
        except ImportError:
            logger.warning("pySigma 미설치 — 변환 기능 비활성")
            self._backend = None

    def is_available(self) -> bool:
        return self._backend is not None

    def convert_rule(self, raw_yaml: str) -> SigmaConversionResult:
        """Sigma YAML을 OpenSearch DSL JSON으로 변환"""
        now = datetime.now(timezone.utc).isoformat()

        if not self.is_available():
            return SigmaConversionResult(
                opensearch_query=None,
                status="pending",
                error="pySigma not installed or not available",
                pipeline_id=self._pipeline_id,
                converted_at=now,
            )

        try:
            from sigma.rule import SigmaRule

            rule = SigmaRule.from_yaml(raw_yaml)
            dsl_list = self._backend.convert_rule(rule, output_format="dsl_lucene")

            if not dsl_list:
                return SigmaConversionResult(
                    opensearch_query=None,
                    status="failed",
                    error="Empty conversion result",
                    pipeline_id=self._pipeline_id,
                    converted_at=now,
                )

            return SigmaConversionResult(
                opensearch_query=dsl_list[0],
                status="success",
                error=None,
                pipeline_id=self._pipeline_id,
                converted_at=now,
            )
        except Exception as e:
            error_msg = self._sanitize_error(str(e))
            return SigmaConversionResult(
                opensearch_query=None,
                status="failed",
                error=error_msg,
                pipeline_id=self._pipeline_id,
                converted_at=now,
            )

    @staticmethod
    def _sanitize_error(msg: str) -> str:
        """에러 메시지에서 내부 경로 등 민감 정보 제거, 500자 제한"""
        for prefix in ("/home/", "/Users/", "/opt/", "/var/", "C:\\Users\\"):
            if prefix in msg:
                parts = msg.split(prefix)
                msg = parts[0] + "[path_redacted]" + (parts[1].split(" ", 1)[1] if " " in parts[1] else "")
        return msg[:500]
