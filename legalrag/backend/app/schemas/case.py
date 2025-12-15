"""
Schemas de Caso y Análisis.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

from app.models.case import TipoCaso, RolCliente, EstadoCaso


# --- Caso ---
class CaseBase(BaseModel):
    """Campos base del caso."""
    titulo: str = Field(..., min_length=5, max_length=300)
    descripcion: Optional[str] = None
    tipo_caso: TipoCaso
    rol_cliente: RolCliente
    juzgado: Optional[str] = None
    numero_procedimiento: Optional[str] = None


class CaseCreate(CaseBase):
    """Schema para crear caso."""
    pass


class CaseUpdate(BaseModel):
    """Schema para actualizar caso."""
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    tipo_caso: Optional[TipoCaso] = None
    rol_cliente: Optional[RolCliente] = None
    juzgado: Optional[str] = None
    numero_procedimiento: Optional[str] = None
    estado: Optional[EstadoCaso] = None


class CaseResponse(CaseBase):
    """Respuesta con datos del caso."""
    id: int
    referencia: str
    estado: EstadoCaso
    abogado_id: int
    created_at: datetime
    updated_at: datetime
    documentos_count: int = 0
    tiene_analisis: bool = False

    class Config:
        from_attributes = True


class CaseSummary(BaseModel):
    """Resumen breve del caso para listados."""
    id: int
    referencia: str
    titulo: str
    tipo_caso: TipoCaso
    estado: EstadoCaso
    created_at: datetime

    class Config:
        from_attributes = True


# --- Análisis ---
class HechoRelevante(BaseModel):
    """Hecho relevante identificado."""
    descripcion: str
    relevancia: str  # alta, media, baja
    fuente_documento: Optional[str] = None


class ProblemaJuridico(BaseModel):
    """Problema jurídico identificado."""
    descripcion: str
    tipo: str  # sustantivo, procesal, probatorio
    normas_relacionadas: List[str] = []


class NormativaAplicable(BaseModel):
    """Normativa aplicable al caso."""
    norma: str
    articulos: List[str]
    relevancia: str
    aplicacion: str  # Cómo aplica al caso


class JurisprudenciaRelevante(BaseModel):
    """Jurisprudencia relevante encontrada."""
    identificador: str  # ROJ o ECLI
    tribunal: str
    fecha: str
    extracto: str
    aplicacion_caso: str  # Cómo aplica al caso concreto
    score_relevancia: float


class ArgumentoJuridico(BaseModel):
    """Argumento jurídico para defensa/ataque."""
    titulo: str
    desarrollo: str
    fundamento_legal: str
    jurisprudencia_apoyo: List[str] = []
    fuerza: str  # fuerte, moderado, débil


class Riesgo(BaseModel):
    """Riesgo identificado en el caso."""
    descripcion: str
    gravedad: str  # alta, media, baja
    mitigacion: Optional[str] = None


class CaseAnalysisResponse(BaseModel):
    """Análisis completo del caso."""
    id: int
    caso_id: int
    version: int

    # Resumen
    resumen_ejecutivo: str

    # Análisis estructurado
    hechos_relevantes: List[HechoRelevante]
    problemas_juridicos: List[ProblemaJuridico]
    normativa_aplicable: List[NormativaAplicable]
    jurisprudencia_relevante: List[JurisprudenciaRelevante]

    # Estrategia
    estrategia_defensa: Optional[str]
    estrategia_ataque: Optional[str]
    argumentos_principales: List[ArgumentoJuridico]

    # Riesgos
    riesgos: List[Riesgo]
    puntos_debiles: List[str]
    recomendaciones: List[str]

    # Metadatos
    modelo_usado: str
    created_at: datetime

    class Config:
        from_attributes = True


class AnalysisRequest(BaseModel):
    """Solicitud de análisis de caso."""
    caso_id: int
    forzar_nuevo: bool = False  # Si True, genera nuevo análisis aunque exista
    incluir_jurisprudencia: bool = True
    profundidad: str = "completo"  # rapido, normal, completo
