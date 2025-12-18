"""
Endpoints para ingesta de jurisprudencia desde CENDOJ y legislación desde BOE.
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
from app.models.jurisprudencia import Jurisprudencia, Jurisdiccion, TipoTribunal, Legislacion, TipoLegislacion
from app.services.cendoj_service import (
    CendojService, CendojSearchParams,
    CendojJurisdiccion, CendojTipoOrgano
)
from app.services.boe_service import BOEService

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


class JurisprudenciaManualCreate(BaseModel):
    """Datos para crear jurisprudencia manualmente."""
    ecli: Optional[str] = None
    roj: Optional[str] = None
    tribunal: str
    tipo_tribunal: str  # tribunal_supremo, audiencia_nacional, tsj, audiencia_provincial, etc.
    sede: Optional[str] = None
    seccion: Optional[str] = None
    tipo_resolucion: str = "Sentencia"
    numero_resolucion: Optional[str] = None
    fecha_resolucion: date
    ponente: Optional[str] = None
    jurisdiccion: str  # civil, penal, social, contencioso_administrativo, mercantil, militar
    materia: Optional[str] = None
    voces: Optional[str] = None  # Descriptores separados por ;
    cabecera: Optional[str] = None
    antecedentes: Optional[str] = None
    fundamentos_derecho: str
    fallo: Optional[str] = None
    texto_completo: str


class JurisprudenciaManualResponse(BaseModel):
    """Respuesta de creación manual."""
    id: int
    ecli: Optional[str]
    roj: Optional[str]
    tribunal: str
    fecha_resolucion: str
    indexada: bool
    message: str


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


@router.post("/ingest-click", response_model=IngestionResponse)
async def ingest_by_clicking(
    max_documentos: int = 5,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN_DESPACHO, UserRole.SUPER_ADMIN))
):
    """
    Ingesta sentencias navegando por clics (evita protección anti-scraping).

    Este método navega dentro de CENDOJ haciendo clic en los enlaces,
    lo que mantiene la sesión y evita que CENDOJ bloquee las peticiones.

    Requiere rol de administrador.
    """
    if max_documentos > 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Máximo 20 documentos por sesión de clic"
        )

    service = CendojService()

    stats = {
        "searched": 0,
        "downloaded": 0,
        "saved": 0,
        "duplicates": 0,
        "errors": 0
    }

    try:
        # Obtener documentos navegando por clics
        sentencias = await service.fetch_documents_by_clicking(max_documents=max_documentos)
        stats["searched"] = max_documentos
        stats["downloaded"] = len(sentencias)

        # Guardar cada sentencia
        for sentencia in sentencias:
            try:
                saved = await service.ingest_sentencia(sentencia, db, index_in_qdrant=True)
                if saved:
                    stats["saved"] += 1
                else:
                    stats["duplicates"] += 1
            except Exception as e:
                logger.error(f"Error guardando sentencia: {e}")
                stats["errors"] += 1

        return IngestionResponse(
            searched=stats["searched"],
            downloaded=stats["downloaded"],
            saved=stats["saved"],
            duplicates=stats["duplicates"],
            errors=stats["errors"],
            message=f"Ingesta completada: {stats['saved']} nuevas sentencias guardadas"
        )
    except Exception as e:
        logger.error(f"Error en ingesta por clic: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en proceso de ingesta: {str(e)}"
        )
    finally:
        await service.close()


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


@router.post("/manual", response_model=JurisprudenciaManualResponse)
async def create_jurisprudencia_manual(
    data: JurisprudenciaManualCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN_DESPACHO, UserRole.SUPER_ADMIN))
):
    """
    Crea una sentencia manualmente.

    Útil para cargar sentencias de ejemplo o importar desde fuentes externas.
    Indexa automáticamente en Qdrant si está disponible.

    Requiere rol de administrador.
    """
    # Validar tipo_tribunal
    try:
        tipo_tribunal_enum = TipoTribunal(data.tipo_tribunal)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"tipo_tribunal inválido. Valores: {[t.value for t in TipoTribunal]}"
        )

    # Validar jurisdicción
    try:
        jurisdiccion_enum = Jurisdiccion(data.jurisdiccion)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"jurisdiccion inválida. Valores: {[j.value for j in Jurisdiccion]}"
        )

    # Verificar duplicados por ECLI o ROJ
    if data.ecli:
        result = await db.execute(
            select(Jurisprudencia).where(Jurisprudencia.ecli == data.ecli)
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe una sentencia con ECLI {data.ecli}"
            )

    if data.roj:
        result = await db.execute(
            select(Jurisprudencia).where(Jurisprudencia.roj == data.roj)
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe una sentencia con ROJ {data.roj}"
            )

    # Crear sentencia
    sentencia = Jurisprudencia(
        ecli=data.ecli,
        roj=data.roj,
        tribunal=data.tribunal,
        tipo_tribunal=tipo_tribunal_enum,
        sede=data.sede,
        seccion=data.seccion,
        tipo_resolucion=data.tipo_resolucion,
        numero_resolucion=data.numero_resolucion,
        fecha_resolucion=data.fecha_resolucion,
        ponente=data.ponente,
        jurisdiccion=jurisdiccion_enum,
        materia=data.materia,
        voces=data.voces,
        cabecera=data.cabecera,
        antecedentes=data.antecedentes,
        fundamentos_derecho=data.fundamentos_derecho,
        fallo=data.fallo,
        texto_completo=data.texto_completo,
        fuente="manual",
        indexada=False
    )

    db.add(sentencia)
    await db.flush()

    # Indexar en Qdrant
    indexada = False
    try:
        from app.services.rag_service import RAGService
        rag_service = RAGService()

        metadata = {
            "ecli": sentencia.ecli,
            "roj": sentencia.roj,
            "tribunal": sentencia.tribunal,
            "tipo_tribunal": sentencia.tipo_tribunal.value,
            "jurisdiccion": sentencia.jurisdiccion.value,
            "fecha_resolucion": sentencia.fecha_resolucion.isoformat(),
            "tipo_documento": "jurisprudencia"
        }

        qdrant_id = await rag_service.index_documento(
            documento_id=sentencia.id,
            texto=sentencia.texto_completo,
            metadata=metadata,
            collection="jurisprudencia"
        )

        if qdrant_id:
            sentencia.qdrant_id = qdrant_id if isinstance(qdrant_id, str) else ",".join(qdrant_id)
            sentencia.indexada = True
            indexada = True

    except Exception as e:
        logger.warning(f"No se pudo indexar en Qdrant: {e}")

    await db.commit()
    await db.refresh(sentencia)

    return JurisprudenciaManualResponse(
        id=sentencia.id,
        ecli=sentencia.ecli,
        roj=sentencia.roj,
        tribunal=sentencia.tribunal,
        fecha_resolucion=sentencia.fecha_resolucion.isoformat(),
        indexada=indexada,
        message=f"Sentencia creada correctamente" + (" e indexada en Qdrant" if indexada else "")
    )


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


# ============ Endpoints BOE (Legislación) ============

class BOEIngestionRequest(BaseModel):
    """Parámetros para ingesta del BOE."""
    fecha: date
    max_documentos: int = 20
    solo_disposiciones: bool = True


class BOEIngestionResponse(BaseModel):
    """Respuesta de ingesta BOE."""
    encontrados: int
    guardados: int
    duplicados: int
    errores: int
    message: str


class LegislacionStats(BaseModel):
    """Estadísticas de legislación."""
    total: int
    por_tipo: dict
    vigentes: int
    no_vigentes: int
    indexadas: int


@router.get("/boe/stats", response_model=LegislacionStats)
async def get_legislacion_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene estadísticas de la legislación indexada.
    """
    # Total
    result = await db.execute(select(func.count(Legislacion.id)))
    total = result.scalar() or 0

    # Por tipo
    result = await db.execute(
        select(Legislacion.tipo, func.count(Legislacion.id))
        .group_by(Legislacion.tipo)
    )
    por_tipo = {row[0].value if row[0] else "otro": row[1] for row in result.all()}

    # Vigentes
    result = await db.execute(
        select(func.count(Legislacion.id)).where(Legislacion.vigente == True)
    )
    vigentes = result.scalar() or 0

    # Indexadas
    result = await db.execute(
        select(func.count(Legislacion.id)).where(Legislacion.indexada == True)
    )
    indexadas = result.scalar() or 0

    return LegislacionStats(
        total=total,
        por_tipo=por_tipo,
        vigentes=vigentes,
        no_vigentes=total - vigentes,
        indexadas=indexadas
    )


