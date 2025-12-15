"""
Endpoints de exportación y generación de documentos.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import os

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.case import Case, CaseAnalysis
from app.services.pdf_service import PDFService

router = APIRouter()
pdf_service = PDFService()


@router.post("/case/{case_id}/report")
async def export_case_report(
    case_id: int,
    include_jurisprudencia: bool = True,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Genera y descarga informe PDF del caso.
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

    # Obtener último análisis
    analysis_result = await db.execute(
        select(CaseAnalysis)
        .where(CaseAnalysis.caso_id == case_id)
        .order_by(CaseAnalysis.created_at.desc())
        .limit(1)
    )
    analysis = analysis_result.scalar_one_or_none()

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay análisis disponible. Ejecute primero el análisis del caso."
        )

    # Generar PDF
    try:
        filepath = await pdf_service.generate_analysis_report(
            caso=caso,
            analysis=analysis,
            include_jurisprudencia=include_jurisprudencia
        )

        return FileResponse(
            path=filepath,
            filename=os.path.basename(filepath),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={os.path.basename(filepath)}"
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generando PDF: {str(e)}"
        )


@router.post("/case/{case_id}/arguments")
async def export_arguments_template(
    case_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Genera plantilla de argumentos lista para escrito judicial.
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

    # Obtener último análisis
    analysis_result = await db.execute(
        select(CaseAnalysis)
        .where(CaseAnalysis.caso_id == case_id)
        .order_by(CaseAnalysis.created_at.desc())
        .limit(1)
    )
    analysis = analysis_result.scalar_one_or_none()

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay análisis disponible."
        )

    # Generar plantilla
    try:
        filepath = await pdf_service.generate_argument_template(
            caso=caso,
            analysis=analysis
        )

        return FileResponse(
            path=filepath,
            filename=os.path.basename(filepath),
            media_type="application/pdf"
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generando plantilla: {str(e)}"
        )


@router.get("/analysis/{analysis_id}/pdf")
async def export_analysis_pdf(
    analysis_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Exporta un análisis específico a PDF.
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

    # Obtener caso
    case_result = await db.execute(
        select(Case).where(Case.id == analysis.caso_id)
    )
    caso = case_result.scalar_one()

    try:
        filepath = await pdf_service.generate_analysis_report(
            caso=caso,
            analysis=analysis
        )

        return FileResponse(
            path=filepath,
            filename=os.path.basename(filepath),
            media_type="application/pdf"
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generando PDF: {str(e)}"
        )
