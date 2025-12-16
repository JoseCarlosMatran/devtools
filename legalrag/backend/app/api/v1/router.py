"""
Router principal de la API v1.
"""
import logging
from fastapi import APIRouter

logger = logging.getLogger(__name__)
api_router = APIRouter()

# Autenticación (siempre disponible)
from app.api.v1.endpoints import auth
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Autenticación"]
)

# Casos (siempre disponible)
from app.api.v1.endpoints import cases
api_router.include_router(
    cases.router,
    prefix="/cases",
    tags=["Casos"]
)

# Los siguientes endpoints requieren dependencias adicionales (RAG, PDF, etc.)
# Se cargan de forma condicional
try:
    from app.api.v1.endpoints import documents
    api_router.include_router(
        documents.router,
        prefix="/documents",
        tags=["Documentos"]
    )
except ImportError as e:
    logger.warning(f"Documentos endpoint no disponible: {e}")

try:
    from app.api.v1.endpoints import analysis
    api_router.include_router(
        analysis.router,
        prefix="/analysis",
        tags=["Análisis"]
    )
except ImportError as e:
    logger.warning(f"Análisis endpoint no disponible: {e}")

try:
    from app.api.v1.endpoints import jurisprudencia
    api_router.include_router(
        jurisprudencia.router,
        prefix="/jurisprudencia",
        tags=["Jurisprudencia"]
    )
except ImportError as e:
    logger.warning(f"Jurisprudencia endpoint no disponible: {e}")

try:
    from app.api.v1.endpoints import export
    api_router.include_router(
        export.router,
        prefix="/export",
        tags=["Exportación"]
    )
except ImportError as e:
    logger.warning(f"Export endpoint no disponible: {e}")
