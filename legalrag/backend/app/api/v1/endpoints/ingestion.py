"""
Endpoints para ingesta de jurisprudencia desde CENDOJ.
"""
import logging
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.jurisprudencia import Jurisprudencia, Jurisdiccion, TipoTribunal
from app.services.cendoj_service import (
    CendojService, CendojSearchParams,
    CendojJurisdiccion, CendojTipoOrgano
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ============ Schemas ============

class IngestionSearchRequest(BaseModel):
    """Parámetros de búsqueda para ingesta."""
    jurisdiccion: Optional[str] = None  # civil, penal, social, contencioso
    tipo_organo: Optional[str] = None  # tribunal_supremo, tsj, audiencia_provincial
    fecha_desde: Optional[date] = None
    fecha_hasta: Optional[date] = None
    texto_libre: Optional[str] = None
    max_documentos: int = 50


class IngestionResponse(BaseModel):
    """Respuesta de proceso de ingesta."""
    searched: int
    downloaded: int
    saved: int
    duplicates: int
    errors: int
    message: str


class JurisprudenciaStats(BaseModel):
    """Estadísticas de jurisprudencia."""
    total: int
    por_jurisdiccion: dict
    por_tipo_tribunal: dict
    indexadas: int
    sin_indexar: int


class IngestionStatus(BaseModel):
    """Estado de un proceso de ingesta en background."""
    task_id: str
    status: str
    progress: Optional[dict] = None


# ============ Estado global para tareas en background ============
_ingestion_tasks = {}


# ============ Endpoints ============

@router.get("/stats", response_model=JurisprudenciaStats)
async def get_jurisprudencia_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene estadísticas de la jurisprudencia indexada.
    """
    # Total
    result = await db.execute(select(func.count(Jurisprudencia.id)))
    total = result.scalar() or 0

    # Por jurisdicción
    result = await db.execute(
        select(Jurisprudencia.jurisdiccion, func.count(Jurisprudencia.id))
        .group_by(Jurisprudencia.jurisdiccion)
    )
    por_jurisdiccion = {row[0].value if row[0] else "desconocido": row[1] for row in result.all()}

    # Por tipo tribunal
    result = await db.execute(
        select(Jurisprudencia.tipo_tribunal, func.count(Jurisprudencia.id))
        .group_by(Jurisprudencia.tipo_tribunal)
    )
    por_tipo_tribunal = {row[0].value if row[0] else "desconocido": row[1] for row in result.all()}

    # Indexadas vs no indexadas
    result = await db.execute(
        select(func.count(Jurisprudencia.id)).where(Jurisprudencia.indexada == True)
    )
    indexadas = result.scalar() or 0

    return JurisprudenciaStats(
        total=total,
        por_jurisdiccion=por_jurisdiccion,
        por_tipo_tribunal=por_tipo_tribunal,
        indexadas=indexadas,
        sin_indexar=total - indexadas
    )


@router.post("/search-preview")
async def search_preview(
    request: IngestionSearchRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Realiza una búsqueda de prueba en CENDOJ sin descargar documentos.
    Útil para estimar el volumen antes de la ingesta completa.
    """
    service = CendojService()

    # Mapear parámetros
    jurisdiccion = None
    if request.jurisdiccion:
        mapping = {
            "civil": CendojJurisdiccion.CIVIL,
            "penal": CendojJurisdiccion.PENAL,
            "social": CendojJurisdiccion.SOCIAL,
            "contencioso": CendojJurisdiccion.CONTENCIOSO,
        }
        jurisdiccion = mapping.get(request.jurisdiccion.lower())

    tipo_organo = None
    if request.tipo_organo:
        mapping = {
            "tribunal_supremo": CendojTipoOrgano.TRIBUNAL_SUPREMO,
            "audiencia_nacional": CendojTipoOrgano.AUDIENCIA_NACIONAL,
            "tsj": CendojTipoOrgano.TSJ,
            "audiencia_provincial": CendojTipoOrgano.AUDIENCIA_PROVINCIAL,
        }
        tipo_organo = mapping.get(request.tipo_organo.lower())

    params = CendojSearchParams(
        jurisdiccion=jurisdiccion,
        tipo_organo=tipo_organo,
        fecha_desde=request.fecha_desde,
        fecha_hasta=request.fecha_hasta,
        texto_libre=request.texto_libre,
        num_registros=min(request.max_documentos, 20)  # Limitar preview
    )

    try:
        results = await service.search(params)
        return {
            "count": len(results),
            "preview": results[:10],  # Solo primeros 10
            "message": f"Encontradas {len(results)} sentencias"
        }
    except Exception as e:
        logger.error(f"Error en búsqueda CENDOJ: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error conectando con CENDOJ: {str(e)}"
        )
    finally:
        await service.close()


@router.post("/ingest", response_model=IngestionResponse)
async def ingest_jurisprudencia(
    request: IngestionSearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN_DESPACHO, UserRole.SUPER_ADMIN))
):
    """
    Inicia un proceso de ingesta síncrono (para cantidades pequeñas).
    Para grandes volúmenes, usar /ingest-background.

    Requiere rol de administrador.
    """
    if request.max_documentos > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Para más de 100 documentos, usar /ingest-background"
        )

    service = CendojService()

    # Mapear parámetros
    jurisdiccion = None
    if request.jurisdiccion:
        mapping = {
            "civil": CendojJurisdiccion.CIVIL,
            "penal": CendojJurisdiccion.PENAL,
            "social": CendojJurisdiccion.SOCIAL,
            "contencioso": CendojJurisdiccion.CONTENCIOSO,
        }
        jurisdiccion = mapping.get(request.jurisdiccion.lower())

    tipo_organo = None
    if request.tipo_organo:
        mapping = {
            "tribunal_supremo": CendojTipoOrgano.TRIBUNAL_SUPREMO,
            "audiencia_nacional": CendojTipoOrgano.AUDIENCIA_NACIONAL,
            "tsj": CendojTipoOrgano.TSJ,
            "audiencia_provincial": CendojTipoOrgano.AUDIENCIA_PROVINCIAL,
        }
        tipo_organo = mapping.get(request.tipo_organo.lower())

    params = CendojSearchParams(
        jurisdiccion=jurisdiccion,
        tipo_organo=tipo_organo,
        fecha_desde=request.fecha_desde,
        fecha_hasta=request.fecha_hasta,
        texto_libre=request.texto_libre,
        num_registros=request.max_documentos
    )

    try:
        stats = await service.ingest_batch(
            params=params,
            db=db,
            max_documents=request.max_documentos,
            index_in_qdrant=True
        )

        return IngestionResponse(
            searched=stats["searched"],
            downloaded=stats["downloaded"],
            saved=stats["saved"],
            duplicates=stats["duplicates"],
            errors=stats["errors"],
            message=f"Ingesta completada: {stats['saved']} nuevas sentencias guardadas"
        )
    except Exception as e:
        logger.error(f"Error en ingesta: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en proceso de ingesta: {str(e)}"
        )


