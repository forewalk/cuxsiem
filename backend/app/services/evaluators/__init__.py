"""평가기 레지스트리 — 소스 타입별 평가기를 등록하고 조회"""
from typing import Any, Optional

from app.services.evaluators.base import BaseEvaluator, EvaluationResult

__all__ = ["EvaluatorRegistry", "BaseEvaluator", "EvaluationResult"]


class EvaluatorRegistry:
    _evaluators: dict[str, BaseEvaluator] = {}

    @classmethod
    def register(cls, evaluator: BaseEvaluator) -> None:
        cls._evaluators[evaluator.get_source_type()] = evaluator

    @classmethod
    def get(cls, source_type: str) -> Optional[BaseEvaluator]:
        return cls._evaluators.get(source_type)

    @classmethod
    def list_source_types(cls) -> list[dict[str, Any]]:
        return [
            {
                "id": ev.get_source_type(),
                "name": ev.get_display_name(),
                "description": ev.get_description(),
                "conditions": ev.get_conditions(),
            }
            for ev in cls._evaluators.values()
        ]


def _register_all() -> None:
    """내장 평가기를 자동 등록한다."""
    from app.services.evaluators.healthcheck import HealthCheckEvaluator
    from app.services.evaluators.auth import AuthEvaluator

    EvaluatorRegistry.register(HealthCheckEvaluator())
    EvaluatorRegistry.register(AuthEvaluator())


_register_all()
