from fastapi import APIRouter
from .auth import router as auth_router
from .users import router as users_router
from .password_policy import router as password_policy_router
from .dashboard import router as dashboard_router
from .notification import router as notification_router
from .logs import router as logs_router
from .advanced_settings import router as advanced_settings_router

router = APIRouter(prefix="/api/v1")
router.include_router(auth_router)
router.include_router(users_router)
router.include_router(password_policy_router)
router.include_router(dashboard_router)
router.include_router(notification_router, prefix="/notifications", tags=["notifications"])
router.include_router(logs_router)
router.include_router(advanced_settings_router, prefix="/advanced-settings", tags=["advanced-settings"])