@router.post("/boe/ingest", response_model=BOEIngestionResponse)
async def ingest_boe(
    request: BOEIngestionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN_DESPACHO, UserRole.SUPER_ADMIN))
):
    """
    Ingesta legislación del BOE para una fecha específica.

    Descarga todos los documentos publicados en el BOE en la fecha indicada.
    Por defecto solo descarga disposiciones generales (secciones I, II, III).

    Requiere rol de administrador.
    """
    if request.max_documentos > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Máximo 100 documentos por petición"
        )

    service = BOEService()

    try:
        stats = await service.ingest_por_fecha(
            fecha=request.fecha,
            db=db,
            max_documentos=request.max_documentos,
            index_in_qdrant=True
        )

        return BOEIngestionResponse(
            encontrados=stats["encontrados"],
            guardados=stats["guardados"],
            duplicados=stats["duplicados"],
            errores=stats["errores"],
            message=f"Ingesta BOE completada: {stats['guardados']} documentos guardados"
        )
    except Exception as e:
        logger.error(f"Error en ingesta BOE: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en ingesta BOE: {str(e)}"
        )


@router.get("/boe/preview/{fecha}")
async def preview_boe(
    fecha: date,
    current_user: User = Depends(get_current_user)
):
    """
    Preview del sumario del BOE para una fecha.
    Muestra los documentos disponibles sin descargarlos.
    """
    service = BOEService()

    try:
        sumario = await service.get_sumario(fecha)

        if sumario.get("status", {}).get("code") != "200":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No hay BOE para la fecha {fecha}"
            )

        # Contar documentos por sección
        data = sumario.get("data", {}).get("sumario", {})
        diario = data.get("diario", [])

        resumen = {
            "fecha": fecha.isoformat(),
            "secciones": [],
            "total_documentos": 0
        }

        for d in diario:
            for seccion in d.get("seccion", []):
                num_docs = 0
                for depto in seccion.get("departamento", []):
                    for epigrafe in depto.get("epigrafe", []):
                        items = epigrafe.get("item", [])
                        if isinstance(items, dict):
                            num_docs += 1
                        else:
                            num_docs += len(items)

                resumen["secciones"].append({
                    "codigo": seccion.get("codigo"),
                    "nombre": seccion.get("nombre"),
                    "documentos": num_docs
                })
                resumen["total_documentos"] += num_docs

        return resumen

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo preview BOE: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error conectando con BOE: {str(e)}"
        )
    finally:
        await service.close()


