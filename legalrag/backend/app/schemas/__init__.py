"""Schemas de validación Pydantic."""
from .user import UserCreate, UserLogin, UserResponse, Token, DespachoCreate, DespachoResponse
from .case import CaseCreate, CaseResponse, CaseAnalysisResponse, CaseUpdate
from .document import DocumentResponse, DocumentUpload
from .jurisprudencia import JurisprudenciaCreate, JurisprudenciaResponse, LegislacionCreate

__all__ = [
    "UserCreate", "UserLogin", "UserResponse", "Token",
    "DespachoCreate", "DespachoResponse",
    "CaseCreate", "CaseResponse", "CaseAnalysisResponse", "CaseUpdate",
    "DocumentResponse", "DocumentUpload",
    "JurisprudenciaCreate", "JurisprudenciaResponse", "LegislacionCreate"
]
