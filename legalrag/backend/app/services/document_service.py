"""
Servicio de procesamiento de documentos.
Extrae texto de PDFs, DOCX y otros formatos legales.
"""
import logging
import os
import uuid
from typing import Optional, Tuple
from pathlib import Path
import aiofiles

from PyPDF2 import PdfReader
import pdfplumber
from docx import Document as DocxDocument

from app.core.config import settings
from app.models.document import TipoDocumento

logger = logging.getLogger(__name__)


class DocumentService:
    """
    Servicio de procesamiento de documentos legales.
    Soporta PDF, DOCX, TXT.
    """

    SUPPORTED_EXTENSIONS = {'.pdf', '.docx', '.doc', '.txt', '.rtf'}
    MIME_TYPES = {
        '.pdf': 'application/pdf',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.doc': 'application/msword',
        '.txt': 'text/plain',
        '.rtf': 'application/rtf'
    }

    def __init__(self):
        self.upload_dir = Path(settings.upload_dir)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    async def save_file(
        self,
        file_content: bytes,
        original_filename: str
    ) -> Tuple[str, str, str]:
        """
        Guarda archivo y retorna (nombre_almacenado, ruta, mime_type).
        """
        ext = Path(original_filename).suffix.lower()
        if ext not in self.SUPPORTED_EXTENSIONS:
            raise ValueError(f"Formato no soportado: {ext}")

        # Generar nombre único
        stored_name = f"{uuid.uuid4().hex}{ext}"
        file_path = self.upload_dir / stored_name

        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(file_content)

        mime_type = self.MIME_TYPES.get(ext, 'application/octet-stream')

        return stored_name, str(file_path), mime_type

    def extract_text_from_pdf(self, file_path: str) -> Tuple[str, int]:
        """
        Extrae texto de PDF.
        Usa pdfplumber para mejor extracción de tablas.
        Retorna (texto, num_paginas).
        """
        text_parts = []
        num_pages = 0

        try:
            with pdfplumber.open(file_path) as pdf:
                num_pages = len(pdf.pages)
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)

                    # Extraer tablas si existen
                    tables = page.extract_tables()
                    for table in tables:
                        for row in table:
                            if row:
                                row_text = " | ".join([str(cell) if cell else "" for cell in row])
                                text_parts.append(row_text)

        except Exception as e:
            logger.warning(f"pdfplumber falló, intentando PyPDF2: {e}")
            # Fallback a PyPDF2
            try:
                reader = PdfReader(file_path)
                num_pages = len(reader.pages)
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
            except Exception as e2:
                logger.error(f"Error extrayendo texto de PDF: {e2}")
                raise ValueError(f"No se pudo extraer texto del PDF: {e2}")

        return "\n\n".join(text_parts), num_pages

    def extract_text_from_docx(self, file_path: str) -> Tuple[str, int]:
        """
        Extrae texto de DOCX.
        Retorna (texto, num_paginas estimadas).
        """
        try:
            doc = DocxDocument(file_path)
            text_parts = []

            for para in doc.paragraphs:
                if para.text.strip():
                    text_parts.append(para.text)

            # Extraer tablas
            for table in doc.tables:
                for row in table.rows:
                    row_text = " | ".join([cell.text for cell in row.cells])
                    if row_text.strip():
                        text_parts.append(row_text)

            full_text = "\n\n".join(text_parts)
            # Estimación de páginas (aprox 3000 caracteres por página)
            estimated_pages = max(1, len(full_text) // 3000)

            return full_text, estimated_pages

        except Exception as e:
            logger.error(f"Error extrayendo texto de DOCX: {e}")
            raise ValueError(f"No se pudo extraer texto del DOCX: {e}")

    def extract_text_from_txt(self, file_path: str) -> Tuple[str, int]:
        """Extrae texto de archivo de texto plano."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()
            estimated_pages = max(1, len(text) // 3000)
            return text, estimated_pages
        except UnicodeDecodeError:
            # Intentar con latin-1
            with open(file_path, 'r', encoding='latin-1') as f:
                text = f.read()
            estimated_pages = max(1, len(text) // 3000)
            return text, estimated_pages

    async def extract_text(self, file_path: str) -> Tuple[str, int]:
        """
        Extrae texto de cualquier formato soportado.
        Retorna (texto, num_paginas).
        """
        ext = Path(file_path).suffix.lower()

        if ext == '.pdf':
            return self.extract_text_from_pdf(file_path)
        elif ext in ['.docx', '.doc']:
            return self.extract_text_from_docx(file_path)
        elif ext in ['.txt', '.rtf']:
            return self.extract_text_from_txt(file_path)
        else:
            raise ValueError(f"Formato no soportado: {ext}")

    def detect_document_type(self, text: str, filename: str) -> TipoDocumento:
        """
        Detecta automáticamente el tipo de documento legal.
        Basado en palabras clave del contenido.
        """
        text_lower = text.lower()[:5000]  # Solo primeros 5000 caracteres
        filename_lower = filename.lower()

        # Patrones de detección
        patterns = {
            TipoDocumento.DEMANDA: [
                'demanda', 'suplico', 'al juzgado', 'demandante', 'acción'
            ],
            TipoDocumento.CONTESTACION: [
                'contestación', 'contesto', 'me opongo', 'excepciones'
            ],
            TipoDocumento.SENTENCIA: [
                'sentencia', 'fallo', 'fallamos', 'vistos los autos'
            ],
            TipoDocumento.AUTO: [
                'auto', 'parte dispositiva', 'se acuerda'
            ],
            TipoDocumento.ATESTADO: [
                'atestado', 'diligencias', 'guardia civil', 'policía nacional',
                'acta de inspección', 'policía local'
            ],
            TipoDocumento.CONTRATO: [
                'contrato', 'estipulaciones', 'cláusula', 'partes contratantes',
                'arrendamiento', 'compraventa'
            ],
            TipoDocumento.RECURSO: [
                'recurso', 'apelación', 'casación', 'interpongo recurso'
            ],
            TipoDocumento.ESCRITO_JUDICIAL: [
                'escrito', 'al juzgado', 'solicito', 'interesa'
            ],
            TipoDocumento.INFORME_PERICIAL: [
                'informe pericial', 'perito', 'dictamen', 'valoración'
            ],
            TipoDocumento.PRUEBA: [
                'prueba', 'documento', 'anexo', 'aportación documental'
            ]
        }

        # Buscar coincidencias
        max_score = 0
        detected_type = TipoDocumento.OTRO

        for doc_type, keywords in patterns.items():
            score = sum(1 for kw in keywords if kw in text_lower or kw in filename_lower)
            if score > max_score:
                max_score = score
                detected_type = doc_type

        return detected_type

    async def delete_file(self, file_path: str):
        """Elimina archivo del sistema."""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            logger.error(f"Error eliminando archivo {file_path}: {e}")

    def get_file_info(self, file_path: str) -> dict:
        """Obtiene información del archivo."""
        path = Path(file_path)
        if not path.exists():
            return {}

        stat = path.stat()
        return {
            "size_bytes": stat.st_size,
            "size_mb": round(stat.st_size / (1024 * 1024), 2),
            "extension": path.suffix.lower(),
            "exists": True
        }
