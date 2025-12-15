"""
Schemas de Documento.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

from app.models.document import TipoDocumento, EstadoProcesamiento


class DocumentUpload(BaseModel):
    """Metadatos al subir documento."""
    tipo_documento: TipoDocumento = TipoDocumento.OTRO
    descripcion: Optional[str] = None


class DocumentResponse(BaseModel):
    """Respuesta con datos del documento."""
    id: int
    caso_id: int
    nombre_original: str
    tipo_documento: TipoDocumento
    descripcion: Optional[str]
    tipo_mime: str
    tamano_bytes: int
    estado: EstadoProcesamiento
    num_paginas: Optional[int]
    embeddings_generados: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DocumentWithText(DocumentResponse):
    """Documento con texto extraído."""
    texto_extraido: Optional[str]
    error_mensaje: Optional[str]


class DocumentProcessingStatus(BaseModel):
    """Estado de procesamiento del documento."""
    id: int
    nombre: str
    estado: EstadoProcesamiento
    progreso: int = Field(ge=0, le=100)
    mensaje: Optional[str] = None
