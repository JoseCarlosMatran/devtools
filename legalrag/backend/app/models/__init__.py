"""Modelos de base de datos."""
from .user import User, Despacho
from .case import Case, CaseAnalysis
from .document import Document
from .jurisprudencia import Jurisprudencia, Legislacion

__all__ = [
    "User",
    "Despacho",
    "Case",
    "CaseAnalysis",
    "Document",
    "Jurisprudencia",
    "Legislacion"
]
