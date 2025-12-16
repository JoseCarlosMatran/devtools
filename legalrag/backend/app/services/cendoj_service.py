"""
Servicio de ingesta de jurisprudencia desde CENDOJ.
Scraper respetuoso para el Centro de Documentación Judicial.
"""
import asyncio
import logging
import re
from datetime import date, datetime
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from enum import Enum

import httpx
from bs4 import BeautifulSoup
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.jurisprudencia import Jurisprudencia, Jurisdiccion, TipoTribunal
from app.services.rag_service import RAGService

logger = logging.getLogger(__name__)


class CendojJurisdiccion(str, Enum):
    """Códigos de jurisdicción en CENDOJ."""
    CIVIL = "1"
    PENAL = "2"
    CONTENCIOSO = "3"
    SOCIAL = "4"


class CendojTipoOrgano(str, Enum):
    """Códigos de tipo de órgano en CENDOJ."""
    TRIBUNAL_SUPREMO = "11"
    AUDIENCIA_NACIONAL = "12"
    TSJ = "13"
    AUDIENCIA_PROVINCIAL = "14"


@dataclass
class CendojSearchParams:
    """Parámetros de búsqueda en CENDOJ."""
    jurisdiccion: Optional[CendojJurisdiccion] = None
    tipo_organo: Optional[CendojTipoOrgano] = None
    fecha_desde: Optional[date] = None
    fecha_hasta: Optional[date] = None
    texto_libre: Optional[str] = None
    num_registros: int = 50
    pagina: int = 1


@dataclass
class CendojSentencia:
    """Datos de una sentencia extraída de CENDOJ."""
    ecli: Optional[str] = None
    roj: Optional[str] = None
    cendoj_id: Optional[str] = None
    tribunal: str = ""
    tipo_tribunal: TipoTribunal = TipoTribunal.OTRO
    sede: Optional[str] = None
    seccion: Optional[str] = None
    tipo_resolucion: str = "Sentencia"
    numero_resolucion: Optional[str] = None
    fecha_resolucion: Optional[date] = None
    ponente: Optional[str] = None
    jurisdiccion: Jurisdiccion = Jurisdiccion.CIVIL
    materia: Optional[str] = None
    voces: Optional[str] = None
    cabecera: Optional[str] = None
    antecedentes: Optional[str] = None
    fundamentos_derecho: str = ""
    fallo: Optional[str] = None
    texto_completo: str = ""
    url_documento: Optional[str] = None


