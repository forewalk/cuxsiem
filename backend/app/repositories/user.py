"""사용자 Repository"""
from __future__ import annotations

import asyncio
from typing import Optional
from datetime import datetime
import uuid
import logging

from app.core.opensearch import get_opensearch_client
from app.models.user import User

logger = logging.getLogger(__name__)


class UserRepository:
    """사용자 정보 조회/관리"""

    def __init__(self):
        self.client = get_opensearch_client()
        self.index = "cs_users"

    async def get_by_email(self, email: str) -> Optional[User]:
        """이메일로 사용자 조회"""
        loop = asyncio.get_event_loop()

        def search():
            result = self.client.search(
                index=self.index,
                body={
                    "query": {
                        "bool": {
                            "must": [
                                {"term": {"emad": email.lower()}}
                            ],
                            "must_not": [
                                {"exists": {"field": "deleted_at"}}
                            ]
                        }
                    }
                }
            )
            hits = result.get("hits", {}).get("hits", [])
            if hits:
                return hits[0]["_id"], hits[0]["_source"]
            return None

        try:
            result = await loop.run_in_executor(None, search)
            if result:
                doc_id, user_data = result
                return self._dict_to_user(user_data, doc_id)
        except Exception:
            pass

        return None

    async def get_by_id(self, user_id: str) -> Optional[User]:
        """ID로 사용자 조회"""
        loop = asyncio.get_event_loop()

        def get():
            try:
                result = self.client.get(index=self.index, id=user_id)
                return result["_source"]
            except Exception:
                return None

        try:
            user_data = await loop.run_in_executor(None, get)
            if user_data:
                return self._dict_to_user(user_data, user_id)
        except Exception:
            pass

        return None

    async def create(self, user: User) -> User:
        """사용자 생성"""
        loop = asyncio.get_event_loop()

        def insert():
            self.client.index(
                index=self.index,
                id=user.id,
                body=user.to_dict(),
                refresh=True
            )
            return user

        return await loop.run_in_executor(None, insert)

    async def list(self, skip: int = 0, limit: int = 100) -> tuple[int, list[User]]:
        """사용자 목록 조회"""
        loop = asyncio.get_event_loop()

        def search():
            result = self.client.search(
                index=self.index,
                body={
                    "from": skip,
                    "size": limit,
                    "query": {
                        "bool": {
                            "must_not": [
                                {"exists": {"field": "deleted_at"}}
                            ]
                        }
                    },
                    "sort": [{"created_at": {"order": "desc"}}]
                }
            )
            total = result.get("hits", {}).get("total", {}).get("value", 0)
            hits = result.get("hits", {}).get("hits", [])
            users = [self._dict_to_user(hit["_source"], hit["_id"]) for hit in hits]
            return total, users

        return await loop.run_in_executor(None, search)

    async def update(self, user_id: str, data: dict) -> Optional[User]:
        """사용자 정보 수정"""
        loop = asyncio.get_event_loop()
        data["updated_at"] = datetime.utcnow().isoformat()

        def update_doc():
            try:
                self.client.update(
                    index=self.index,
                    id=user_id,
                    body={"doc": data},
                    refresh=True
                )
                return True
            except Exception:
                return False

        success = await loop.run_in_executor(None, update_doc)
        if success:
            return await self.get_by_id(user_id)
        return None

    async def delete(self, user_id: str) -> bool:
        """사용자 삭제 (Soft Delete)"""
        loop = asyncio.get_event_loop()

        def soft_delete():
            try:
                self.client.update(
                    index=self.index,
                    id=user_id,
                    body={
                        "doc": {
                            "deleted_at": datetime.utcnow().isoformat(),
                            "is_active": False
                        }
                    },
                    refresh=True
                )
                return True
            except Exception:
                return False

        return await loop.run_in_executor(None, soft_delete)

    async def list_deleted(self, skip: int = 0, limit: int = 100) -> tuple[int, list[User]]:
        """삭제된 사용자 목록 조회"""
        loop = asyncio.get_event_loop()

        def search():
            result = self.client.search(
                index=self.index,
                body={
                    "from": skip,
                    "size": limit,
                    "query": {
                        "bool": {
                            "must": [
                                {"exists": {"field": "deleted_at"}}
                            ]
                        }
                    },
                    "sort": [{"deleted_at": {"order": "desc"}}]
                }
            )
            total = result.get("hits", {}).get("total", {}).get("value", 0)
            hits = result.get("hits", {}).get("hits", [])
            users = [self._dict_to_user(hit["_source"], hit["_id"]) for hit in hits]
            return total, users

        return await loop.run_in_executor(None, search)

    async def restore(self, user_id: str) -> bool:
        """삭제된 사용자 복구 (deleted_at 제거, is_active=false)"""
        loop = asyncio.get_event_loop()

        def restore_doc():
            try:
                self.client.update(
                    index=self.index,
                    id=user_id,
                    body={
                        "script": {
                            "source": "ctx._source.remove('deleted_at'); ctx._source.is_active = false; ctx._source.updated_at = params.now",
                            "params": {"now": datetime.utcnow().isoformat()}
                        }
                    },
                    refresh=True
                )
                return True
            except Exception:
                return False

        return await loop.run_in_executor(None, restore_doc)

    async def hard_delete(self, user_id: str) -> bool:
        """사용자 완전 삭제 (문서 제거)"""
        loop = asyncio.get_event_loop()

        def delete_doc():
            try:
                self.client.delete(
                    index=self.index,
                    id=user_id,
                    refresh=True
                )
                return True
            except Exception:
                return False

        return await loop.run_in_executor(None, delete_doc)

    async def update_last_login(self, user_id: str) -> None:
        """마지막 로그인 시간 업데이트"""
        loop = asyncio.get_event_loop()

        def update():
            try:
                self.client.update(
                    index=self.index,
                    id=user_id,
                    body={
                        "doc": {"last_login_at": datetime.utcnow().isoformat()}
                    },
                    refresh=True
                )
            except Exception as e:
                print(f"Error updating last login for {user_id}: {e}")

        await loop.run_in_executor(None, update)

    async def update_otp_field(
        self,
        user_id: str,
        field_name: str,
        value
    ) -> bool:
        """단일 OTP 필드 업데이트

        Args:
            user_id: 사용자 ID
            field_name: OTP 필드명 (예: otp_secret_enc, otp_pending_secret_enc)
            value: 필드값

        Returns:
            업데이트 성공 여부
        """
        loop = asyncio.get_event_loop()

        def update():
            try:
                logger.debug(f"OTP 필드 업데이트: user_id={user_id}, field={field_name}, value={'[set]' if value else '[null]'}")
                self.client.update(
                    index=self.index,
                    id=user_id,
                    body={
                        "doc": {field_name: value}
                    },
                    refresh=True
                )
                logger.info(f"OTP 필드 업데이트 성공: user_id={user_id}, field={field_name}")
                return True
            except Exception as e:
                logger.error(f"OTP 필드 업데이트 실패: user_id={user_id}, field={field_name}, error={str(e)}", exc_info=True)
                return False

        return await loop.run_in_executor(None, update)

    async def update_otp_config(
        self,
        user_id: str,
        otp_config: dict
    ) -> bool:
        """OTP 설정 전체 업데이트

        Args:
            user_id: 사용자 ID
            otp_config: OTP 설정 딕셔너리 (otp_enabled, otp_secret_enc 등)

        Returns:
            업데이트 성공 여부
        """
        loop = asyncio.get_event_loop()

        def update():
            try:
                # pending secret 제거하고 enrolled_at 추가
                update_doc = {k: v for k, v in otp_config.items() if k != "otp_pending_secret_enc"}
                update_doc["otp_pending_secret_enc"] = None
                update_doc["updated_at"] = datetime.utcnow().isoformat()

                logger.debug(f"OTP 설정 업데이트: user_id={user_id}, update_doc={update_doc}")

                self.client.update(
                    index=self.index,
                    id=user_id,
                    body={
                        "doc": update_doc
                    },
                    refresh=True
                )
                logger.info(f"OTP 설정 성공적으로 업데이트됨: user_id={user_id}")
                return True
            except Exception as e:
                logger.error(f"OTP 설정 업데이트 실패: user_id={user_id}, error={str(e)}", exc_info=True)
                return False

        return await loop.run_in_executor(None, update)

    async def clear_otp_fields(self, user_id: str) -> bool:
        """모든 OTP 필드 삭제 (비활성화)

        Args:
            user_id: 사용자 ID

        Returns:
            업데이트 성공 여부
        """
        loop = asyncio.get_event_loop()

        def update():
            try:
                otp_fields = {
                    "otp_enabled": False,
                    "otp_secret_enc": None,
                    "otp_pending_secret_enc": None,
                    "otp_backup_codes": None,
                    "otp_enrolled_at": None,
                    "updated_at": datetime.utcnow().isoformat()
                }

                logger.debug(f"OTP 필드 전체 삭제: user_id={user_id}")
                self.client.update(
                    index=self.index,
                    id=user_id,
                    body={
                        "doc": otp_fields
                    },
                    refresh=True
                )
                logger.info(f"OTP 필드 전체 삭제 성공: user_id={user_id}")
                return True
            except Exception as e:
                logger.error(f"OTP 필드 삭제 실패: user_id={user_id}, error={str(e)}", exc_info=True)
                return False

        return await loop.run_in_executor(None, update)

    async def get_user_otp_status(self, user_id: str) -> Optional[dict]:
        """사용자 OTP 상태 조회

        Args:
            user_id: 사용자 ID

        Returns:
            {
                "enabled": bool,
                "enrolled_at": str or None,
                "backup_codes_count": int,
                "is_pending": bool
            }
        """
        loop = asyncio.get_event_loop()

        def get():
            try:
                result = self.client.get(index=self.index, id=user_id)
                source = result["_source"]
                backup_codes = source.get("otp_backup_codes") or []
                otp_status = {
                    "enabled": source.get("otp_enabled", False),
                    "enrolled_at": source.get("otp_enrolled_at"),
                    "backup_codes_count": len(backup_codes),
                    "is_pending": bool(source.get("otp_pending_secret_enc")),
                }
                logger.debug(f"OTP 상태 조회 성공: user_id={user_id}, status={otp_status}")
                return otp_status
            except Exception as e:
                logger.error(f"OTP 상태 조회 실패: user_id={user_id}, error={str(e)}", exc_info=True)
                return None

        return await loop.run_in_executor(None, get)

    async def count_active_admins(self) -> int:
        """활성 관리자(role-1) 수 조회

        Returns:
            활성 관리자 수
        """
        loop = asyncio.get_event_loop()

        def count():
            try:
                result = self.client.count(
                    index=self.index,
                    body={
                        "query": {
                            "bool": {
                                "must": [
                                    {"term": {"role": "role-1"}},
                                    {"term": {"is_active": True}}
                                ],
                                "must_not": [
                                    {"exists": {"field": "deleted_at"}}
                                ]
                            }
                        }
                    }
                )
                admin_count = result["count"]
                logger.debug(f"활성 관리자 수: {admin_count}")
                return admin_count
            except Exception as e:
                logger.error(f"관리자 수 조회 실패: {str(e)}", exc_info=True)
                return 0

        return await loop.run_in_executor(None, count)

    async def lock_account(self, user_id: str, until: Optional[datetime]) -> bool:
        """
        계정 잠금

        Args:
            user_id: 사용자 ID
            until: 잠금 해제 시각 (None이면 영구 잠금)

        Returns:
            성공 여부
        """
        loop = asyncio.get_event_loop()

        def lock():
            try:
                update_doc = {
                    "is_active": False,
                    "locked_until": until.isoformat() if until else None,
                    "updated_at": datetime.utcnow().isoformat()
                }

                self.client.update(
                    index=self.index,
                    id=user_id,
                    body={"doc": update_doc},
                    refresh=True
                )
                logger.info(f"계정 잠금 성공: user_id={user_id}, until={until}")
                return True
            except Exception as e:
                logger.error(f"계정 잠금 실패: user_id={user_id}, error={str(e)}", exc_info=True)
                return False

        return await loop.run_in_executor(None, lock)

    async def unlock_account(self, user_id: str) -> bool:
        """
        계정 잠금 해제

        Args:
            user_id: 사용자 ID

        Returns:
            성공 여부
        """
        loop = asyncio.get_event_loop()

        def unlock():
            try:
                self.client.update(
                    index=self.index,
                    id=user_id,
                    body={
                        "script": {
                            "source": "ctx._source.is_active = true; ctx._source.remove('locked_until'); ctx._source.updated_at = params.now",
                            "params": {"now": datetime.utcnow().isoformat()}
                        }
                    },
                    refresh=True
                )
                logger.info(f"계정 잠금 해제 성공: user_id={user_id}")
                return True
            except Exception as e:
                logger.error(f"계정 잠금 해제 실패: user_id={user_id}, error={str(e)}", exc_info=True)
                return False

        return await loop.run_in_executor(None, unlock)

    async def get_locked_accounts(self) -> list[User]:
        """
        잠긴 계정 목록 조회 (locked_until이 설정된 계정)

        Returns:
            잠긴 계정 리스트
        """
        loop = asyncio.get_event_loop()

        def search():
            try:
                result = self.client.search(
                    index=self.index,
                    body={
                        "query": {
                            "bool": {
                                "must": [
                                    {"term": {"is_active": False}},
                                    {"exists": {"field": "locked_until"}}
                                ],
                                "must_not": [
                                    {"exists": {"field": "deleted_at"}}
                                ]
                            }
                        },
                        "size": 1000
                    }
                )
                hits = result.get("hits", {}).get("hits", [])
                users = [self._dict_to_user(hit["_source"], hit["_id"]) for hit in hits]
                return users
            except Exception as e:
                logger.error(f"잠긴 계정 조회 실패: {str(e)}", exc_info=True)
                return []

        return await loop.run_in_executor(None, search)

    def _dict_to_user(self, data: dict, doc_id: str = None) -> User:
        """딕셔너리를 User 객체로 변환"""
        return User(
            id=doc_id or data.get("id", ""),
            email=data["email"],
            password_hash=data["password_hash"],
            name=data["name"],
            role=data["role"],
            is_active=data["is_active"],
            created_at=datetime.fromisoformat(data["created_at"]),
            updated_at=datetime.fromisoformat(data["updated_at"]),
            deleted_at=datetime.fromisoformat(data["deleted_at"]) if data.get("deleted_at") else None,
            last_login_at=datetime.fromisoformat(data["last_login_at"]) if data.get("last_login_at") else None,
            locked_until=datetime.fromisoformat(data["locked_until"]) if data.get("locked_until") else None,
            otp_pending_secret_enc=data.get("otp_pending_secret_enc"),
            otp_secret_enc=data.get("otp_secret_enc"),
            otp_enabled=data.get("otp_enabled", False),
            otp_backup_codes=data.get("otp_backup_codes"),
            otp_enrolled_at=datetime.fromisoformat(data["otp_enrolled_at"]) if data.get("otp_enrolled_at") else None,
        )
