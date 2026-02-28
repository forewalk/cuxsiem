"""OpenSearch OTP 인덱스 마이그레이션 스크립트

이 스크립트는 기존 OpenSearch 인덱스에 OTP 관련 필드를 추가합니다.

실행 방법:
    python -m app.scripts.migrate_otp_indices

마이그레이션 항목:
1. cs_users: OTP 관련 필드 5개 추가
2. cs_sessions: otp_verified 필드 추가
3. cs_login_attempts: otp_failure 필드 추가
4. cs_settings: otp_required, otp_grace_period 필드 추가

롤백:
    OpenSearch에서 _snapshot API를 사용하여 이전 백업 복원
"""

import asyncio
import json
from app.core.opensearch import get_opensearch_client


def migrate_cs_users():
    """cs_users 인덱스에 OTP 필드 추가"""
    client = get_opensearch_client()

    mapping_update = {
        "properties": {
            "otp_enabled": {
                "type": "boolean",
                "index": True
            },
            "otp_secret_enc": {
                "type": "keyword",
                "index": False,
                "store": True
            },
            "otp_pending_secret_enc": {
                "type": "keyword",
                "index": False,
                "store": True
            },
            "otp_backup_codes": {
                "type": "keyword",
                "index": False,
                "store": True
            },
            "otp_enrolled_at": {
                "type": "date",
                "format": "strict_date_time"
            }
        }
    }

    try:
        response = client.indices.put_mapping(
            index="cs_users",
            body=mapping_update
        )
        print("✅ cs_users 인덱스 매핑 업데이트 성공")
        print(f"   응답: {response}")
        return True
    except Exception as e:
        print(f"❌ cs_users 인덱스 업데이트 실패: {e}")
        return False


def migrate_cs_sessions():
    """cs_sessions 인덱스에 otp_verified 필드 추가"""
    client = get_opensearch_client()

    mapping_update = {
        "properties": {
            "otp_verified": {
                "type": "boolean",
                "index": True
            }
        }
    }

    try:
        response = client.indices.put_mapping(
            index="cs_sessions",
            body=mapping_update
        )
        print("✅ cs_sessions 인덱스 매핑 업데이트 성공")
        print(f"   응답: {response}")
        return True
    except Exception as e:
        print(f"❌ cs_sessions 인덱스 업데이트 실패: {e}")
        return False


def migrate_cs_login_attempts():
    """cs_login_attempts 인덱스에 otp_failure 필드 추가"""
    client = get_opensearch_client()

    mapping_update = {
        "properties": {
            "otp_failure": {
                "type": "boolean",
                "index": True
            }
        }
    }

    try:
        response = client.indices.put_mapping(
            index="cs_login_attempts",
            body=mapping_update
        )
        print("✅ cs_login_attempts 인덱스 매핑 업데이트 성공")
        print(f"   응답: {response}")
        return True
    except Exception as e:
        print(f"❌ cs_login_attempts 인덱스 업데이트 실패: {e}")
        return False


def migrate_cs_settings():
    """cs_settings 인덱스에 OTP 정책 필드 추가"""
    client = get_opensearch_client()

    mapping_update = {
        "properties": {
            "otp_required": {
                "type": "boolean",
                "index": True
            },
            "otp_grace_period": {
                "type": "integer",
                "index": True
            }
        }
    }

    try:
        response = client.indices.put_mapping(
            index="cs_settings",
            body=mapping_update
        )
        print("✅ cs_settings 인덱스 매핑 업데이트 성공")
        print(f"   응답: {response}")
        return True
    except Exception as e:
        print(f"❌ cs_settings 인덱스 업데이트 실패: {e}")
        return False


def main():
    """모든 마이그레이션 실행"""
    print("\n🔄 OpenSearch OTP 인덱스 마이그레이션 시작...\n")

    results = {
        "cs_users": migrate_cs_users(),
        "cs_sessions": migrate_cs_sessions(),
        "cs_login_attempts": migrate_cs_login_attempts(),
        "cs_settings": migrate_cs_settings()
    }

    print("\n📊 마이그레이션 결과:\n")
    for index, success in results.items():
        status = "✅ 성공" if success else "❌ 실패"
        print(f"   {index}: {status}")

    all_success = all(results.values())
    if all_success:
        print("\n✅ 모든 마이그레이션 완료!\n")
        return 0
    else:
        print("\n❌ 일부 마이그레이션 실패. 위를 참고하세요.\n")
        return 1


if __name__ == "__main__":
    exit_code = main()
    exit(exit_code)
