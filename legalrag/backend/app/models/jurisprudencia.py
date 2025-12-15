"""
Modelos de Jurisprudencia y Legislación.
"""
from datetime import datetime, date
from enum import Enum
from typing import Optional
from sqlalchemy import String, DateTime, Date, Text, Integer, Boolean, Enum as SQLEnum, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Jurisdiccion(str, Enum):
    """Jurisdicción de la sentencia."""
    CIVIL = "civil"
    PENAL = "penal"
    CONTENCIOSO = "contencioso_administrativo"
    SOCIAL = "social"
    MERCANTIL = "mercantil"
    MILITAR = "militar"


class TipoTribunal(str, Enum):
    """Tipo de tribunal."""
    TRIBUNAL_SUPREMO = "tribunal_supremo"
    AUDIENCIA_NACIONAL = "audiencia_nacional"
    TSJ = "tribunal_superior_justicia"
    AUDIENCIA_PROVINCIAL = "audiencia_provincial"
    JUZGADO_PRIMERA_INSTANCIA = "juzgado_primera_instancia"
    JUZGADO_INSTRUCCION = "juzgado_instruccion"
    JUZGADO_MERCANTIL = "juzgado_mercantil"
    JUZGADO_SOCIAL = "juzgado_social"
    OTRO = "otro"


class Jurisprudencia(Base):
    """Sentencia o resolución judicial indexada."""

    __tablename__ = "jurisprudencia"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Identificación CENDOJ
    ecli: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True)
    roj: Mapped[Optional[str]] = mapped_column(String(50), index=True)
    cendoj_id: Mapped[Optional[str]] = mapped_column(String(50))

    # Tribunal
    tribunal: Mapped[str] = mapped_column(String(300), nullable=False)
    tipo_tribunal: Mapped[TipoTribunal] = mapped_column(SQLEnum(TipoTribunal))
    sede: Mapped[Optional[str]] = mapped_column(String(100))
    seccion: Mapped[Optional[str]] = mapped_column(String(50))

    # Resolución
    tipo_resolucion: Mapped[str] = mapped_column(String(50), default="Sentencia")
    numero_resolucion: Mapped[Optional[str]] = mapped_column(String(50))
    fecha_resolucion: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    ponente: Mapped[Optional[str]] = mapped_column(String(200))

    # Clasificación
    jurisdiccion: Mapped[Jurisdiccion] = mapped_column(
        SQLEnum(Jurisdiccion),
        nullable=False,
        index=True
    )
    materia: Mapped[Optional[str]] = mapped_column(String(200))
    voces: Mapped[Optional[str]] = mapped_column(Text)  # Descriptores separados por ;

    # Contenido
    cabecera: Mapped[Optional[str]] = mapped_column(Text)
    antecedentes: Mapped[Optional[str]] = mapped_column(Text)
    fundamentos_derecho: Mapped[str] = mapped_column(Text, nullable=False)
    fallo: Mapped[Optional[str]] = mapped_column(Text)
    texto_completo: Mapped[str] = mapped_column(Text, nullable=False)

    # Indexación
    indexada: Mapped[bool] = mapped_column(Boolean, default=False)
    qdrant_id: Mapped[Optional[str]] = mapped_column(String(100))

    # Metadatos
    fuente: Mapped[str] = mapped_column(String(50), default="manual")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    __table_args__ = (
        Index('ix_jurisprudencia_jurisdiccion_fecha', 'jurisdiccion', 'fecha_resolucion'),
    )

    def __repr__(self):
        return f"<Jurisprudencia {self.roj or self.ecli}>"


class TipoLegislacion(str, Enum):
    """Tipo de norma legal."""
    LEY_ORGANICA = "ley_organica"
    LEY = "ley"
    REAL_DECRETO_LEY = "real_decreto_ley"
    REAL_DECRETO = "real_decreto"
    ORDEN_MINISTERIAL = "orden_ministerial"
    REGLAMENTO_UE = "reglamento_ue"
    DIRECTIVA_UE = "directiva_ue"
    OTRO = "otro"


class Legislacion(Base):
    """Norma legal indexada."""

    __tablename__ = "legislacion"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Identificación
    codigo: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    titulo: Mapped[str] = mapped_column(String(500), nullable=False)
    titulo_corto: Mapped[Optional[str]] = mapped_column(String(200))

    # Clasificación
    tipo: Mapped[TipoLegislacion] = mapped_column(SQLEnum(TipoLegislacion), nullable=False)
    ambito: Mapped[str] = mapped_column(String(50), default="estatal")  # estatal, autonomico, ue
    materia: Mapped[Optional[str]] = mapped_column(String(200))

    # Fechas
    fecha_publicacion: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_entrada_vigor: Mapped[Optional[date]] = mapped_column(Date)
    vigente: Mapped[bool] = mapped_column(Boolean, default=True)

    # Referencia BOE
    boe_referencia: Mapped[Optional[str]] = mapped_column(String(50))
    boe_url: Mapped[Optional[str]] = mapped_column(String(500))

    # Contenido
    preambulo: Mapped[Optional[str]] = mapped_column(Text)
    articulado: Mapped[str] = mapped_column(Text, nullable=False)
    disposiciones: Mapped[Optional[str]] = mapped_column(Text)

    # Indexación
    indexada: Mapped[bool] = mapped_column(Boolean, default=False)
    qdrant_ids: Mapped[Optional[str]] = mapped_column(Text)  # IDs de chunks

    # Metadatos
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    def __repr__(self):
        return f"<Legislacion {self.titulo_corto or self.codigo}>"
