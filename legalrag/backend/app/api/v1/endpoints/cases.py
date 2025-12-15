"""
Endpoints de gestión de casos.
"""
from typing import List, Optional
from datetime import datetime
import uuid

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.case import Case, CaseAnalysis, EstadoCaso, TipoCaso
from app.models.document import Document
from app.schemas.case import (
    CaseCreate, CaseResponse, CaseUpdate, CaseSummary
)

router = APIRouter()


def generate_reference() -> str:
    """Genera referencia única para el caso."""
    return f"LR-{datetime.now().strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"


@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
async def create_case(
    case_data: CaseCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Crea un nuevo caso.
    """
    caso = Case(
        referencia=generate_reference(),
        titulo=case_data.titulo,
        descripcion=case_data.descripcion,
        tipo_caso=case_data.tipo_caso,
        rol_cliente=case_data.rol_cliente,
        juzgado=case_data.juzgado,
        numero_procedimiento=case_data.numero_procedimiento,
        abogado_id=current_user.id
    )

    db.add(caso)
    await db.commit()
    await db.refresh(caso)

    return CaseResponse(
        id=caso.id,
        referencia=caso.referencia,
        titulo=caso.titulo,
        descripcion=caso.descripcion,
        tipo_caso=caso.tipo_caso,
        rol_cliente=caso.rol_cliente,
        juzgado=caso.juzgado,
        numero_procedimiento=caso.numero_procedimiento,
        estado=caso.estado,
        abogado_id=caso.abogado_id,
        created_at=caso.created_at,
        updated_at=caso.updated_at,
        documentos_count=0,
        tiene_analisis=False
    )


@router.get("", response_model=List[CaseSummary])
async def list_cases(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    tipo: Optional[TipoCaso] = None,
    estado: Optional[EstadoCaso] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lista casos del usuario con filtros opcionales.
    """
    query = select(Case).where(Case.abogado_id == current_user.id)

    if tipo:
        query = query.where(Case.tipo_caso == tipo)
    if estado:
        query = query.where(Case.estado == estado)
    if search:
        query = query.where(
            Case.titulo.ilike(f"%{search}%") |
            Case.referencia.ilike(f"%{search}%")
        )

    query = query.order_by(Case.updated_at.desc()).offset(skip).limit(limit)

    result = await db.execute(query)
    casos = result.scalars().all()

    return [CaseSummary.model_validate(c) for c in casos]


@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(
    case_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene un caso específico con detalles.
    """
    result = await db.execute(
        select(Case)
        .options(selectinload(Case.documentos), selectinload(Case.analisis))
        .where(Case.id == case_id, Case.abogado_id == current_user.id)
    )
    caso = result.scalar_one_or_none()

    if not caso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Caso no encontrado"
        )

    return CaseResponse(
        id=caso.id,
        referencia=caso.referencia,
        titulo=caso.titulo,
        descripcion=caso.descripcion,
        tipo_caso=caso.tipo_caso,
        rol_cliente=caso.rol_cliente,
        juzgado=caso.juzgado,
        numero_procedimiento=caso.numero_procedimiento,
        estado=caso.estado,
        abogado_id=caso.abogado_id,
        created_at=caso.created_at,
        updated_at=caso.updated_at,
        documentos_count=len(caso.documentos),
        tiene_analisis=len(caso.analisis) > 0
    )


@router.patch("/{case_id}", response_model=CaseResponse)
async def update_case(
    case_id: int,
    update_data: CaseUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualiza un caso existente.
    """
    result = await db.execute(
        select(Case).where(Case.id == case_id, Case.abogado_id == current_user.id)
    )
    caso = result.scalar_one_or_none()

    if not caso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Caso no encontrado"
        )

    # Actualizar campos proporcionados
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(caso, field, value)

    caso.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(caso)

    # Contar documentos
    docs_result = await db.execute(
        select(func.count(Document.id)).where(Document.caso_id == case_id)
    )
    docs_count = docs_result.scalar()

    # Verificar análisis
    analysis_result = await db.execute(
        select(func.count(CaseAnalysis.id)).where(CaseAnalysis.caso_id == case_id)
    )
    has_analysis = analysis_result.scalar() > 0

    return CaseResponse(
        id=caso.id,
        referencia=caso.referencia,
        titulo=caso.titulo,
        descripcion=caso.descripcion,
        tipo_caso=caso.tipo_caso,
        rol_cliente=caso.rol_cliente,
        juzgado=caso.juzgado,
        numero_procedimiento=caso.numero_procedimiento,
        estado=caso.estado,
        abogado_id=caso.abogado_id,
        created_at=caso.created_at,
        updated_at=caso.updated_at,
        documentos_count=docs_count,
        tiene_analisis=has_analysis
    )


@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_case(
    case_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Elimina un caso y todos sus documentos.
    """
    result = await db.execute(
        select(Case).where(Case.id == case_id, Case.abogado_id == current_user.id)
    )
    caso = result.scalar_one_or_none()

    if not caso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Caso no encontrado"
        )

    await db.delete(caso)
    await db.commit()


@router.get("/{case_id}/stats")
async def get_case_stats(
    case_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene estadísticas del caso.
    """
    result = await db.execute(
        select(Case)
        .options(selectinload(Case.documentos), selectinload(Case.analisis))
        .where(Case.id == case_id, Case.abogado_id == current_user.id)
    )
    caso = result.scalar_one_or_none()

    if not caso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Caso no encontrado"
        )

    docs_procesados = sum(1 for d in caso.documentos if d.estado.value == "procesado")
    docs_con_embeddings = sum(1 for d in caso.documentos if d.embeddings_generados)

    return {
        "caso_id": caso.id,
        "documentos_total": len(caso.documentos),
        "documentos_procesados": docs_procesados,
        "documentos_indexados": docs_con_embeddings,
        "analisis_count": len(caso.analisis),
        "ultimo_analisis": caso.analisis[-1].created_at if caso.analisis else None,
        "estado": caso.estado.value
    }
