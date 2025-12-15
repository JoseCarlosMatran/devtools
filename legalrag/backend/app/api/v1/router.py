"""
Router principal de la API v1.
"""
from fastapi import APIRouter

from app.api.v1.endpoints import auth, cases, documents, analysis, jurisprudencia, export

api_router = APIRouter()

# Autenticación
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Autenticación"]
)

# Casos
api_router.include_router(
    cases.router,
    prefix="/cases",
    tags=["Casos"]
)

# Documentos
api_router.include_router(
    documents.router,
    prefix="/documents",
    tags=["Documentos"]
)

# Análisis
api_router.include_router(
    analysis.router,
    prefix="/analysis",
    tags=["Análisis"]
)

# Jurisprudencia
api_router.include_router(
    jurisprudencia.router,
    prefix="/jurisprudencia",
    tags=["Jurisprudencia"]
)

# Exportación
api_router.include_router(
    export.router,
    prefix="/export",
    tags=["Exportación"]
)
