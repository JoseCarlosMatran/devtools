"""
Endpoints de jurisprudencia y legislación.
"""
from typing import List, Optional
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_active_user, require_admin
from app.models.user import User
from app.models.jurisprudencia import Jurisprudencia, Legislacion, Jurisdiccion, TipoTribunal
from app.schemas.jurisprudencia import (
    JurisprudenciaCreate, JurisprudenciaResponse, JurisprudenciaFull,
    JurisprudenciaSearch, LegislacionCreate, LegislacionResponse,
    RAGQuery, RAGResponse, RAGResult
)
from app.services.rag_service import RAGService
from app.services.document_service import DocumentService

router = APIRouter()
rag_service = RAGService()
doc_service = DocumentService()


@router.post("", response_model=JurisprudenciaResponse, status_code=status.HTTP_201_CREATED)
async def create_jurisprudencia(
    data: JurisprudenciaCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Crea una nueva entrada de jurisprudencia.
    Se indexa automáticamente en Qdrant.
    """
    # Verificar duplicado por ECLI o ROJ
    if data.ecli:
        existing = await db.execute(
            select(Jurisprudencia).where(Jurisprudencia.ecli == data.ecli)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe una sentencia con ese ECLI"
            )

    jur = Jurisprudencia(
        ecli=data.ecli,
        roj=data.roj,
        tribunal=data.tribunal,
        tipo_tribunal=data.tipo_tribunal,
        sede=data.sede,
        seccion=data.seccion,
        tipo_resolucion=data.tipo_resolucion,
        numero_resolucion=data.numero_resolucion,
        fecha_resolucion=data.fecha_resolucion,
        ponente=data.ponente,
        jurisdiccion=data.jurisdiccion,
        materia=data.materia,
        voces=data.voces,
        cabecera=data.cabecera,
        antecedentes=data.antecedentes,
        fundamentos_derecho=data.fundamentos_derecho,
        fallo=data.fallo,
        texto_completo=data.texto_completo,
        fuente="manual"
    )

    db.add(jur)
    await db.commit()
    await db.refresh(jur)

    # Indexar en background
    background_tasks.add_task(
        index_jurisprudencia_background,
        jur.id,
        jur.texto_completo,
        {
            "ecli": jur.ecli,
            "roj": jur.roj,
            "tribunal": jur.tribunal,
            "tipo_tribunal": jur.tipo_tribunal.value if jur.tipo_tribunal else None,
            "fecha": jur.fecha_resolucion.isoformat(),
            "jurisdiccion": jur.jurisdiccion.value,
            "materia": jur.materia
        }
    )

    return JurisprudenciaResponse.model_validate(jur)


async def index_jurisprudencia_background(
    jur_id: int,
    texto: str,
    metadata: dict
):
    """Indexa jurisprudencia en background."""
    try:
        from app.core.database import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            await rag_service.index_jurisprudencia(jur_id, texto, metadata)

            result = await db.execute(
                select(Jurisprudencia).where(Jurisprudencia.id == jur_id)
            )
            jur = result.scalar_one_or_none()
            if jur:
                jur.indexada = True
                await db.commit()
    except Exception as e:
        print(f"Error indexando jurisprudencia {jur_id}: {e}")


@router.get("", response_model=List[JurisprudenciaResponse])
async def list_jurisprudencia(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    jurisdiccion: Optional[Jurisdiccion] = None,
    tipo_tribunal: Optional[TipoTribunal] = None,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Lista jurisprudencia con filtros.
    """
    query = select(Jurisprudencia)

    if jurisdiccion:
        query = query.where(Jurisprudencia.jurisdiccion == jurisdiccion)
    if tipo_tribunal:
        query = query.where(Jurisprudencia.tipo_tribunal == tipo_tribunal)
    if fecha_desde:
        query = query.where(Jurisprudencia.fecha_resolucion >= fecha_desde)
    if fecha_hasta:
        query = query.where(Jurisprudencia.fecha_resolucion <= fecha_hasta)
    if search:
        query = query.where(
            Jurisprudencia.tribunal.ilike(f"%{search}%") |
            Jurisprudencia.roj.ilike(f"%{search}%") |
            Jurisprudencia.ecli.ilike(f"%{search}%")
        )

    query = query.order_by(Jurisprudencia.fecha_resolucion.desc()).offset(skip).limit(limit)

    result = await db.execute(query)
    items = result.scalars().all()

    return [JurisprudenciaResponse.model_validate(j) for j in items]


@router.get("/{jur_id}", response_model=JurisprudenciaFull)
async def get_jurisprudencia(
    jur_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene jurisprudencia completa por ID.
    """
    result = await db.execute(
        select(Jurisprudencia).where(Jurisprudencia.id == jur_id)
    )
    jur = result.scalar_one_or_none()

    if not jur:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jurisprudencia no encontrada"
        )

    return JurisprudenciaFull.model_validate(jur)


@router.post("/search", response_model=RAGResponse)
async def search_jurisprudencia(
    query: RAGQuery,
    current_user: User = Depends(get_current_active_user)
):
    """
    Búsqueda semántica de jurisprudencia.
    Encuentra sentencias relevantes para el caso.
    """
    import time
    start = time.time()

    results = await rag_service.search_jurisprudencia(
        query=query.query,
        jurisdiccion=query.jurisdiccion.value if query.jurisdiccion else None,
        tipo_tribunal=query.tipo_tribunal.value if query.tipo_tribunal else None,
        fecha_desde=query.fecha_desde,
        fecha_hasta=query.fecha_hasta,
        limit=query.limit
    )

    elapsed_ms = int((time.time() - start) * 1000)

    return RAGResponse(
        query=query.query,
        resultados=[
            RAGResult(
                tipo="jurisprudencia",
                id=r["id"],
                titulo=f"{r['metadata'].get('tribunal', '')} - {r['metadata'].get('roj', r['metadata'].get('ecli', ''))}",
                extracto=r["textos"][0] if r["textos"] else "",
                score=r["score"],
                metadatos=r["metadata"]
            )
            for r in results
        ],
        tiempo_ms=elapsed_ms
    )


@router.post("/upload-pdf", response_model=JurisprudenciaResponse)
async def upload_jurisprudencia_pdf(
    file: UploadFile = File(...),
    jurisdiccion: Jurisdiccion = Query(...),
    tipo_tribunal: TipoTribunal = Query(...),
    fecha_resolucion: date = Query(...),
    tribunal: str = Query(...),
    roj: Optional[str] = Query(None),
    ecli: Optional[str] = Query(None),
    background_tasks: BackgroundTasks = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Sube una sentencia en PDF y la procesa automáticamente.
    """
    content = await file.read()

    # Guardar temporalmente
    stored_name, file_path, _ = await doc_service.save_file(content, file.filename)

    # Extraer texto
    try:
        texto, _ = await doc_service.extract_text(file_path)
    except Exception as e:
        await doc_service.delete_file(file_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se pudo extraer texto del PDF: {str(e)}"
        )

    # Limpiar archivo temporal
    await doc_service.delete_file(file_path)

    # Crear entrada
    jur = Jurisprudencia(
        ecli=ecli,
        roj=roj,
        tribunal=tribunal,
        tipo_tribunal=tipo_tribunal,
        fecha_resolucion=fecha_resolucion,
        jurisdiccion=jurisdiccion,
        texto_completo=texto,
        fundamentos_derecho=texto,  # Se podría mejorar con parsing
        fuente="upload_pdf"
    )

    db.add(jur)
    await db.commit()
    await db.refresh(jur)

    # Indexar
    if background_tasks:
        background_tasks.add_task(
            index_jurisprudencia_background,
            jur.id,
            texto,
            {
                "ecli": ecli,
                "roj": roj,
                "tribunal": tribunal,
                "tipo_tribunal": tipo_tribunal.value,
                "fecha": fecha_resolucion.isoformat(),
                "jurisdiccion": jurisdiccion.value
            }
        )

    return JurisprudenciaResponse.model_validate(jur)


@router.delete("/{jur_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_jurisprudencia(
    jur_id: int,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Elimina una entrada de jurisprudencia.
    Solo admin.
    """
    result = await db.execute(
        select(Jurisprudencia).where(Jurisprudencia.id == jur_id)
    )
    jur = result.scalar_one_or_none()

    if not jur:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jurisprudencia no encontrada"
        )

    # Eliminar de Qdrant
    if jur.indexada:
        await rag_service.delete_by_source("jurisprudencia", jur_id)

    await db.delete(jur)
    await db.commit()


# --- Legislación ---

@router.post("/legislacion", response_model=LegislacionResponse, status_code=status.HTTP_201_CREATED)
async def create_legislacion(
    data: LegislacionCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Crea una nueva entrada de legislación.
    Solo admin.
    """
    existing = await db.execute(
        select(Legislacion).where(Legislacion.codigo == data.codigo)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe legislación con ese código"
        )

    leg = Legislacion(
        codigo=data.codigo,
        titulo=data.titulo,
        titulo_corto=data.titulo_corto,
        tipo=data.tipo,
        ambito=data.ambito,
        materia=data.materia,
        fecha_publicacion=data.fecha_publicacion,
        fecha_entrada_vigor=data.fecha_entrada_vigor,
        vigente=data.vigente,
        boe_referencia=data.boe_referencia,
        boe_url=data.boe_url,
        preambulo=data.preambulo,
        articulado=data.articulado,
        disposiciones=data.disposiciones
    )

    db.add(leg)
    await db.commit()
    await db.refresh(leg)

    # Indexar
    background_tasks.add_task(
        index_legislacion_background,
        leg.id,
        leg.articulado,
        {
            "codigo": leg.codigo,
            "titulo": leg.titulo,
            "tipo": leg.tipo.value,
            "ambito": leg.ambito,
            "vigente": leg.vigente
        }
    )

    return LegislacionResponse.model_validate(leg)


async def index_legislacion_background(leg_id: int, texto: str, metadata: dict):
    """Indexa legislación en background."""
    try:
        from app.core.database import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            await rag_service.index_legislacion(leg_id, texto, metadata)

            result = await db.execute(
                select(Legislacion).where(Legislacion.id == leg_id)
            )
            leg = result.scalar_one_or_none()
            if leg:
                leg.indexada = True
                await db.commit()
    except Exception as e:
        print(f"Error indexando legislación {leg_id}: {e}")


@router.get("/legislacion", response_model=List[LegislacionResponse])
async def list_legislacion(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    vigente: Optional[bool] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Lista legislación disponible.
    """
    query = select(Legislacion)

    if vigente is not None:
        query = query.where(Legislacion.vigente == vigente)
    if search:
        query = query.where(
            Legislacion.titulo.ilike(f"%{search}%") |
            Legislacion.codigo.ilike(f"%{search}%")
        )

    query = query.order_by(Legislacion.titulo).offset(skip).limit(limit)

    result = await db.execute(query)
    items = result.scalars().all()

    return [LegislacionResponse.model_validate(l) for l in items]


@router.get("/stats")
async def get_jurisprudencia_stats(
    db: AsyncSession = Depends(get_db)
):
    """
    Estadísticas del sistema de jurisprudencia.
    """
    from sqlalchemy import func

    # Contar jurisprudencia
    jur_count = await db.execute(select(func.count(Jurisprudencia.id)))
    jur_indexed = await db.execute(
        select(func.count(Jurisprudencia.id)).where(Jurisprudencia.indexada == True)
    )

    # Contar legislación
    leg_count = await db.execute(select(func.count(Legislacion.id)))
    leg_indexed = await db.execute(
        select(func.count(Legislacion.id)).where(Legislacion.indexada == True)
    )

    # Stats de Qdrant
    qdrant_stats = rag_service.get_collection_stats()

    return {
        "jurisprudencia": {
            "total": jur_count.scalar(),
            "indexadas": jur_indexed.scalar()
        },
        "legislacion": {
            "total": leg_count.scalar(),
            "indexadas": leg_indexed.scalar()
        },
        "vectores": qdrant_stats
    }