async def _run_background_ingestion(
    task_id: str,
    params: CendojSearchParams,
    max_documents: int,
    db_url: str
):
    """Ejecuta ingesta en background."""
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker

    _ingestion_tasks[task_id] = {"status": "running", "progress": {}}

    try:
        # Crear nueva conexión a DB para el task
        engine = create_async_engine(db_url)
        async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

        service = CendojService()

        async with async_session() as db:
            stats = await service.ingest_batch(
                params=params,
                db=db,
                max_documents=max_documents,
                index_in_qdrant=True
            )

            _ingestion_tasks[task_id] = {
                "status": "completed",
                "progress": stats
            }

    except Exception as e:
        logger.error(f"Error en ingesta background {task_id}: {e}")
        _ingestion_tasks[task_id] = {
            "status": "error",
            "progress": {"error": str(e)}
        }


@router.post("/ingest-background")
async def ingest_background(
    request: IngestionSearchRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_role(UserRole.ADMIN_DESPACHO, UserRole.SUPER_ADMIN))
):
    """
    Inicia un proceso de ingesta en background.
    Retorna un task_id para consultar el progreso.

    Requiere rol de administrador.
    """
    import uuid
    from app.core.config import settings

    task_id = str(uuid.uuid4())

    # Mapear parámetros
    jurisdiccion = None
    if request.jurisdiccion:
        mapping = {
            "civil": CendojJurisdiccion.CIVIL,
            "penal": CendojJurisdiccion.PENAL,
            "social": CendojJurisdiccion.SOCIAL,
            "contencioso": CendojJurisdiccion.CONTENCIOSO,
        }
        jurisdiccion = mapping.get(request.jurisdiccion.lower())

    tipo_organo = None
    if request.tipo_organo:
        mapping = {
            "tribunal_supremo": CendojTipoOrgano.TRIBUNAL_SUPREMO,
            "audiencia_nacional": CendojTipoOrgano.AUDIENCIA_NACIONAL,
            "tsj": CendojTipoOrgano.TSJ,
            "audiencia_provincial": CendojTipoOrgano.AUDIENCIA_PROVINCIAL,
        }
        tipo_organo = mapping.get(request.tipo_organo.lower())

    params = CendojSearchParams(
        jurisdiccion=jurisdiccion,
        tipo_organo=tipo_organo,
        fecha_desde=request.fecha_desde,
        fecha_hasta=request.fecha_hasta,
        texto_libre=request.texto_libre,
        num_registros=request.max_documentos
    )

    background_tasks.add_task(
        _run_background_ingestion,
        task_id,
        params,
        request.max_documentos,
        settings.database_url
    )

    _ingestion_tasks[task_id] = {"status": "pending", "progress": {}}

    return {
        "task_id": task_id,
        "message": "Ingesta iniciada en background",
        "check_status_url": f"/api/v1/ingestion/status/{task_id}"
    }


