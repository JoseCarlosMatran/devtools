"""
Endpoints de análisis de casos.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.case import Case, CaseAnalysis, EstadoCaso
from app.schemas.case import CaseAnalysisResponse, AnalysisRequest
from app.services.analysis_service import AnalysisService

router = APIRouter()
analysis_service = AnalysisService()


@router.post("/case/{case_id}", response_model=CaseAnalysisResponse)
async def analyze_case(
    case_id: int,
    request: AnalysisRequest = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Ejecuta análisis completo de un caso.
    Genera estrategia de defensa/ataque con jurisprudencia aplicable.
    """
    # Verificar caso
    result = await db.execute(
        select(Case).where(Case.id == case_id, Case.abogado_id == current_user.id)
    )
    caso = result.scalar_one_or_none()

    if not caso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Caso no encontrado"
        )

    # Verificar si ya existe análisis y no se fuerza nuevo
    if request and not request.forzar_nuevo:
        existing = await db.execute(
            select(CaseAnalysis)
            .where(CaseAnalysis.caso_id == case_id)
            .order_by(CaseAnalysis.created_at.desc())
            .limit(1)
        )
        existing_analysis = existing.scalar_one_or_none()
        if existing_analysis:
            return _format_analysis_response(existing_analysis)

    # Actualizar estado del caso
    caso.estado = EstadoCaso.EN_ANALISIS
    await db.commit()

    # Ejecutar análisis
    try:
        profundidad = request.profundidad if request else "completo"
        analysis = await analysis_service.analyze_case(
            db=db,
            caso_id=case_id,
            profundidad=profundidad
        )
        return _format_analysis_response(analysis)

    except Exception as e:
        caso.estado = EstadoCaso.PENDIENTE
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en el análisis: {str(e)}"
        )


@router.get("/case/{case_id}", response_model=List[CaseAnalysisResponse])
async def get_case_analyses(
    case_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene todos los análisis de un caso.
    """
    # Verificar acceso
    case_result = await db.execute(
        select(Case).where(Case.id == case_id, Case.abogado_id == current_user.id)
    )
    if not case_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Caso no encontrado"
        )

    result = await db.execute(
        select(CaseAnalysis)
        .where(CaseAnalysis.caso_id == case_id)
        .order_by(CaseAnalysis.created_at.desc())
    )
    analyses = result.scalars().all()

    return [_format_analysis_response(a) for a in analyses]


@router.get("/case/{case_id}/latest", response_model=CaseAnalysisResponse)
async def get_latest_analysis(
    case_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene el análisis más reciente de un caso.
    """
    # Verificar acceso
    case_result = await db.execute(
        select(Case).where(Case.id == case_id, Case.abogado_id == current_user.id)
    )
    if not case_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Caso no encontrado"
        )

    result = await db.execute(
        select(CaseAnalysis)
        .where(CaseAnalysis.caso_id == case_id)
        .order_by(CaseAnalysis.created_at.desc())
        .limit(1)
    )
    analysis = result.scalar_one_or_none()

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay análisis disponible. Ejecute primero el análisis del caso."
        )

    return _format_analysis_response(analysis)


@router.get("/{analysis_id}", response_model=CaseAnalysisResponse)
async def get_analysis(
    analysis_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene un análisis específico por ID.
    """
    result = await db.execute(
        select(CaseAnalysis)
        .join(Case)
        .where(CaseAnalysis.id == analysis_id, Case.abogado_id == current_user.id)
    )
    analysis = result.scalar_one_or_none()

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Análisis no encontrado"
        )

    return _format_analysis_response(analysis)


@router.delete("/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_analysis(
    analysis_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Elimina un análisis específico.
    """
    result = await db.execute(
        select(CaseAnalysis)
        .join(Case)
        .where(CaseAnalysis.id == analysis_id, Case.abogado_id == current_user.id)
    )
    analysis = result.scalar_one_or_none()

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Análisis no encontrado"
        )

    await db.delete(analysis)
    await db.commit()


def _format_analysis_response(analysis: CaseAnalysis) -> CaseAnalysisResponse:
    """Formatea análisis para respuesta."""
    return CaseAnalysisResponse(
        id=analysis.id,
        caso_id=analysis.caso_id,
        version=analysis.version,
        resumen_ejecutivo=analysis.resumen_ejecutivo,
        hechos_relevantes=analysis.hechos_relevantes or [],
        problemas_juridicos=analysis.problemas_juridicos or [],
        normativa_aplicable=analysis.normativa_aplicable or [],
        jurisprudencia_relevante=analysis.jurisprudencia_relevante or [],
        estrategia_defensa=analysis.estrategia_defensa,
        estrategia_ataque=analysis.estrategia_ataque,
        argumentos_principales=analysis.argumentos_principales or [],
        riesgos=analysis.riesgos or [],
        puntos_debiles=analysis.puntos_debiles or [],
        recomendaciones=analysis.recomendaciones or [],
        modelo_usado=analysis.modelo_usado,
        created_at=analysis.created_at
    )
