"""
Modelo de Documento.
"""
from datetime import datetime
from enum import Enum
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, DateTime, ForeignKey, Text, Integer, Boolean, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from .case import Case


class TipoDocumento(str, Enum):
    """Tipos de documento legal."""
    DEMANDA = "demanda"
    CONTESTACION = "contestacion"
    CONTRATO = "contrato"
    ATESTADO = "atestado"
    ESCRITO_JUDICIAL = "escrito_judicial"
    SENTENCIA = "sentencia"
    AUTO = "auto"
    PROVIDENCIA = "providencia"
    RECURSO = "recurso"
    PRUEBA = "prueba"
    INFORME_PERICIAL = "informe_pericial"
    OTRO = "otro"


class EstadoProcesamiento(str, Enum):
    """Estado de procesamiento del documento."""
    PENDIENTE = "pendiente"
    PROCESANDO = "procesando"
    PROCESADO = "procesado"
    ERROR = "error"


class Document(Base):
    """Documento subido por el usuario."""

    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Archivo
    nombre_original: Mapped[str] = mapped_column(String(300), nullable=False)
    nombre_almacenado: Mapped[str] = mapped_column(String(300), nullable=False)
    ruta_archivo: Mapped[str] = mapped_column(String(500), nullable=False)
    tipo_mime: Mapped[str] = mapped_column(String(100), nullable=False)
    tamano_bytes: Mapped[int] = mapped_column(Integer, nullable=False)

    # Clasificación
    tipo_documento: Mapped[TipoDocumento] = mapped_column(
        SQLEnum(TipoDocumento),
        default=TipoDocumento.OTRO
    )
    descripcion: Mapped[Optional[str]] = mapped_column(Text)

    # Procesamiento
    estado: Mapped[EstadoProcesamiento] = mapped_column(
        SQLEnum(EstadoProcesamiento),
        default=EstadoProcesamiento.PENDIENTE
    )
    texto_extraido: Mapped[Optional[str]] = mapped_column(Text)
    num_paginas: Mapped[Optional[int]] = mapped_column(Integer)
    error_mensaje: Mapped[Optional[str]] = mapped_column(Text)

    # Embeddings
    embeddings_generados: Mapped[bool] = mapped_column(Boolean, default=False)
    qdrant_ids: Mapped[Optional[str]] = mapped_column(Text)  # IDs separados por coma

    # Relaciones
    caso_id: Mapped[int] = mapped_column(ForeignKey("cases.id"), nullable=False)
    caso: Mapped["Case"] = relationship(back_populates="documentos")

    # Fechas
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    def __repr__(self):
        return f"<Document {self.nombre_original}>"

    @property
    def extension(self) -> str:
        """Retorna la extensión del archivo."""
        return self.nombre_original.rsplit(".", 1)[-1].lower()
