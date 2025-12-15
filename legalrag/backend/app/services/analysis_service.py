"""
Servicio de Análisis de Casos.
Motor de inteligencia jurídica: conecta hechos, normas y jurisprudencia.
"""
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import json

from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.models.case import Case, CaseAnalysis, TipoCaso, RolCliente
from app.models.document import Document
from app.services.rag_service import RAGService

logger = logging.getLogger(__name__)


class AnalysisService:
    """
    Servicio de análisis jurídico con IA.
    Genera estrategias de defensa/ataque adaptadas al caso concreto.
    """

    def __init__(self):
        self.rag = RAGService()
        self.llm = AsyncOpenAI(api_key=settings.openai_api_key)

    def _build_system_prompt(self, tipo_caso: TipoCaso, rol_cliente: RolCliente) -> str:
        """Construye prompt de sistema especializado."""
        rol_texto = "demandante/acusador" if rol_cliente in [
            RolCliente.DEMANDANTE, RolCliente.ACUSACION_PARTICULAR
        ] else "demandado/defensa"

        jurisdiccion_contexto = {
            TipoCaso.CIVIL: """
Contexto Civil:
- Código Civil (arts. relevantes: obligaciones, contratos, responsabilidad)
- Ley de Enjuiciamiento Civil
- Jurisprudencia del TS Sala 1ª
- Carga de la prueba según art. 217 LEC""",
            TipoCaso.PENAL: """
Contexto Penal:
- Código Penal (tipos delictivos, circunstancias modificativas)
- LECrim (derechos del investigado, prueba)
- Jurisprudencia del TS Sala 2ª
- Principio in dubio pro reo
- Presunción de inocencia (art. 24.2 CE)""",
            TipoCaso.MERCANTIL: """
Contexto Mercantil:
- Código de Comercio
- Ley de Sociedades de Capital
- Ley Concursal
- Jurisprudencia del TS Sala 1ª (sección mercantil)""",
            TipoCaso.CONSUMO: """
Contexto Consumo:
- LGDCU (Ley General de Defensa de Consumidores)
- Directivas UE de protección al consumidor
- Cláusulas abusivas (control de transparencia y abusividad)
- Jurisprudencia TJUE y TS sobre consumidores
- Inversión de carga de la prueba favorable al consumidor""",
            TipoCaso.LABORAL: """
Contexto Laboral:
- Estatuto de los Trabajadores
- LRJS (Ley Reguladora de la Jurisdicción Social)
- Convenios colectivos aplicables
- Jurisprudencia del TS Sala 4ª""",
            TipoCaso.FAMILIA: """
Contexto Familia:
- Código Civil (Libro I)
- Medidas paternofiliales
- Interés superior del menor
- Jurisprudencia del TS sobre custodia y pensiones"""
        }

        return f"""Eres un abogado experto en Derecho español con 25 años de experiencia en litigación.
Tu rol es analizar casos y preparar estrategias para {rol_texto}.

{jurisdiccion_contexto.get(tipo_caso, "")}

INSTRUCCIONES CRÍTICAS:
1. Analiza los hechos de forma objetiva y rigurosa
2. Identifica TODOS los problemas jurídicos (sustantivos y procesales)
3. Cita normativa ESPECÍFICA (artículos concretos)
4. La jurisprudencia debe ser APLICABLE al caso, no genérica
5. Los argumentos deben ser UTILIZABLES en juicio oral o escrito
6. Identifica riesgos reales y puntos débiles
7. Sé directo, sin florituras académicas
8. Piensa como si fueras a defender este caso en sala

FORMATO DE RESPUESTA: JSON estructurado"""

    def _build_analysis_prompt(
        self,
        caso: Case,
        documentos_texto: str,
        jurisprudencia_relevante: List[Dict],
        legislacion_relevante: List[Dict]
    ) -> str:
        """Construye prompt de análisis."""

        jur_context = "\n".join([
            f"- {j['metadata'].get('tribunal', 'Tribunal')}, {j['metadata'].get('fecha', 'fecha')}: {j['texto'][:500]}..."
            for j in jurisprudencia_relevante[:5]
        ]) if jurisprudencia_relevante else "No hay jurisprudencia indexada relevante."

        leg_context = "\n".join([
            f"- {l['metadata'].get('titulo', 'Norma')}: {l['texto'][:300]}..."
            for l in legislacion_relevante[:3]
        ]) if legislacion_relevante else ""

        return f"""CASO A ANALIZAR:
Título: {caso.titulo}
Tipo: {caso.tipo_caso.value}
Rol del cliente: {caso.rol_cliente.value}
Juzgado: {caso.juzgado or 'No especificado'}
Procedimiento: {caso.numero_procedimiento or 'No especificado'}

DOCUMENTOS DEL CASO:
{documentos_texto}

JURISPRUDENCIA POTENCIALMENTE RELEVANTE:
{jur_context}

LEGISLACIÓN RELACIONADA:
{leg_context}

Genera un análisis completo en formato JSON con esta estructura exacta:
{{
    "resumen_ejecutivo": "Resumen de 2-3 párrafos del caso y valoración inicial",
    "hechos_relevantes": [
        {{"descripcion": "...", "relevancia": "alta/media/baja", "fuente_documento": "..."}}
    ],
    "problemas_juridicos": [
        {{"descripcion": "...", "tipo": "sustantivo/procesal/probatorio", "normas_relacionadas": ["art. X CC", ...]}}
    ],
    "normativa_aplicable": [
        {{"norma": "nombre completo", "articulos": ["art. X", ...], "relevancia": "principal/secundaria", "aplicacion": "cómo aplica al caso"}}
    ],
    "jurisprudencia_relevante": [
        {{"identificador": "ROJ/ECLI", "tribunal": "...", "fecha": "...", "extracto": "fundamento aplicable", "aplicacion_caso": "cómo refuerza nuestra posición"}}
    ],
    "estrategia_defensa": "Si el cliente es demandado: estrategia detallada...",
    "estrategia_ataque": "Si el cliente es demandante: estrategia detallada...",
    "argumentos_principales": [
        {{"titulo": "...", "desarrollo": "argumento completo para usar en juicio", "fundamento_legal": "art. X de Y", "jurisprudencia_apoyo": ["ROJ..."], "fuerza": "fuerte/moderado/débil"}}
    ],
    "riesgos": [
        {{"descripcion": "...", "gravedad": "alta/media/baja", "mitigacion": "cómo minimizarlo"}}
    ],
    "puntos_debiles": ["punto 1", "punto 2", ...],
    "recomendaciones": ["recomendación 1", "recomendación 2", ...]
}}"""

    async def analyze_case(
        self,
        db: AsyncSession,
        caso_id: int,
        profundidad: str = "completo"
    ) -> CaseAnalysis:
        """
        Ejecuta análisis completo de un caso.
        """
        # Obtener caso con documentos
        result = await db.execute(
            select(Case).where(Case.id == caso_id)
        )
        caso = result.scalar_one_or_none()
        if not caso:
            raise ValueError(f"Caso {caso_id} no encontrado")

        # Obtener documentos procesados
        docs_result = await db.execute(
            select(Document).where(
                Document.caso_id == caso_id,
                Document.texto_extraido.isnot(None)
            )
        )
        documentos = docs_result.scalars().all()

        # Combinar texto de documentos
        docs_texto = "\n\n---\n\n".join([
            f"[{doc.tipo_documento.value.upper()}] {doc.nombre_original}:\n{doc.texto_extraido[:3000]}"
            for doc in documentos
        ])

        if not docs_texto:
            docs_texto = f"Descripción del caso: {caso.descripcion or 'Sin descripción'}"

        # Buscar jurisprudencia y legislación relevante
        query_busqueda = f"{caso.titulo} {caso.descripcion or ''}"
        resultados_rag = await self.rag.search_all(
            query=query_busqueda,
            include_jurisprudencia=True,
            include_legislacion=True,
            caso_id=caso_id,
            limit=15
        )

        # Construir prompts
        system_prompt = self._build_system_prompt(caso.tipo_caso, caso.rol_cliente)
        analysis_prompt = self._build_analysis_prompt(
            caso,
            docs_texto,
            resultados_rag.get("jurisprudencia", []),
            resultados_rag.get("legislacion", [])
        )

        # Llamar al LLM
        max_tokens = {"rapido": 2000, "normal": 4000, "completo": 8000}.get(profundidad, 4000)

        try:
            response = await self.llm.chat.completions.create(
                model=settings.openai_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": analysis_prompt}
                ],
                max_tokens=max_tokens,
                temperature=0.3,  # Baja para consistencia legal
                response_format={"type": "json_object"}
            )

            analysis_json = json.loads(response.choices[0].message.content)
            tokens_used = response.usage.total_tokens

        except Exception as e:
            logger.error(f"Error en LLM: {e}")
            # Análisis básico de fallback
            analysis_json = self._generate_fallback_analysis(caso, docs_texto)
            tokens_used = 0

        # Obtener versión del análisis
        existing_count = await db.execute(
            select(CaseAnalysis).where(CaseAnalysis.caso_id == caso_id)
        )
        version = len(existing_count.scalars().all()) + 1

        # Crear registro de análisis
        analysis = CaseAnalysis(
            caso_id=caso_id,
            resumen_ejecutivo=analysis_json.get("resumen_ejecutivo", ""),
            hechos_relevantes=analysis_json.get("hechos_relevantes", []),
            problemas_juridicos=analysis_json.get("problemas_juridicos", []),
            normativa_aplicable=analysis_json.get("normativa_aplicable", []),
            jurisprudencia_relevante=analysis_json.get("jurisprudencia_relevante", []),
            estrategia_defensa=analysis_json.get("estrategia_defensa"),
            estrategia_ataque=analysis_json.get("estrategia_ataque"),
            argumentos_principales=analysis_json.get("argumentos_principales", []),
            riesgos=analysis_json.get("riesgos", []),
            puntos_debiles=analysis_json.get("puntos_debiles", []),
            recomendaciones=analysis_json.get("recomendaciones", []),
            version=version,
            modelo_usado=settings.openai_model,
            tokens_consumidos=tokens_used
        )

        db.add(analysis)
        await db.flush()

        # Actualizar estado del caso
        caso.estado = "analizado"
        await db.commit()

        return analysis

    def _generate_fallback_analysis(self, caso: Case, docs_texto: str) -> Dict:
        """Genera análisis básico sin LLM."""
        return {
            "resumen_ejecutivo": f"Caso de tipo {caso.tipo_caso.value}. El cliente actúa como {caso.rol_cliente.value}. Se requiere revisión manual del análisis.",
            "hechos_relevantes": [
                {"descripcion": "Pendiente de análisis detallado", "relevancia": "alta", "fuente_documento": "documentos del caso"}
            ],
            "problemas_juridicos": [
                {"descripcion": f"Determinar aplicación de normativa {caso.tipo_caso.value}", "tipo": "sustantivo", "normas_relacionadas": []}
            ],
            "normativa_aplicable": [],
            "jurisprudencia_relevante": [],
            "estrategia_defensa": "Requiere análisis manual" if caso.rol_cliente in [RolCliente.DEMANDADO, RolCliente.INVESTIGADO] else None,
            "estrategia_ataque": "Requiere análisis manual" if caso.rol_cliente in [RolCliente.DEMANDANTE, RolCliente.ACUSACION_PARTICULAR] else None,
            "argumentos_principales": [],
            "riesgos": [
                {"descripcion": "Análisis automático no disponible", "gravedad": "media", "mitigacion": "Revisar manualmente"}
            ],
            "puntos_debiles": ["Requiere revisión manual"],
            "recomendaciones": ["Completar análisis con asistencia del sistema cuando esté disponible"]
        }

    async def search_similar_cases(
        self,
        db: AsyncSession,
        caso_id: int,
        limit: int = 5
    ) -> List[Dict]:
        """Busca casos similares basándose en el contenido."""
        result = await db.execute(
            select(Case).where(Case.id == caso_id)
        )
        caso = result.scalar_one_or_none()
        if not caso:
            return []

        query = f"{caso.titulo} {caso.descripcion or ''}"
        resultados = await self.rag.search_jurisprudencia(
            query=query,
            jurisdiccion=caso.tipo_caso.value if caso.tipo_caso != TipoCaso.OTRO else None,
            limit=limit
        )

        return resultados