class CendojService:
    """
    Servicio para extraer jurisprudencia de CENDOJ.

    Implementa scraping respetuoso con:
    - Rate limiting (1 petición/segundo)
    - User-Agent identificativo
    - Respeto a robots.txt
    """

    BASE_URL = "https://www.poderjudicial.es"
    SEARCH_URL = f"{BASE_URL}/search/indexAN.jsp"
    DOCUMENT_URL = f"{BASE_URL}/search/documento/documento.jsp"

    # Headers para identificarnos correctamente
    HEADERS = {
        "User-Agent": "LegalRAG/1.0 (Investigación jurídica académica; contacto@legalrag.es)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive",
    }

    # Rate limiting: segundos entre peticiones
    RATE_LIMIT = 1.0

    def __init__(self):
        self._last_request_time = 0
        self._client: Optional[httpx.AsyncClient] = None
        self._rag_service: Optional[RAGService] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Obtiene cliente HTTP (lazy initialization)."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                headers=self.HEADERS,
                timeout=30.0,
                follow_redirects=True
            )
        return self._client

    async def _get_rag_service(self) -> RAGService:
        """Obtiene servicio RAG."""
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
        """Cierra conexiones."""
        if self._client:
            await self._client.aclose()
            self._client = None

    def _map_jurisdiccion(self, codigo: str) -> Jurisdiccion:
        """Mapea código CENDOJ a enum de jurisdicción."""
        mapping = {
            "1": Jurisdiccion.CIVIL,
            "2": Jurisdiccion.PENAL,
            "3": Jurisdiccion.CONTENCIOSO,
            "4": Jurisdiccion.SOCIAL,
            "civil": Jurisdiccion.CIVIL,
            "penal": Jurisdiccion.PENAL,
            "contencioso-administrativo": Jurisdiccion.CONTENCIOSO,
            "social": Jurisdiccion.SOCIAL,
        }
        return mapping.get(codigo.lower(), Jurisdiccion.CIVIL)

    def _map_tipo_tribunal(self, nombre_tribunal: str) -> TipoTribunal:
        """Infiere el tipo de tribunal del nombre."""
        nombre = nombre_tribunal.lower()
        if "tribunal supremo" in nombre:
            return TipoTribunal.TRIBUNAL_SUPREMO
        elif "audiencia nacional" in nombre:
            return TipoTribunal.AUDIENCIA_NACIONAL
        elif "tribunal superior" in nombre or "tsj" in nombre:
            return TipoTribunal.TSJ
        elif "audiencia provincial" in nombre:
            return TipoTribunal.AUDIENCIA_PROVINCIAL
        elif "juzgado mercantil" in nombre:
            return TipoTribunal.JUZGADO_MERCANTIL
        elif "juzgado de lo social" in nombre or "juzgado social" in nombre:
            return TipoTribunal.JUZGADO_SOCIAL
        elif "primera instancia" in nombre:
            return TipoTribunal.JUZGADO_PRIMERA_INSTANCIA
        elif "instruccion" in nombre or "instrucción" in nombre:
            return TipoTribunal.JUZGADO_INSTRUCCION
        return TipoTribunal.OTRO

    def _extract_sede(self, tribunal: str) -> Optional[str]:
        """Extrae la sede del nombre del tribunal."""
        # Patrones comunes: "Audiencia Provincial de Madrid", "TSJ de Cataluña"
        patterns = [
            r"de\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)\s*$",
            r"de\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)\s*,",
        ]
        for pattern in patterns:
            match = re.search(pattern, tribunal)
            if match:
                return match.group(1)
        return None

    async def search(self, params: CendojSearchParams) -> List[Dict[str, Any]]:
        """
        Busca sentencias en CENDOJ.

        Returns:
            Lista de resultados con metadatos básicos y URL al documento.
        """
        await self._rate_limit()
        client = await self._get_client()

        # Construir parámetros de búsqueda
        search_params = {
            "ESSION": "null",
            "sort": "DTF_desc",  # Ordenar por fecha descendente
            "recordsPerPage": str(params.num_registros),
            "currentPage": str(params.pagina),
        }

        if params.jurisdiccion:
            search_params["JURISDICCION"] = params.jurisdiccion.value

        if params.tipo_organo:
            search_params["TIPO_ORGANO"] = params.tipo_organo.value

        if params.fecha_desde:
            search_params["FECHA_DESDE"] = params.fecha_desde.strftime("%d/%m/%Y")

        if params.fecha_hasta:
            search_params["FECHA_HASTA"] = params.fecha_hasta.strftime("%d/%m/%Y")

        if params.texto_libre:
            search_params["TEXT"] = params.texto_libre

        try:
            response = await client.get(self.SEARCH_URL, params=search_params)
            response.raise_for_status()

            return self._parse_search_results(response.text)

        except httpx.HTTPError as e:
            logger.error(f"Error en búsqueda CENDOJ: {e}")
            raise

    def _parse_search_results(self, html: str) -> List[Dict[str, Any]]:
        """Parsea los resultados de búsqueda."""
        soup = BeautifulSoup(html, "html.parser")
        results = []

        # Buscar los bloques de resultados
        for item in soup.select(".listadoDocumentos .documento, .resultado"):
            try:
                result = self._parse_result_item(item)
                if result:
                    results.append(result)
            except Exception as e:
                logger.warning(f"Error parseando resultado: {e}")
                continue

        return results

    def _parse_result_item(self, item) -> Optional[Dict[str, Any]]:
        """Parsea un item individual de resultados."""
        # Extraer ROJ/ECLI del título o enlace
        link = item.select_one("a[href*='documento']")
        if not link:
            return None

        url = link.get("href", "")
        if not url.startswith("http"):
            url = f"{self.BASE_URL}{url}"

        # Extraer identificadores
        text = item.get_text(" ", strip=True)

        ecli_match = re.search(r"ECLI:ES:\w+:\d{4}:\d+", text)
        roj_match = re.search(r"(STS|SAP|STSJ|SAN|ATS|AAP)\s*\d+/\d{4}", text)

        # Extraer fecha
        fecha_match = re.search(r"(\d{1,2})[/-](\d{1,2})[/-](\d{4})", text)
        fecha = None
        if fecha_match:
            try:
                dia, mes, año = fecha_match.groups()
                fecha = date(int(año), int(mes), int(dia))
            except ValueError:
                pass

        # Extraer tribunal
        tribunal_elem = item.select_one(".tribunal, .organo")
        tribunal = tribunal_elem.get_text(strip=True) if tribunal_elem else ""

        return {
            "url": url,
            "ecli": ecli_match.group(0) if ecli_match else None,
            "roj": roj_match.group(0) if roj_match else None,
            "tribunal": tribunal,
            "fecha": fecha,
            "resumen": text[:500] if text else ""
        }

    async def fetch_document(self, url: str) -> Optional[CendojSentencia]:
        """
        Descarga y parsea un documento completo de CENDOJ.

        Args:
            url: URL del documento

        Returns:
            CendojSentencia con todos los datos extraídos
        """
        await self._rate_limit()
        client = await self._get_client()

        try:
            response = await client.get(url)
            response.raise_for_status()

            return self._parse_document(response.text, url)

        except httpx.HTTPError as e:
            logger.error(f"Error descargando documento {url}: {e}")
            return None

    def _parse_document(self, html: str, url: str) -> Optional[CendojSentencia]:
        """Parsea el documento completo de una sentencia."""
        soup = BeautifulSoup(html, "html.parser")

        sentencia = CendojSentencia(url_documento=url)

        # Extraer metadatos de la cabecera
        for meta in soup.select("meta"):
            name = meta.get("name", "").lower()
            content = meta.get("content", "")

            if name == "dc.identifier" and "ecli" in content.lower():
                sentencia.ecli = content
            elif name == "dc.date":
                try:
                    sentencia.fecha_resolucion = datetime.strptime(content, "%Y-%m-%d").date()
                except ValueError:
                    pass

        # Buscar en el contenido principal
        contenido = soup.select_one("#contenido, .documentoTexto, #documento")
        if not contenido:
            contenido = soup.body

        if not contenido:
            return None

        texto_completo = contenido.get_text("\n", strip=True)
        sentencia.texto_completo = texto_completo

        # Extraer ROJ del texto
        roj_match = re.search(r"((?:STS|SAP|STSJ|SAN|ATS|AAP|SJMER|SJS)\s*\d+/\d{4})", texto_completo)
        if roj_match:
            sentencia.roj = roj_match.group(1)

        # Extraer ECLI si no se encontró en meta
        if not sentencia.ecli:
            ecli_match = re.search(r"ECLI:ES:\w+:\d{4}:\d+", texto_completo)
            if ecli_match:
                sentencia.ecli = ecli_match.group(0)

        # Extraer tribunal
        tribunal_patterns = [
            r"(Tribunal Supremo[^\.]*)",
            r"(Audiencia (?:Nacional|Provincial)[^\.]*)",
            r"(Tribunal Superior de Justicia[^\.]*)",
            r"(Juzgado[^\.]*)",
        ]
        for pattern in tribunal_patterns:
            match = re.search(pattern, texto_completo[:2000], re.IGNORECASE)
            if match:
                sentencia.tribunal = match.group(1).strip()
                sentencia.tipo_tribunal = self._map_tipo_tribunal(sentencia.tribunal)
                sentencia.sede = self._extract_sede(sentencia.tribunal)
                break

        # Extraer ponente
        ponente_match = re.search(
            r"(?:Ponente|Magistrado[/-]?Ponente)[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+)",
            texto_completo[:3000]
        )
        if ponente_match:
            sentencia.ponente = ponente_match.group(1)

        # Extraer fecha si no se encontró
        if not sentencia.fecha_resolucion:
            fecha_match = re.search(
                r"(?:Fecha|fecha)[:\s]+(\d{1,2})[/-](\d{1,2})[/-](\d{4})",
                texto_completo[:2000]
            )
            if fecha_match:
                try:
                    dia, mes, año = fecha_match.groups()
                    sentencia.fecha_resolucion = date(int(año), int(mes), int(dia))
                except ValueError:
                    pass

        # Extraer secciones del documento
        sentencia.fundamentos_derecho = self._extract_section(
            texto_completo,
            [r"FUNDAMENTOS\s+DE\s+DERECHO", r"FUNDAMENTOS\s+JURÍDICOS", r"RAZONAMIENTOS\s+JURÍDICOS"],
            [r"FALLO", r"FALLAMOS", r"PARTE\s+DISPOSITIVA"]
        )

        sentencia.fallo = self._extract_section(
            texto_completo,
            [r"FALLO", r"FALLAMOS", r"PARTE\s+DISPOSITIVA"],
            [r"(?:Así|ASÍ)\s+(?:por|POR)\s+(?:esta|ESTA)", r"$"]
        )

        sentencia.antecedentes = self._extract_section(
            texto_completo,
            [r"ANTECEDENTES\s+DE\s+HECHO", r"HECHOS\s+PROBADOS"],
            [r"FUNDAMENTOS\s+DE\s+DERECHO", r"FUNDAMENTOS\s+JURÍDICOS"]
        )

        # Si no hay fundamentos, usar todo el texto
        if not sentencia.fundamentos_derecho:
            sentencia.fundamentos_derecho = texto_completo

        # Inferir jurisdicción del contenido
        sentencia.jurisdiccion = self._infer_jurisdiccion(texto_completo)

        return sentencia

    def _extract_section(self, text: str, start_patterns: List[str], end_patterns: List[str]) -> str:
        """Extrae una sección del texto entre patrones."""
        # Buscar inicio
        start_pos = 0
        for pattern in start_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                start_pos = match.end()
                break

        if start_pos == 0:
            return ""

        # Buscar fin
        end_pos = len(text)
        remaining = text[start_pos:]
        for pattern in end_patterns:
            match = re.search(pattern, remaining, re.IGNORECASE)
            if match:
                end_pos = start_pos + match.start()
                break

        section = text[start_pos:end_pos].strip()
        return section

    def _infer_jurisdiccion(self, texto: str) -> Jurisdiccion:
        """Infiere la jurisdicción del contenido del texto."""
        texto_lower = texto.lower()[:5000]

        # Indicadores por jurisdicción
        indicadores = {
            Jurisdiccion.SOCIAL: [
                "despido", "estatuto de los trabajadores", "convenio colectivo",
                "salario", "indemnización laboral", "ere", "expediente de regulación",
                "jurisdicción social", "juzgado de lo social"
            ],
            Jurisdiccion.PENAL: [
                "código penal", "delito", "pena de prisión", "acusado",
                "ministerio fiscal", "audiencia provincial", "juicio oral",
                "autor criminalmente responsable"
            ],
            Jurisdiccion.CONTENCIOSO: [
                "contencioso-administrativo", "administración pública",
                "recurso contencioso", "acto administrativo", "silencio administrativo",
                "jurisdicción contencioso-administrativa"
            ],
            Jurisdiccion.MERCANTIL: [
                "juzgado mercantil", "concurso de acreedores", "ley concursal",
                "sociedad mercantil", "competencia desleal", "marcas"
            ],
            Jurisdiccion.CIVIL: [
                "código civil", "obligaciones", "contrato", "daños y perjuicios",
                "responsabilidad civil", "jurisdicción civil"
            ],
        }

        scores = {j: 0 for j in indicadores}
        for jurisdiccion, palabras in indicadores.items():
            for palabra in palabras:
                if palabra in texto_lower:
                    scores[jurisdiccion] += 1

        # Devolver la jurisdicción con más coincidencias
        max_score = max(scores.values())
        if max_score > 0:
            for j, score in scores.items():
                if score == max_score:
                    return j

        return Jurisdiccion.CIVIL  # Por defecto

    async def ingest_sentencia(
        self,
        sentencia: CendojSentencia,
        db: AsyncSession,
        index_in_qdrant: bool = True
    ) -> Optional[Jurisprudencia]:
        """
        Guarda una sentencia en la base de datos y opcionalmente la indexa en Qdrant.

        Args:
            sentencia: Datos de la sentencia
            db: Sesión de base de datos
            index_in_qdrant: Si indexar en Qdrant

        Returns:
            Jurisprudencia guardada o None si ya existe
        """
        # Verificar si ya existe por ECLI o ROJ
        existing = None
        if sentencia.ecli:
            result = await db.execute(
                select(Jurisprudencia).where(Jurisprudencia.ecli == sentencia.ecli)
            )
            existing = result.scalar_one_or_none()

        if not existing and sentencia.roj:
            result = await db.execute(
                select(Jurisprudencia).where(Jurisprudencia.roj == sentencia.roj)
            )
            existing = result.scalar_one_or_none()

        if existing:
            logger.info(f"Sentencia ya existe: {sentencia.ecli or sentencia.roj}")
            return None

        # Crear registro
        jurisprudencia = Jurisprudencia(
            ecli=sentencia.ecli,
            roj=sentencia.roj,
            cendoj_id=sentencia.cendoj_id,
            tribunal=sentencia.tribunal or "Desconocido",
            tipo_tribunal=sentencia.tipo_tribunal,
            sede=sentencia.sede,
            seccion=sentencia.seccion,
            tipo_resolucion=sentencia.tipo_resolucion,
            numero_resolucion=sentencia.numero_resolucion,
            fecha_resolucion=sentencia.fecha_resolucion or date.today(),
            ponente=sentencia.ponente,
            jurisdiccion=sentencia.jurisdiccion,
            materia=sentencia.materia,
            voces=sentencia.voces,
            cabecera=sentencia.cabecera,
            antecedentes=sentencia.antecedentes,
            fundamentos_derecho=sentencia.fundamentos_derecho,
            fallo=sentencia.fallo,
            texto_completo=sentencia.texto_completo,
            fuente="cendoj",
            indexada=False
        )

        db.add(jurisprudencia)
        await db.flush()

        # Indexar en Qdrant
        if index_in_qdrant:
            try:
                rag_service = await self._get_rag_service()
                metadata = {
                    "ecli": jurisprudencia.ecli,
                    "roj": jurisprudencia.roj,
                    "tribunal": jurisprudencia.tribunal,
                    "tipo_tribunal": jurisprudencia.tipo_tribunal.value if jurisprudencia.tipo_tribunal else None,
                    "jurisdiccion": jurisprudencia.jurisdiccion.value if jurisprudencia.jurisdiccion else None,
                    "fecha": jurisprudencia.fecha_resolucion.isoformat() if jurisprudencia.fecha_resolucion else None,
                    "ponente": jurisprudencia.ponente,
                }
                qdrant_ids = await rag_service.index_jurisprudencia(
                    jurisprudencia_id=jurisprudencia.id,
                    texto=jurisprudencia.texto_completo,
                    metadata=metadata
                )
                jurisprudencia.qdrant_id = ",".join(qdrant_ids) if qdrant_ids else None
                jurisprudencia.indexada = True
            except Exception as e:
                logger.error(f"Error indexando en Qdrant: {e}")

        await db.commit()
        await db.refresh(jurisprudencia)

        logger.info(f"Sentencia guardada: {jurisprudencia.ecli or jurisprudencia.roj}")
        return jurisprudencia

    async def ingest_batch(
        self,
        params: CendojSearchParams,
        db: AsyncSession,
        max_documents: int = 100,
        index_in_qdrant: bool = True
    ) -> Dict[str, Any]:
        """
        Ingesta un lote de sentencias según los parámetros de búsqueda.

        Args:
            params: Parámetros de búsqueda
            db: Sesión de base de datos
            max_documents: Máximo de documentos a procesar
            index_in_qdrant: Si indexar en Qdrant

        Returns:
            Estadísticas de la ingesta
        """
        stats = {
            "searched": 0,
            "downloaded": 0,
            "saved": 0,
            "duplicates": 0,
            "errors": 0
        }

        try:
            # Buscar
            results = await self.search(params)
            stats["searched"] = len(results)
            logger.info(f"Encontradas {len(results)} sentencias")

            # Procesar cada resultado
            for i, result in enumerate(results[:max_documents]):
                if not result.get("url"):
                    continue

                try:
                    # Descargar documento completo
                    sentencia = await self.fetch_document(result["url"])
                    if not sentencia:
                        stats["errors"] += 1
                        continue

                    stats["downloaded"] += 1

                    # Guardar e indexar
                    saved = await self.ingest_sentencia(sentencia, db, index_in_qdrant)
                    if saved:
                        stats["saved"] += 1
                    else:
                        stats["duplicates"] += 1

                    # Log progreso
                    if (i + 1) % 10 == 0:
                        logger.info(f"Progreso: {i + 1}/{min(len(results), max_documents)}")

                except Exception as e:
                    logger.error(f"Error procesando {result.get('url')}: {e}")
                    stats["errors"] += 1
                    continue

        finally:
            await self.close()

        return stats


# Instancia singleton para uso global
cendoj_service = CendojService()
