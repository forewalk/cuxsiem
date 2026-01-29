from opensearchpy import OpenSearch

from app.core.config import settings

_client: OpenSearch | None = None


def get_opensearch_client() -> OpenSearch:
    global _client
    if _client is None:
        _client = OpenSearch(
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
            use_ssl=settings.OPENSEARCH_USE_SSL,
            verify_certs=settings.OPENSEARCH_VERIFY_CERTS,
            ssl_show_warn=False,
        )
    return _client


def get_opensearch() -> OpenSearch:
    """FastAPI dependency injection function."""
    return get_opensearch_client()
