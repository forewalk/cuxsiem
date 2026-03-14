#!/usr/bin/env python3
"""
계정 복구 스크립트

특정 사용자 계정의 OTP를 비활성화하고 비밀번호를 기본값으로 초기화합니다.
관리자가 OTP를 분실하거나 시간 동기화 문제로 로그인할 수 없을 때 사용합니다.

사용법:
    conda run -n cruxsiem python scripts/reset_account.py --username <사용자ID>

예시:
    conda run -n cruxsiem python scripts/reset_account.py --username forewalk
"""

import asyncio
import argparse
import sys
from pathlib import Path

# 프로젝트 루트를 Python 경로에 추가
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.repositories.user import UserRepository
from app.core.security import get_password_hash


DEFAULT_PASSWORD = "CruxSIEM1!"


async def reset_account(username: str):
    """
    계정 초기화

    Args:
        username: 초기화할 사용자 ID
    """
    repo = UserRepository()

    # 사용자 존재 확인
    user = await repo.get_by_id(username)
    if not user:
        print(f"❌ 오류: '{username}' 사용자를 찾을 수 없습니다.")
        return False

    print(f"\n📋 계정 정보:")
    print(f"   ID: {user.id}")
    print(f"   이름: {user.name}")
    print(f"   역할: {user.role}")
    print(f"   OTP 활성화: {user.otp_enabled}")
    print(f"   활성 상태: {user.is_active}")

    # 확인
    confirm = input(f"\n⚠️  '{username}' 계정을 초기화하시겠습니까? (yes/no): ")
    if confirm.lower() != 'yes':
        print("❌ 취소되었습니다.")
        return False

    # OTP 비활성화
    print("\n🔧 OTP 비활성화 중...")
    await repo.clear_otp_fields(username)

    # 비밀번호 초기화
    print("🔧 비밀번호 초기화 중...")
    default_password_hash = get_password_hash(DEFAULT_PASSWORD)
    await repo.update(username, {
        "password_hash": default_password_hash,
        "is_active": True
    })

    print(f"\n✅ '{username}' 계정이 초기화되었습니다!")
    print(f"\n📝 초기화 정보:")
    print(f"   - OTP: 비활성화됨")
    print(f"   - 비밀번호: {DEFAULT_PASSWORD}")
    print(f"   - 계정 상태: 활성화")
    print(f"\n⚡ 다음 단계:")
    print(f"   1. 위 비밀번호로 로그인")
    print(f"   2. 로그인 후 반드시 비밀번호 변경")
    print(f"   3. OTP 재등록 권장")

    return True


async def main():
    parser = argparse.ArgumentParser(
        description="계정 복구: OTP 비활성화 및 비밀번호 초기화",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예시:
  conda run -n cruxsiem python scripts/reset_account.py --username administrator
  conda run -n cruxsiem python scripts/reset_account.py --username forewalk

주의:
  이 스크립트는 계정 복구 목적으로만 사용해야 합니다.
  무단으로 다른 사용자의 계정을 초기화하지 마세요.
        """
    )
    parser.add_argument(
        "--username",
        required=True,
        help="초기화할 사용자 ID"
    )

    args = parser.parse_args()

    print("=" * 60)
    print("🔐 CruxSIEM 계정 복구 스크립트")
    print("=" * 60)

    success = await reset_account(args.username)

    print("\n" + "=" * 60)

    return 0 if success else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
