"""
Modelos de Caso y Análisis.
"""
from datetime import datetime
from enum import Enum
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, DateTime, ForeignKey, Text, Integer, JSON, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from .user import User
    from .document import Document


class TipoCaso(str, Enum):
    """Tipos de caso judicial."""
    CIVIL = "civil"
    PENAL = "penal"
    MERCANTIL = "mercantil"
    LABORAL = "laboral"
    CONTENCIOSO = "contencioso_administrativo"
    CONSUMO = "consumo"
    FAMILIA = "familia"
    OTRO = "otro"


class RolCliente(str, Enum):
    """Rol del cliente en el procedimiento."""
    DEMANDANTE = "demandante"
    DEMANDADO = "demandado"
    ACUSACION_PARTICULAR = "acusacion_particular"
    INVESTIGADO = "investigado"
    TERCERO = "tercero"


class EstadoCaso(str, Enum):
    """Estado del caso en la plataforma."""
    PENDIENTE = "pendiente"
    EN_ANALISIS = "en_analisis"
    ANALIZADO = "analizado"
    ARCHIVADO = "archivado"


class Case(Base):
    """Caso judicial - entidad principal de trabajo."""

    __tablename__ = "cases"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Identificación
    referencia: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    titulo: Mapped[str] = mapped_column(String(300), nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(Text)

    # Clasificación jurídica
    tipo_caso: Mapped[TipoCaso] = mapped_column(SQLEnum(TipoCaso), nullable=False)
    rol_cliente: Mapped[RolCliente] = mapped_column(SQLEnum(RolCliente), nullable=False)
    juzgado: Mapped[Optional[str]] = mapped_column(String(200))
    numero_procedimiento: Mapped[Optional[str]] = mapped_column(String(100))

    # Estado
    estado: Mapped[EstadoCaso] = mapped_column(
        SQLEnum(EstadoCaso),
        default=EstadoCaso.PENDIENTE
    )

    # Relaciones
    abogado_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    abogado: Mapped["User"] = relationship(back_populates="casos")

    documentos: Mapped[List["Document"]] = relationship(
        back_populates="caso",
        cascade="all, delete-orphan"
    )
    analisis: Mapped[List["CaseAnalysis"]] = relationship(
        back_populates="caso",
        cascade="all, delete-orphan"
    )

    # Fechas
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    def __repr__(self):
        return f"<Case {self.referencia}: {self.titulo[:50]}>"


class CaseAnalysis(Base):
    """Análisis generado por IA para un caso."""

    __tablename__ = "case_analyses"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    caso_id: Mapped[int] = mapped_column(ForeignKey("cases.id"), nullable=False)

    # Resumen ejecutivo
    resumen_ejecutivo: Mapped[str] = mapped_column(Text, nullable=False)

    # Análisis estructurado (JSON)
    hechos_relevantes: Mapped[dict] = mapped_column(JSON, default=list)
    problemas_juridicos: Mapped[dict] = mapped_column(JSON, default=list)
    normativa_aplicable: Mapped[dict] = mapped_column(JSON, default=list)
    jurisprudencia_relevante: Mapped[dict] = mapped_column(JSON, default=list)

    # Estrategia
    estrategia_defensa: Mapped[Optional[str]] = mapped_column(Text)
    estrategia_ataque: Mapped[Optional[str]] = mapped_column(Text)
    argumentos_principales: Mapped[dict] = mapped_column(JSON, default=list)

    # Riesgos
    riesgos: Mapped[dict] = mapped_column(JSON, default=list)
    puntos_debiles: Mapped[dict] = mapped_column(JSON, default=list)
    recomendaciones: Mapped[dict] = mapped_column(JSON, default=list)

    # Metadatos
    version: Mapped[int] = mapped_column(Integer, default=1)
    modelo_usado: Mapped[str] = mapped_column(String(100))
    tokens_consumidos: Mapped[int] = mapped_column(Integer, default=0)

    # Fechas
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relaciones
    caso: Mapped["Case"] = relationship(back_populates="analisis")

    def __repr__(self):
        return f"<CaseAnalysis caso={self.caso_id} v{self.version}>"
