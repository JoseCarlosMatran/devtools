"""
Servicio de ingesta de legislación desde el BOE (Boletín Oficial del Estado).
Utiliza la API oficial de datos abiertos del BOE.
https://www.boe.es/datosabiertos/
"""
import asyncio
import logging
import re
import httpx
from datetime import date, datetime
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from xml.etree import ElementTree as ET

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.jurisprudencia import Legislacion, TipoLegislacion

# Import opcional de RAGService
try:
    from app.services.rag_service import RAGService
except ImportError:
    RAGService = None  # type: ignore

logger = logging.getLogger(__name__)


@dataclass
class BOEDocumento:
    """Datos de un documento extraído del BOE."""
    identificador: str
    titulo: str
    titulo_corto: Optional[str] = None
    tipo: TipoLegislacion = TipoLegislacion.OTRO
    departamento: Optional[str] = None
    rango: Optional[str] = None
    fecha_disposicion: Optional[date] = None
    fecha_publicacion: Optional[date] = None
    fecha_vigencia: Optional[date] = None
    vigente: bool = True
    ambito: str = "estatal"
    materias: Optional[str] = None
    texto_completo: str = ""
    url_pdf: Optional[str] = None
    url_html: Optional[str] = None
    url_xml: Optional[str] = None


class BOEService:
    """
    Servicio para extraer legislación del BOE usando su API oficial.

    API Base: https://www.boe.es/datosabiertos/api/
    """

    API_BASE = "https://www.boe.es/datosabiertos/api"
    XML_BASE = "https://www.boe.es/diario_boe/xml.php"

    # Rate limiting
    RATE_LIMIT = 1.0  # segundos entre peticiones

    def __init__(self):
        self._last_request_time = 0
        self._client: Optional[httpx.AsyncClient] = None
        self._rag_service = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Obtiene o crea el cliente HTTP."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=30.0,
                headers={
                    "Accept": "application/json",
                    "User-Agent": "LegalRAG/1.0 (Legal Research Platform)"
                }
            )
        return self._client

    async def _get_rag_service(self):
        """Obtiene servicio RAG si está disponible."""
        if RAGService is None:
            logger.warning("RAGService no disponible")
            return None
        if self._rag_service is None:
            self._rag_service = RAGService()
        return self._rag_service

    async def _rate_limit(self):
        """Aplica rate limiting entre peticiones."""
        now = asyncio.get_event_loop().time()
        elapsed = now - self._last_request_time
        if elapsed < self.RATE_LIMIT:
            await asyncio.sleep(self.RATE_LIMIT - elapsed)
        self._last_request_time = asyncio.get_event_loop().time()

    async def close(self):
        """Cierra el cliente HTTP."""
        if self._client:
            await self._client.aclose()
            self._client = None

    def _map_rango_to_tipo(self, rango: str) -> TipoLegislacion:
        """Mapea el rango del BOE al tipo de legislación."""
        rango_lower = rango.lower() if rango else ""

        if "ley orgánica" in rango_lower or "ley organica" in rango_lower:
            return TipoLegislacion.LEY_ORGANICA
        elif "real decreto-ley" in rango_lower or "real decreto ley" in rango_lower:
            return TipoLegislacion.REAL_DECRETO_LEY
        elif "real decreto" in rango_lower:
            return TipoLegislacion.REAL_DECRETO
        elif "ley" in rango_lower:
            return TipoLegislacion.LEY
        elif "orden" in rango_lower:
            return TipoLegislacion.ORDEN_MINISTERIAL
        elif "reglamento" in rango_lower and ("ue" in rango_lower or "europeo" in rango_lower):
            return TipoLegislacion.REGLAMENTO_UE
        elif "directiva" in rango_lower:
            return TipoLegislacion.DIRECTIVA_UE

        return TipoLegislacion.OTRO

    def _parse_date(self, date_str: Optional[str]) -> Optional[date]:
        """Parsea una fecha del BOE (formato YYYYMMDD)."""
        if not date_str:
            return None
        try:
            return datetime.strptime(date_str, "%Y%m%d").date()
        except ValueError:
            try:
                return datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                return None

    async def get_sumario(self, fecha: date) -> Dict[str, Any]:
        """
        Obtiene el sumario del BOE para una fecha.

        Args:
            fecha: Fecha del sumario (YYYYMMDD)

        Returns:
            Diccionario con el sumario
        """
        await self._rate_limit()
        client = await self._get_client()

        fecha_str = fecha.strftime("%Y%m%d")
        url = f"{self.API_BASE}/boe/sumario/{fecha_str}"

        logger.info(f"Obteniendo sumario BOE: {fecha_str}")

        response = await client.get(url)
        response.raise_for_status()

        return response.json()

    async def get_documento_xml(self, identificador: str) -> Optional[str]:
        """
        Obtiene el XML completo de un documento del BOE.

        Args:
            identificador: ID del documento (ej: BOE-A-2025-25589)

        Returns:
            Contenido XML del documento
        """
        await self._rate_limit()
        client = await self._get_client()

        url = f"{self.XML_BASE}?id={identificador}"
        logger.info(f"Obteniendo documento: {identificador}")

        response = await client.get(url)
        response.raise_for_status()

        return response.text

    def _parse_documento_xml(self, xml_content: str, identificador: str) -> Optional[BOEDocumento]:
        """Parsea el XML de un documento del BOE."""
        try:
            root = ET.fromstring(xml_content)

            # Metadatos
            metadatos = root.find("metadatos")
            if metadatos is None:
                logger.warning(f"No se encontraron metadatos en {identificador}")
                return None

            titulo = metadatos.findtext("titulo", "")
            if not titulo:
                return None

            rango = metadatos.findtext("rango", "")
            departamento = metadatos.findtext("departamento", "")

            # Fechas
            fecha_disposicion = self._parse_date(metadatos.findtext("fecha_disposicion"))
            fecha_publicacion = self._parse_date(metadatos.findtext("fecha_publicacion"))
            fecha_vigencia = self._parse_date(metadatos.findtext("fecha_vigencia"))

            # Estado
            vigente = metadatos.findtext("estatus_derogacion", "N") != "S"

            # URLs
            url_pdf = metadatos.findtext("url_pdf", "")
            if url_pdf and not url_pdf.startswith("http"):
                url_pdf = f"https://www.boe.es{url_pdf}"

            # Materias
            materias_list = []
            analisis = root.find("analisis")
            if analisis is not None:
                materias_elem = analisis.find("materias")
                if materias_elem is not None:
                    for materia in materias_elem.findall("materia"):
                        if materia.text:
                            materias_list.append(materia.text.strip())

            # Texto completo
            texto_parts = []
            texto_elem = root.find("texto")
            if texto_elem is not None:
                for p in texto_elem.iter():
                    if p.text:
                        texto_parts.append(p.text.strip())
                    if p.tail:
                        texto_parts.append(p.tail.strip())

            texto_completo = "\n\n".join(filter(None, texto_parts))

            # Título corto (primera parte del título o rango + número)
            titulo_corto = None
            if rango:
                numero = metadatos.findtext("numero_oficial", "")
                if numero:
                    titulo_corto = f"{rango} {numero}"
                else:
                    titulo_corto = titulo[:100] if len(titulo) > 100 else None

            return BOEDocumento(
                identificador=identificador,
                titulo=titulo,
                titulo_corto=titulo_corto,
                tipo=self._map_rango_to_tipo(rango),
                departamento=departamento,
                rango=rango,
                fecha_disposicion=fecha_disposicion,
                fecha_publicacion=fecha_publicacion,
                fecha_vigencia=fecha_vigencia,
                vigente=vigente,
                materias="; ".join(materias_list) if materias_list else None,
                texto_completo=texto_completo,
                url_pdf=url_pdf,
                url_html=f"https://www.boe.es/diario_boe/txt.php?id={identificador}",
                url_xml=f"https://www.boe.es/diario_boe/xml.php?id={identificador}"
            )

        except ET.ParseError as e:
            logger.error(f"Error parseando XML de {identificador}: {e}")
            return None

    async def fetch_documento(self, identificador: str) -> Optional[BOEDocumento]:
        """
        Descarga y parsea un documento completo del BOE.

        Args:
            identificador: ID del documento (ej: BOE-A-2025-25589)

        Returns:
            BOEDocumento con todos los datos
        """
        xml_content = await self.get_documento_xml(identificador)
        if not xml_content:
            return None

        return self._parse_documento_xml(xml_content, identificador)

    async def fetch_documentos_por_fecha(
        self,
        fecha: date,
        solo_disposiciones: bool = True,
        max_documentos: int = 50
    ) -> List[BOEDocumento]:
        """
        Descarga todos los documentos del BOE de una fecha.

        Args:
            fecha: Fecha del BOE
            solo_disposiciones: Si True, solo descarga secciones I, II, III (disposiciones)
            max_documentos: Máximo de documentos a descargar

        Returns:
            Lista de BOEDocumento
        """
        sumario = await self.get_sumario(fecha)
        documentos = []

        if sumario.get("status", {}).get("code") != "200":
            logger.error(f"Error obteniendo sumario: {sumario}")
            return []

        data = sumario.get("data", {}).get("sumario", {})
        diario = data.get("diario", [])

        if not diario:
            logger.warning(f"No hay diario para la fecha {fecha}")
            return []

        # Procesar secciones
        identificadores = []

        for d in diario:
            secciones = d.get("seccion", [])
            for seccion in secciones:
                codigo_seccion = seccion.get("codigo", "")

                # Filtrar solo disposiciones generales si se solicita
                if solo_disposiciones and codigo_seccion not in ["1", "2", "3"]:
                    continue

                departamentos = seccion.get("departamento", [])
                for depto in departamentos:
                    epigrafes = depto.get("epigrafe", [])
                    for epigrafe in epigrafes:
                        items = epigrafe.get("item", [])
                        if isinstance(items, dict):
                            items = [items]

                        for item in items:
                            identificador = item.get("identificador")
                            if identificador:
                                identificadores.append(identificador)

        logger.info(f"Encontrados {len(identificadores)} documentos en sumario")

        # Descargar documentos
        for i, identificador in enumerate(identificadores[:max_documentos]):
            try:
                doc = await self.fetch_documento(identificador)
                if doc and doc.texto_completo:
                    documentos.append(doc)
                    logger.info(f"Documento {i+1}/{min(len(identificadores), max_documentos)}: {identificador}")
            except Exception as e:
                logger.error(f"Error descargando {identificador}: {e}")
                continue

        logger.info(f"Total documentos descargados: {len(documentos)}")
        return documentos

    async def ingest_documento(
        self,
        documento: BOEDocumento,
        db: AsyncSession,
        index_in_qdrant: bool = True
    ) -> Optional[Legislacion]:
        """
        Guarda un documento del BOE en la base de datos.

        Args:
            documento: Datos del documento
            db: Sesión de base de datos
            index_in_qdrant: Si indexar en Qdrant

        Returns:
            Legislacion guardada o None si ya existe
        """
        # Verificar si ya existe
        result = await db.execute(
            select(Legislacion).where(Legislacion.codigo == documento.identificador)
        )
        existing = result.scalar_one_or_none()

        if existing:
            logger.info(f"Documento ya existe: {documento.identificador}")
            return None

        # Crear registro
        legislacion = Legislacion(
            codigo=documento.identificador,
            titulo=documento.titulo,
            titulo_corto=documento.titulo_corto,
            tipo=documento.tipo,
            ambito=documento.ambito,
            materia=documento.materias,
            fecha_publicacion=documento.fecha_publicacion or date.today(),
            fecha_entrada_vigor=documento.fecha_vigencia,
            vigente=documento.vigente,
            boe_referencia=documento.identificador,
            boe_url=documento.url_html,
            articulado=documento.texto_completo,
            indexada=False
        )

        db.add(legislacion)
        await db.flush()

        # Indexar en Qdrant
        if index_in_qdrant:
            try:
                rag_service = await self._get_rag_service()
                if rag_service:
                    metadata = {
                        "codigo": legislacion.codigo,
                        "titulo": legislacion.titulo,
                        "tipo": legislacion.tipo.value if legislacion.tipo else None,
                        "fecha_publicacion": legislacion.fecha_publicacion.isoformat() if legislacion.fecha_publicacion else None,
                        "vigente": legislacion.vigente,
                        "tipo_documento": "legislacion"
                    }
                    qdrant_ids = await rag_service.index_documento(
                        documento_id=legislacion.id,
                        texto=legislacion.articulado,
                        metadata=metadata,
                        collection="legislacion"
                    )
                    legislacion.qdrant_ids = ",".join(qdrant_ids) if qdrant_ids else None
                    legislacion.indexada = True
            except Exception as e:
                logger.error(f"Error indexando en Qdrant: {e}")

        await db.commit()
        await db.refresh(legislacion)

        logger.info(f"Documento guardado: {legislacion.codigo}")
        return legislacion

    async def ingest_por_fecha(
        self,
        fecha: date,
        db: AsyncSession,
        max_documentos: int = 50,
        index_in_qdrant: bool = True
    ) -> Dict[str, int]:
        """
        Ingesta todos los documentos del BOE de una fecha.

        Args:
            fecha: Fecha del BOE
            db: Sesión de base de datos
            max_documentos: Máximo de documentos
            index_in_qdrant: Si indexar en Qdrant

        Returns:
            Estadísticas de la ingesta
        """
        stats = {
            "encontrados": 0,
            "guardados": 0,
            "duplicados": 0,
            "errores": 0
        }

        try:
            documentos = await self.fetch_documentos_por_fecha(
                fecha=fecha,
                max_documentos=max_documentos
            )
            stats["encontrados"] = len(documentos)

            for doc in documentos:
                try:
                    saved = await self.ingest_documento(doc, db, index_in_qdrant)
                    if saved:
                        stats["guardados"] += 1
                    else:
                        stats["duplicados"] += 1
                except Exception as e:
                    logger.error(f"Error guardando {doc.identificador}: {e}")
                    stats["errores"] += 1

        finally:
            await self.close()

        return stats


# Instancia singleton
boe_service = BOEService()
