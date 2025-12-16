"""
Configuración central de LegalRAG.
Gestiona todas las variables de entorno y configuraciones del sistema.
"""
from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración principal de la aplicación."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    # Aplicación
    app_name: str = "LegalRAG"
    app_env: str = "development"
    debug: bool = True
    secret_key: str = "change-me-in-production"
    api_prefix: str = "/api/v1"

    # Base de datos (SQLite por defecto para desarrollo sin Docker)
    database_url: str = "sqlite+aiosqlite:///./data/legalrag.db"

    # Qdrant
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333
    qdrant_collection_name: str = "jurisprudencia"

    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4-turbo-preview"

    # Embeddings
    embedding_model: str = "intfloat/multilingual-e5-large"
    embedding_dimension: int = 1024

    # JWT
    jwt_secret_key: str = "jwt-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    # Almacenamiento
    upload_dir: str = "./data/uploads"
    export_dir: str = "./data/exports"
    max_upload_size_mb: int = 50

    # CORS
    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    # Logging
    log_level: str = "INFO"

    @property
    def cors_origins_list(self) -> List[str]:
        """Convierte CORS origins string a lista."""
        return [origin.strip() for origin in self.cors_origins.split(",")]

    @property
    def is_production(self) -> bool:
        """Verifica si está en producción."""
        return self.app_env == "production"


@lru_cache()
def get_settings() -> Settings:
    """Obtiene configuración cacheada (singleton)."""
    return Settings()


settings = get_settings()
