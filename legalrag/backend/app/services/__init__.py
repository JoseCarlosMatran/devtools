"""Servicios de negocio."""
import logging

logger = logging.getLogger(__name__)

__all__ = []

# RAGService requiere qdrant_client y sentence_transformers
try:
    from .rag_service import RAGService
    __all__.append("RAGService")
except ImportError as e:
    logger.warning(f"RAGService no disponible: {e}")
    RAGService = None

# DocumentService puede requerir dependencias de procesamiento
try:
    from .document_service import DocumentService
    __all__.append("DocumentService")
except ImportError as e:
    logger.warning(f"DocumentService no disponible: {e}")
    DocumentService = None

# AnalysisService requiere OpenAI/Anthropic
try:
    from .analysis_service import AnalysisService
    __all__.append("AnalysisService")
except ImportError as e:
    logger.warning(f"AnalysisService no disponible: {e}")
    AnalysisService = None

# PDFService requiere reportlab/weasyprint
try:
    from .pdf_service import PDFService
    __all__.append("PDFService")
except ImportError as e:
    logger.warning(f"PDFService no disponible: {e}")
    PDFService = None
