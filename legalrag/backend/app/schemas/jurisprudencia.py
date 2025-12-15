"""
Schemas de Jurisprudencia y Legislación.
"""
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field

from app.models.jurisprudencia import Jurisdiccion, TipoTribunal, TipoLegislacion


# --- Jurisprudencia ---
class JurisprudenciaBase(BaseModel):
    """Campos base de jurisprudencia."""
    ecli: Optional[str] = None
    roj: Optional[str] = None
    tribunal: str
    tipo_tribunal: TipoTribunal
    sede: Optional[str] = None
    seccion: Optional[str] = None
    tipo_resolucion: str = "Sentencia"
    numero_resolucion: Optional[str] = None
    fecha_resolucion: date
    ponente: Optional[str] = None
    jurisdiccion: Jurisdiccion
    materia: Optional[str] = None
    voces: Optional[str] = None


class JurisprudenciaCreate(JurisprudenciaBase):
    """Schema para crear jurisprudencia."""
    cabecera: Optional[str] = None
    antecedentes: Optional[str] = None
    fundamentos_derecho: str
    fallo: Optional[str] = None
    texto_completo: str


class JurisprudenciaUpdate(BaseModel):
    """Schema para actualizar jurisprudencia."""
    materia: Optional[str] = None
    voces: Optional[str] = None


class JurisprudenciaResponse(JurisprudenciaBase):
    """Respuesta con datos de jurisprudencia."""
    id: int
    indexada: bool
    fuente: str
    created_at: datetime

    class Config:
        from_attributes = True


class JurisprudenciaFull(JurisprudenciaResponse):
    """Jurisprudencia con contenido completo."""
    cabecera: Optional[str]
    antecedentes: Optional[str]
    fundamentos_derecho: str
    fallo: Optional[str]
    texto_completo: str


class JurisprudenciaSearch(BaseModel):
    """Resultado de búsqueda de jurisprudencia."""
    id: int
    ecli: Optional[str]
    roj: Optional[str]
    tribunal: str
    fecha_resolucion: date
    jurisdiccion: Jurisdiccion
    extracto: str
    score: float  # Relevancia de búsqueda

    class Config:
        from_attributes = True


# --- Legislación ---
class LegislacionBase(BaseModel):
    """Campos base de legislación."""
    codigo: str
    titulo: str
    titulo_corto: Optional[str] = None
    tipo: TipoLegislacion
    ambito: str = "estatal"
    materia: Optional[str] = None
    fecha_publicacion: date
    fecha_entrada_vigor: Optional[date] = None
    vigente: bool = True
    boe_referencia: Optional[str] = None
    boe_url: Optional[str] = None


class LegislacionCreate(LegislacionBase):
    """Schema para crear legislación."""
    preambulo: Optional[str] = None
    articulado: str
    disposiciones: Optional[str] = None


class LegislacionResponse(LegislacionBase):
    """Respuesta con datos de legislación."""
    id: int
    indexada: bool
    created_at: datetime

    class Config:
        from_attributes = True


class LegislacionFull(LegislacionResponse):
    """Legislación con contenido completo."""
    preambulo: Optional[str]
    articulado: str
    disposiciones: Optional[str]


# --- Búsqueda RAG ---
class RAGQuery(BaseModel):
    """Consulta al sistema RAG."""
    query: str = Field(..., min_length=10)
    jurisdiccion: Optional[Jurisdiccion] = None
    fecha_desde: Optional[date] = None
    fecha_hasta: Optional[date] = None
    tipo_tribunal: Optional[TipoTribunal] = None
    limit: int = Field(default=10, ge=1, le=50)


class RAGResult(BaseModel):
    """Resultado de búsqueda RAG."""
    tipo: str  # jurisprudencia, legislacion, documento
    id: int
    titulo: str
    extracto: str
    score: float
    metadatos: dict


class RAGResponse(BaseModel):
    """Respuesta de búsqueda RAG."""
    query: str
    resultados: List[RAGResult]
    tiempo_ms: int
