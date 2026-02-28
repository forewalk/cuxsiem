from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "cruxSIEM"
    DEBUG: bool = False

    OPENSEARCH_HOST: str = ""
    OPENSEARCH_PORT: int = 9200
    OPENSEARCH_USER: str = ""
    OPENSEARCH_PASSWORD: str = ""
    OPENSEARCH_USE_SSL: bool = True
    OPENSEARCH_VERIFY_CERTS: bool = False
    OPENSEARCH_CA_CERTS: str | None = None

    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    # JWT Settings
    JWT_SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440  # 24 hours
    JWT_EXPIRE_MINUTES_REMEMBER: int = 10080  # 7 days

    # OTP Settings
    OTP_ENCRYPTION_KEY: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