@router.get("/boe/documento/{identificador}")
async def get_documento_boe(
    identificador: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene un documento específico del BOE por su identificador.
    Primero busca en la base de datos local, si no existe lo descarga.
    """
    # Buscar en DB local
    result = await db.execute(
        select(Legislacion).where(Legislacion.codigo == identificador)
    )
    legislacion = result.scalar_one_or_none()

    if legislacion:
        return {
            "source": "local",
            "documento": {
                "id": legislacion.id,
                "codigo": legislacion.codigo,
                "titulo": legislacion.titulo,
                "tipo": legislacion.tipo.value if legislacion.tipo else None,
                "fecha_publicacion": legislacion.fecha_publicacion.isoformat() if legislacion.fecha_publicacion else None,
                "vigente": legislacion.vigente,
                "url": legislacion.boe_url,
                "texto_length": len(legislacion.articulado) if legislacion.articulado else 0,
                "indexada": legislacion.indexada
            }
        }

    # Descargar del BOE
    service = BOEService()
    try:
        doc = await service.fetch_documento(identificador)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Documento {identificador} no encontrado en BOE"
            )

        return {
            "source": "boe",
            "documento": {
                "identificador": doc.identificador,
                "titulo": doc.titulo,
                "tipo": doc.tipo.value if doc.tipo else None,
                "departamento": doc.departamento,
                "fecha_publicacion": doc.fecha_publicacion.isoformat() if doc.fecha_publicacion else None,
                "vigente": doc.vigente,
                "url_html": doc.url_html,
                "url_pdf": doc.url_pdf,
                "texto_length": len(doc.texto_completo) if doc.texto_completo else 0
            }
        }
    finally:
        await service.close()


@router.get("/boe/recent")
async def get_recent_legislacion(
    limit: int = 20,
    tipo: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene la legislación más reciente indexada.
    """
    query = select(Legislacion).order_by(Legislacion.fecha_publicacion.desc())

    if tipo:
        try:
            tipo_enum = TipoLegislacion(tipo)
            query = query.where(Legislacion.tipo == tipo_enum)
        except ValueError:
            pass

    query = query.limit(limit)
    result = await db.execute(query)
    leyes = result.scalars().all()

    return [
        {
            "id": l.id,
            "codigo": l.codigo,
            "titulo": l.titulo[:200] + "..." if len(l.titulo) > 200 else l.titulo,
            "titulo_corto": l.titulo_corto,
            "tipo": l.tipo.value if l.tipo else None,
            "fecha_publicacion": l.fecha_publicacion.isoformat() if l.fecha_publicacion else None,
            "vigente": l.vigente,
            "indexada": l.indexada
        }
        for l in leyes
    ]
