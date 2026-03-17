from fastapi import APIRouter
from .auth import router as auth_router
from .users import router as users_router
from .password_policy import router as password_policy_router
from .dashboard import router as dashboard_router
from .notification import router as notification_router
from .logs import router as logs_router
from .advanced_settings import router as advanced_settings_router
from .ws_alerts import router as ws_alerts_router
from .code import router as code_router
from .monitoring import router as monitoring_router
from .sigma_rule import router as sigma_rule_router
from .detection_policy import router as detection_policy_router
from .detection_policy import event_router as detection_event_router

router = APIRouter(prefix="/api/v1")
router.include_router(auth_router)
router.include_router(users_router)
router.include_router(password_policy_router)
router.include_router(dashboard_router)
router.include_router(notification_router, prefix="/notifications", tags=["notifications"])
router.include_router(logs_router)
router.include_router(advanced_settings_router, prefix="/advanced-settings", tags=["advanced-settings"])
router.include_router(ws_alerts_router, prefix="/ws", tags=["websocket"])
router.include_router(code_router, prefix="/codes", tags=["codes"])
router.include_router(monitoring_router)
router.include_router(sigma_rule_router, prefix="/sigma-rules", tags=["sigma-rules"])
router.include_router(detection_policy_router, prefix="/detection-policies", tags=["detection-policies"])
router.include_router(detection_event_router, prefix="/detection-events", tags=["detection-events"])
