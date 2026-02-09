from opensearchpy import OpenSearch
import logging
from app.core.config import settings

# 로깅 설정
logger = logging.getLogger(__name__)

# 싱글톤 클라이언트 인스턴스
_client: OpenSearch | None = None


def get_opensearch_client() -> OpenSearch:
    """
    OpenSearch 클라이언트를 생성하고 반환합니다 (싱글톤 패턴).
    서버의 SSL 지원 여부를 자동으로 감지하여 연결 오류(WRONG_VERSION_NUMBER 등) 발생 시 
    적절한 프로토콜(HTTP/HTTPS)로 자동 전환합니다.
    """
    global _client
    if _client is not None:
        return _client

    # 클라이언트 생성을 위한 공통 설정 함수
    def create_instance(use_ssl: bool):
        return OpenSearch(
            hosts=[
                {
                    "host": settings.OPENSEARCH_HOST,
                    "port": settings.OPENSEARCH_PORT,
                }
            ],
            http_auth=(
                settings.OPENSEARCH_USER,
                settings.OPENSEARCH_PASSWORD,
            )
            if settings.OPENSEARCH_USER
            else None,
            use_ssl=use_ssl,
            verify_certs=settings.OPENSEARCH_VERIFY_CERTS,
            ca_certs=settings.OPENSEARCH_CA_CERTS,
            ssl_show_warn=False,
            timeout=30,
        )

    # 1단계: 설정파일(.env)에 정의된 기본 SSL 설정으로 시도
    initial_ssl_setting = settings.OPENSEARCH_USE_SSL
    client = create_instance(initial_ssl_setting)

    try:
        # 연결 테스트: 서버 정보 조회를 통해 프로토콜 일치 여부 확인
        client.info()
        _client = client
        # logger.info(f"OpenSearch 연결 성공 (SSL: {initial_ssl_setting})")
    except Exception as e:
        error_msg = str(e).lower()
        
        # SSL 불일치 에러(WRONG_VERSION_NUMBER) 또는 관련 프로토콜 오류 감지 시 폴백(Fallback) 수행
        if "wrong_version_number" in error_msg or "unknown_protocol" in error_msg or "ssl_error" in error_msg:
            # 현재 설정의 반대 값으로 재시도
            fallback_ssl = not initial_ssl_setting
            # logger.warning(f"OpenSearch 프로토콜 불일치 감지. SSL: {fallback_ssl} 모드로 자동 전환하여 재시도합니다.")
            
            try:
                fallback_client = create_instance(fallback_ssl)
                fallback_client.info()  # 재시도 연결 확인
                _client = fallback_client
            except Exception as retry_error:
                # 재시도마저 실패할 경우 에러 발생
                # logger.error(f"OpenSearch 자동 전환 연결 실패: {retry_error}")
                raise retry_error
        else:
            # SSL 문제가 아닌 인증 실패나 네트워크 오류 등은 그대로 발생시킴
            raise e

    return _client


def get_opensearch() -> OpenSearch:
    """FastAPI의 의존성 주입(Dependency Injection)을 위한 함수"""
    return get_opensearch_client()