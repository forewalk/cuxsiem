from fastapi import APIRouter
from .auth import router as auth_router
from .users import router as users_router
from .password_policy import router as password_policy_router

router = APIRouter(prefix="/api/v1")
router.include_router(auth_router)
router.include_router(users_router)
router.include_router(password_policy_router)
