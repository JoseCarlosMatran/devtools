"""
Endpoints de gestión de documentos.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.core.config import settings
from app.models.user import User
from app.models.case import Case
from app.models.document import Document, TipoDocumento, EstadoProcesamiento
from app.schemas.document import DocumentResponse, DocumentWithText
from app.services.document_service import DocumentService
from app.services.rag_service import RAGService

router = APIRouter()
doc_service = DocumentService()
rag_service = RAGService()


async def process_document_background(
    document_id: int,
    file_path: str,
    caso_id: int,
    db_url: str
):
    """Procesa documento en background."""
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker

    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        try:
            # Obtener documento
            result = await db.execute(
                select(Document).where(Document.id == document_id)
            )
            doc = result.scalar_one_or_none()
            if not doc:
                return

            # Actualizar estado
            doc.estado = EstadoProcesamiento.PROCESANDO
            await db.commit()

            # Extraer texto
            texto, num_pages = await doc_service.extract_text(file_path)

            # Detectar tipo si es OTRO
            if doc.tipo_documento == TipoDocumento.OTRO:
                tipo_detectado = doc_service.detect_document_type(texto, doc.nombre_original)
                doc.tipo_documento = tipo_detectado

            doc.texto_extraido = texto
            doc.num_paginas = num_pages
            doc.estado = EstadoProcesamiento.PROCESADO
            await db.commit()

            # Generar embeddings e indexar
            point_ids = await rag_service.index_documento_caso(
                documento_id=document_id,
                caso_id=caso_id,
                texto=texto,
                metadata={
                    "tipo_documento": doc.tipo_documento.value,
                    "nombre": doc.nombre_original
                }
            )

            if point_ids:
                doc.embeddings_generados = True
                doc.qdrant_ids = ",".join(point_ids)
                await db.commit()

        except Exception as e:
            doc.estado = EstadoProcesamiento.ERROR
            doc.error_mensaje = str(e)
            await db.commit()
        finally:
            await engine.dispose()


@router.post("/upload/{case_id}", response_model=DocumentResponse)
async def upload_document(
    case_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    tipo_documento: TipoDocumento = Form(TipoDocumento.OTRO),
    descripcion: str = Form(None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Sube un documento a un caso.
    El procesamiento se realiza en background.
    """
    # Verificar caso existe y pertenece al usuario
    result = await db.execute(
        select(Case).where(Case.id == case_id, Case.abogado_id == current_user.id)
    )
    caso = result.scalar_one_or_none()

    if not caso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Caso no encontrado"
        )

    # Validar tamaño
    content = await file.read()
    if len(content) > settings.max_upload_size_mb * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Archivo demasiado grande. Máximo {settings.max_upload_size_mb}MB"
        )

    # Guardar archivo
    try:
        stored_name, file_path, mime_type = await doc_service.save_file(
            content, file.filename
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    # Crear registro
    documento = Document(
        caso_id=case_id,
        nombre_original=file.filename,
        nombre_almacenado=stored_name,
        ruta_archivo=file_path,
        tipo_mime=mime_type,
        tamano_bytes=len(content),
        tipo_documento=tipo_documento,
        descripcion=descripcion
    )

    db.add(documento)
    await db.commit()
    await db.refresh(documento)

    # Procesar en background
    background_tasks.add_task(
        process_document_background,
        documento.id,
        file_path,
        case_id,
        settings.database_url
    )

    return DocumentResponse.model_validate(documento)


@router.get("/case/{case_id}", response_model=List[DocumentResponse])
async def list_case_documents(
    case_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lista documentos de un caso.
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
        select(Document)
        .where(Document.caso_id == case_id)
        .order_by(Document.created_at.desc())
    )
    documentos = result.scalars().all()

    return [DocumentResponse.model_validate(d) for d in documentos]


@router.get("/{document_id}", response_model=DocumentWithText)
async def get_document(
    document_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene un documento con su texto extraído.
    """
    result = await db.execute(
        select(Document)
        .join(Case)
        .where(Document.id == document_id, Case.abogado_id == current_user.id)
    )
    documento = result.scalar_one_or_none()

    if not documento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documento no encontrado"
        )

    return DocumentWithText.model_validate(documento)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Elimina un documento.
    """
    result = await db.execute(
        select(Document)
        .join(Case)
        .where(Document.id == document_id, Case.abogado_id == current_user.id)
    )
    documento = result.scalar_one_or_none()

    if not documento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documento no encontrado"
        )

    # Eliminar embeddings de Qdrant
    if documento.embeddings_generados:
        await rag_service.delete_by_source(
            "documentos_casos",
            documento.id,
            "documento_id"
        )

    # Eliminar archivo físico
    await doc_service.delete_file(documento.ruta_archivo)

    # Eliminar registro
    await db.delete(documento)
    await db.commit()


@router.post("/{document_id}/reprocess", response_model=DocumentResponse)
async def reprocess_document(
    document_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Reprocesa un documento que falló.
    """
    result = await db.execute(
        select(Document)
        .join(Case)
        .where(Document.id == document_id, Case.abogado_id == current_user.id)
    )
    documento = result.scalar_one_or_none()

    if not documento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documento no encontrado"
        )

    # Resetear estado
    documento.estado = EstadoProcesamiento.PENDIENTE
    documento.error_mensaje = None
    await db.commit()

    # Reprocesar
    background_tasks.add_task(
        process_document_background,
        documento.id,
        documento.ruta_archivo,
        documento.caso_id,
        settings.database_url
    )

    return DocumentResponse.model_validate(documento)