@router.get("/status/{task_id}", response_model=IngestionStatus)
async def get_ingestion_status(
    task_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Consulta el estado de una tarea de ingesta en background.
    """
    if task_id not in _ingestion_tasks:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tarea no encontrada"
        )

    task = _ingestion_tasks[task_id]
    return IngestionStatus(
        task_id=task_id,
        status=task["status"],
        progress=task.get("progress")
    )


@router.get("/recent")
async def get_recent_jurisprudencia(
    limit: int = 20,
    jurisdiccion: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene las sentencias más recientes indexadas.
    """
    query = select(Jurisprudencia).order_by(Jurisprudencia.created_at.desc())

    if jurisdiccion:
        try:
            jur_enum = Jurisdiccion(jurisdiccion)
            query = query.where(Jurisprudencia.jurisdiccion == jur_enum)
        except ValueError:
            pass

    query = query.limit(limit)
    result = await db.execute(query)
    sentencias = result.scalars().all()

    return [
        {
            "id": s.id,
            "ecli": s.ecli,
            "roj": s.roj,
            "tribunal": s.tribunal,
            "tipo_tribunal": s.tipo_tribunal.value if s.tipo_tribunal else None,
            "jurisdiccion": s.jurisdiccion.value if s.jurisdiccion else None,
            "fecha_resolucion": s.fecha_resolucion.isoformat() if s.fecha_resolucion else None,
            "ponente": s.ponente,
            "indexada": s.indexada,
            "created_at": s.created_at.isoformat() if s.created_at else None
        }
        for s in sentencias
    ]


@router.delete("/{jurisprudencia_id}")
async def delete_jurisprudencia(
    jurisprudencia_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN))
):
    """
    Elimina una sentencia de la base de datos y de Qdrant.
    Solo para super administradores.
    """
    from app.services.rag_service import RAGService
    from app.core.config import settings

    result = await db.execute(
        select(Jurisprudencia).where(Jurisprudencia.id == jurisprudencia_id)
    )
    sentencia = result.scalar_one_or_none()

    if not sentencia:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sentencia no encontrada"
        )

    # Eliminar de Qdrant si estaba indexada
    if sentencia.indexada:
        try:
            rag_service = RAGService()
            await rag_service.delete_by_source(
                collection=settings.qdrant_collection_name,
                source_id=jurisprudencia_id
            )
        except Exception as e:
            logger.warning(f"Error eliminando de Qdrant: {e}")

    # Eliminar de DB
    await db.delete(sentencia)
    await db.commit()

    return {"message": f"Sentencia {jurisprudencia_id} eliminada"}
