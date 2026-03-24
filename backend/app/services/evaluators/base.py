"""평가기 기반 클래스 — 모든 소스 타입 평가기가 상속"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class EvaluationResult:
    """평가기 실행 결과"""
    triggered: bool
    matched_count: int = 0
    details: list[dict[str, Any]] = field(default_factory=list)
    template_context: dict[str, Any] = field(default_factory=dict)


class BaseEvaluator(ABC):
    """소스 타입 평가기 추상 클래스"""

    @abstractmethod
    async def evaluate(self, source_config: dict[str, Any]) -> EvaluationResult:
        """소스 조건을 평가하여 결과를 반환한다."""

    @abstractmethod
    def get_source_type(self) -> str:
        """이 평가기가 담당하는 source_type 식별자"""

    @abstractmethod
    def get_display_name(self) -> str:
        """UI에 표시될 소스 타입 이름 (한글)"""

    @abstractmethod
    def get_description(self) -> str:
        """소스 타입 설명"""

    @abstractmethod
    def get_conditions(self) -> list[dict[str, Any]]:
        """사용 가능한 조건 목록 (/source-types API용)"""
