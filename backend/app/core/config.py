from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "CruxSIEM"
    DEBUG: bool = False

    OPENSEARCH_HOST: str = ""
    OPENSEARCH_PORT: int = 9200
    OPENSEARCH_USER: str = ""
    OPENSEARCH_PASSWORD: str = ""
    OPENSEARCH_USE_SSL: bool = True
    OPENSEARCH_VERIFY_CERTS: bool = False

    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
