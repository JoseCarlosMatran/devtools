"""
LegalRAG - API Principal
Plataforma SaaS de análisis jurídico con IA para preparación de casos judiciales.
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.api.v1.router import api_router
from app.core.database import init_db

# Configurar logging
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestiona el ciclo de vida de la aplicación."""
    logger.info(f"🚀 Iniciando {settings.app_name} v1.0.0")

    # Crear directorios necesarios
    os.makedirs(settings.upload_dir, exist_ok=True)
    os.makedirs(settings.export_dir, exist_ok=True)

    # Inicializar base de datos
    await init_db()
    logger.info("✅ Base de datos inicializada")

    # Inicializar Qdrant
    from app.services.rag_service import RAGService
    rag_service = RAGService()
    await rag_service.init_collection()
    logger.info("✅ Colección Qdrant inicializada")

    yield

    logger.info(f"👋 Cerrando {settings.app_name}")


# Crear aplicación FastAPI
app = FastAPI(
    title=settings.app_name,
    description="""
    ## LegalRAG - Plataforma de Análisis Jurídico con IA

    Prepara la defensa o ataque de un caso judicial en minutos.

    ### Funcionalidades principales:
    - 📄 Subida y análisis de documentos legales
    - ⚖️ Identificación automática de problemas jurídicos
    - 📚 RAG con jurisprudencia española
    - 📝 Generación de estrategias de defensa/ataque
    - 📋 Exportación de informes en PDF
    """,
    version="1.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir rutas API
app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/health", tags=["Health"])
async def health_check():
    """Endpoint de salud para monitorización."""
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": "1.0.0",
        "environment": settings.app_env
    }


@app.get("/", tags=["Root"])
async def root():
    """Endpoint raíz con información de la API."""
    return {
        "message": f"Bienvenido a {settings.app_name}",
        "docs": "/docs",
        "api": settings.api_prefix
    }
