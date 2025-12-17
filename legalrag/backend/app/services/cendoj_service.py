"""
Servicio de ingesta de jurisprudencia desde CENDOJ.
Utiliza Playwright para automatizar el navegador y extraer resultados
de la web del Poder Judicial que carga dinámicamente con JavaScript.
"""
import asyncio
import logging
import re
from datetime import date, datetime
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from enum import Enum

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
    Servicio para extraer jurisprudencia de CENDOJ usando Playwright.

    Utiliza automatización de navegador para manejar la carga
    dinámica de JavaScript en la web del Poder Judicial.
    """

    BASE_URL = "https://www.poderjudicial.es"
    SEARCH_PAGE = f"{BASE_URL}/search/indexAN.jsp"

    # Rate limiting: segundos entre peticiones
    RATE_LIMIT = 2.0

    def __init__(self):
        self._last_request_time = 0
        self._browser = None
        self._playwright = None
        self._context = None
        self._rag_service: Optional[RAGService] = None

    async def _init_browser(self):
        """Inicializa el navegador Playwright."""
        if self._browser is None:
            try:
                from playwright.async_api import async_playwright

                self._playwright = await async_playwright().start()
                self._browser = await self._playwright.chromium.launch(
                    headless=True,
                    args=['--no-sandbox', '--disable-setuid-sandbox']
                )
                self._context = await self._browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    locale="es-ES",
                    timezone_id="Europe/Madrid"
                )
                logger.info("Navegador Playwright inicializado")
            except ImportError:
                raise ImportError(
                    "Playwright no está instalado. "
                    "Ejecuta: pip install playwright && playwright install chromium"
                )

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
        """Cierra el navegador y conexiones."""
        if self._context:
            await self._context.close()
            self._context = None
        if self._browser:
            await self._browser.close()
            self._browser = None
        if self._playwright:
            await self._playwright.stop()
            self._playwright = None
        logger.info("Navegador Playwright cerrado")

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
        Busca sentencias en CENDOJ usando Playwright.

        Returns:
            Lista de resultados con metadatos básicos y URL al documento.
        """
        await self._rate_limit()
        await self._init_browser()

        page = await self._context.new_page()
        results = []

        try:
            logger.info(f"Navegando a CENDOJ: {self.SEARCH_PAGE}")
            await page.goto(self.SEARCH_PAGE, wait_until="networkidle", timeout=60000)

            # Esperar a que cargue el formulario
            await page.wait_for_selector("form", timeout=30000)

            # Rellenar formulario de búsqueda
            # Jurisdicción
            if params.jurisdiccion:
                try:
                    await page.select_option(
                        "select[name='JURISDICCION'], #JURISDICCION",
                        value=params.jurisdiccion.value
                    )
                except Exception as e:
                    logger.warning(f"No se pudo seleccionar jurisdicción: {e}")

            # Tipo de órgano
            if params.tipo_organo:
                try:
                    await page.select_option(
                        "select[name='TIPO_ORGANO'], #TIPO_ORGANO",
                        value=params.tipo_organo.value
                    )
                except Exception as e:
                    logger.warning(f"No se pudo seleccionar tipo de órgano: {e}")

            # Fecha desde
            if params.fecha_desde:
                try:
                    fecha_str = params.fecha_desde.strftime("%d/%m/%Y")
                    await page.fill("input[name='FECHA_DESDE'], #FECHA_DESDE", fecha_str)
                except Exception as e:
                    logger.warning(f"No se pudo establecer fecha desde: {e}")

            # Fecha hasta
            if params.fecha_hasta:
                try:
                    fecha_str = params.fecha_hasta.strftime("%d/%m/%Y")
                    await page.fill("input[name='FECHA_HASTA'], #FECHA_HASTA", fecha_str)
                except Exception as e:
                    logger.warning(f"No se pudo establecer fecha hasta: {e}")

            # Texto libre
            if params.texto_libre:
                try:
                    await page.fill(
                        "input[name='TEXT'], textarea[name='TEXT'], #TEXT",
                        params.texto_libre
                    )
                except Exception as e:
                    logger.warning(f"No se pudo establecer texto libre: {e}")

            # Buscar el botón de búsqueda y hacer clic
            search_button_selectors = [
                "button[type='submit']",
                "input[type='submit']",
                "button:has-text('Buscar')",
                "input[value='Buscar']",
                ".btn-buscar",
                "#buscar"
            ]

            clicked = False
            for selector in search_button_selectors:
                try:
                    btn = page.locator(selector).first
                    if await btn.count() > 0:
                        await btn.click()
                        clicked = True
                        logger.info(f"Clic en botón de búsqueda: {selector}")
                        break
                except Exception:
                    continue

            if not clicked:
                # Intentar enviar el formulario directamente
                await page.evaluate("document.forms[0].submit()")
                logger.info("Formulario enviado via JavaScript")

            # Esperar a que carguen los resultados
            await asyncio.sleep(3)  # Espera inicial

            # Intentar esperar por diferentes selectores de resultados
            result_selectors = [
                ".listado-documentos",
                ".resultados",
                "#resultados",
                ".documento",
                "table.resultados",
                ".list-group-item"
            ]

            content_loaded = False
            for selector in result_selectors:
                try:
                    await page.wait_for_selector(selector, timeout=10000)
                    content_loaded = True
                    logger.info(f"Resultados encontrados con selector: {selector}")
                    break
                except Exception:
                    continue

            if not content_loaded:
                # Esperar un poco más y obtener el contenido de todas formas
                await asyncio.sleep(5)
                logger.warning("No se encontró selector de resultados específico, extrayendo contenido")

            # Obtener el HTML de la página
            html = await page.content()

            # Parsear resultados
            results = self._parse_search_results(html)
            logger.info(f"Encontrados {len(results)} resultados")

        except Exception as e:
            logger.error(f"Error en búsqueda CENDOJ: {e}")
            # Guardar screenshot para debug
            try:
                await page.screenshot(path="/tmp/cendoj_error.png")
                logger.info("Screenshot guardado en /tmp/cendoj_error.png")
            except:
                pass
            raise

        finally:
            await page.close()

        return results

    def _parse_search_results(self, html: str) -> List[Dict[str, Any]]:
        """Parsea los resultados de búsqueda."""
        soup = BeautifulSoup(html, "html.parser")
        results = []

        # Múltiples selectores posibles para resultados
        selectors = [
            ".listado-documentos .documento",
            ".resultado",
            ".list-group-item",
            "tr.resultado",
            ".item-resultado",
            "article",
            ".card"
        ]

        items = []
        for selector in selectors:
            items = soup.select(selector)
            if items:
                logger.info(f"Encontrados {len(items)} items con selector: {selector}")
                break

        # Si no encontramos con selectores específicos, buscar enlaces a documentos
        if not items:
            links = soup.find_all("a", href=re.compile(r"documento|sentencia|resolucion", re.I))
            for link in links:
                parent = link.find_parent(["div", "tr", "li", "article"])
                if parent and parent not in items:
                    items.append(parent)
            logger.info(f"Encontrados {len(items)} items mediante enlaces")

        for item in items:
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
        link = item.select_one("a[href*='documento'], a[href*='sentencia'], a[href*='DOC']")
        if not link:
            # Buscar cualquier enlace
            link = item.select_one("a[href]")

        if not link:
            return None

        url = link.get("href", "")
        if not url.startswith("http"):
            url = f"{self.BASE_URL}{url}"

        # Extraer texto completo del item
        text = item.get_text(" ", strip=True)

        if len(text) < 10:  # Filtrar items sin contenido útil
            return None

        # Extraer identificadores
        ecli_match = re.search(r"ECLI:ES:\w+:\d{4}:\d+", text)
        roj_match = re.search(r"((?:STS|SAP|STSJ|SAN|ATS|AAP|SJMER|SJS|AUTO)\s*\d+/\d{4})", text, re.I)

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
        tribunal = ""
        tribunal_patterns = [
            r"(Tribunal Supremo[^,\n]*)",
            r"(Audiencia (?:Nacional|Provincial)[^,\n]*)",
            r"((?:TSJ|Tribunal Superior)[^,\n]*)",
            r"(Juzgado[^,\n]*)",
        ]
        for pattern in tribunal_patterns:
            match = re.search(pattern, text, re.I)
            if match:
                tribunal = match.group(1).strip()
                break

        return {
            "url": url,
            "ecli": ecli_match.group(0) if ecli_match else None,
            "roj": roj_match.group(1) if roj_match else None,
            "tribunal": tribunal,
            "fecha": fecha,
            "resumen": text[:500] if text else ""
        }

    async def fetch_document(self, url: str) -> Optional[CendojSentencia]:
        """
        Descarga y parsea un documento completo de CENDOJ usando Playwright.

        Args:
            url: URL del documento

        Returns:
            CendojSentencia con todos los datos extraídos
        """
        await self._rate_limit()
        await self._init_browser()

        page = await self._context.new_page()

        try:
            logger.info(f"Descargando documento: {url}")
            await page.goto(url, wait_until="networkidle", timeout=60000)

            # Esperar a que cargue el contenido
            await asyncio.sleep(2)

            # Intentar esperar por el contenido del documento
            content_selectors = [
                "#contenido",
                ".documentoTexto",
                "#documento",
                ".contenido-documento",
                "article",
                ".texto-resolucion"
            ]

            for selector in content_selectors:
                try:
                    await page.wait_for_selector(selector, timeout=5000)
                    break
                except:
                    continue

            html = await page.content()
            return self._parse_document(html, url)

        except Exception as e:
            logger.error(f"Error descargando documento {url}: {e}")
            return None

        finally:
            await page.close()

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
        contenido = None
        for selector in ["#contenido", ".documentoTexto", "#documento", ".contenido-documento", "article", "main"]:
            contenido = soup.select_one(selector)
            if contenido:
                break

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

        max_score = max(scores.values())
        if max_score > 0:
            for j, score in scores.items():
                if score == max_score:
                    return j

        return Jurisdiccion.CIVIL

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
