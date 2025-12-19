"""
Servicio RAG - Retrieval Augmented Generation para jurisprudencia.
Motor de búsqueda semántica y recuperación de documentos legales.
"""
import logging
from typing import List, Optional, Dict, Any
from datetime import date
import asyncio

from qdrant_client import QdrantClient
from qdrant_client.http import models
from qdrant_client.http.models import Distance, VectorParams, PointStruct
from sentence_transformers import SentenceTransformer

from app.core.config import settings

logger = logging.getLogger(__name__)


class RAGService:
    """
    Servicio de Retrieval Augmented Generation.
    Gestiona embeddings y búsqueda vectorial para jurisprudencia española.
    Implementado como singleton para evitar conflictos de acceso.
    """
    _instance: Optional['RAGService'] = None
    _initialized: bool = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        # Solo inicializar una vez
        if RAGService._initialized:
            return
        RAGService._initialized = True

        # Intentar conectar a servidor Qdrant, si no, usar modo en memoria
        try:
            self.qdrant = QdrantClient(
                host=settings.qdrant_host,
                port=settings.qdrant_port,
                timeout=5
            )
            # Verificar conexión
            self.qdrant.get_collections()
            logger.info("Conectado a servidor Qdrant")
            self._using_local = False
        except Exception as e:
            logger.warning(f"Qdrant server no disponible ({e}), usando modo en memoria")
            # Usar modo en memoria (no persiste pero evita conflictos)
            self.qdrant = QdrantClient(":memory:")
            self._using_local = True
            logger.info("Usando Qdrant en memoria")

        self._model: Optional[SentenceTransformer] = None
        self._model_lock = asyncio.Lock()

    @property
    def model(self) -> SentenceTransformer:
        """Carga lazy del modelo de embeddings."""
        if self._model is None:
            logger.info(f"Cargando modelo de embeddings: {settings.embedding_model}")
            self._model = SentenceTransformer(settings.embedding_model)
            logger.info("Modelo de embeddings cargado")
        return self._model

    async def init_collection(self):
        """Inicializa colección en Qdrant si no existe."""
        collections = self.qdrant.get_collections().collections
        collection_names = [c.name for c in collections]

        # Colección principal de jurisprudencia
        if settings.qdrant_collection_name not in collection_names:
            self.qdrant.create_collection(
                collection_name=settings.qdrant_collection_name,
                vectors_config=VectorParams(
                    size=settings.embedding_dimension,
                    distance=Distance.COSINE
                )
            )
            logger.info(f"Colección '{settings.qdrant_collection_name}' creada")

        # Colección para documentos de casos
        if "documentos_casos" not in collection_names:
            self.qdrant.create_collection(
                collection_name="documentos_casos",
                vectors_config=VectorParams(
                    size=settings.embedding_dimension,
                    distance=Distance.COSINE
                )
            )
            logger.info("Colección 'documentos_casos' creada")

        # Colección para legislación
        if "legislacion" not in collection_names:
            self.qdrant.create_collection(
                collection_name="legislacion",
                vectors_config=VectorParams(
                    size=settings.embedding_dimension,
                    distance=Distance.COSINE
                )
            )
            logger.info("Colección 'legislacion' creada")

    def generate_embedding(self, text: str) -> List[float]:
        """Genera embedding para un texto."""
        # Prefijo para mejor rendimiento con E5
        text_with_prefix = f"query: {text}"
        embedding = self.model.encode(text_with_prefix, normalize_embeddings=True)
        return embedding.tolist()

    def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Genera embeddings para múltiples textos."""
        texts_with_prefix = [f"passage: {t}" for t in texts]
        embeddings = self.model.encode(
            texts_with_prefix,
            normalize_embeddings=True,
            show_progress_bar=True
        )
        return embeddings.tolist()

    def chunk_text(
        self,
        text: str,
        chunk_size: int = 1000,
        overlap: int = 200
    ) -> List[str]:
        """
        Divide texto en chunks con overlap.
        Optimizado para textos jurídicos (respeta párrafos cuando es posible).
        """
        # Dividir por párrafos primero
        paragraphs = text.split('\n\n')
        chunks = []
        current_chunk = ""

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            if len(current_chunk) + len(para) < chunk_size:
                current_chunk += para + "\n\n"
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                    # Overlap: mantener últimas palabras
                    words = current_chunk.split()
                    overlap_text = " ".join(words[-overlap // 5:]) if len(words) > overlap // 5 else ""
                    current_chunk = overlap_text + "\n\n" + para + "\n\n"
                else:
                    # Párrafo muy largo, dividir por oraciones
                    sentences = para.replace('. ', '.\n').split('\n')
                    for sent in sentences:
                        if len(current_chunk) + len(sent) < chunk_size:
                            current_chunk += sent + " "
                        else:
                            if current_chunk:
                                chunks.append(current_chunk.strip())
                            current_chunk = sent + " "

        if current_chunk:
            chunks.append(current_chunk.strip())

        return chunks

    async def index_jurisprudencia(
        self,
        jurisprudencia_id: int,
        texto: str,
        metadata: Dict[str, Any]
    ) -> List[str]:
        """
        Indexa una sentencia en Qdrant.
        Retorna lista de IDs de los chunks generados.
        """
        chunks = self.chunk_text(texto)
        if not chunks:
            return []

        embeddings = self.generate_embeddings_batch(chunks)

        points = []
        point_ids = []
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            point_id = f"jur_{jurisprudencia_id}_{i}"
            point_ids.append(point_id)
            points.append(PointStruct(
                id=point_id,
                vector=embedding,
                payload={
                    "tipo": "jurisprudencia",
                    "fuente_id": jurisprudencia_id,
                    "chunk_index": i,
                    "texto": chunk,
                    **metadata
                }
            ))

        self.qdrant.upsert(
            collection_name=settings.qdrant_collection_name,
            points=points
        )

        logger.info(f"Indexada jurisprudencia {jurisprudencia_id}: {len(chunks)} chunks")
        return point_ids

    async def index_documento_caso(
        self,
        documento_id: int,
        caso_id: int,
        texto: str,
        metadata: Dict[str, Any]
    ) -> List[str]:
        """Indexa un documento de caso."""
        chunks = self.chunk_text(texto)
        if not chunks:
            return []

        embeddings = self.generate_embeddings_batch(chunks)

        points = []
        point_ids = []
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            point_id = f"doc_{documento_id}_{i}"
            point_ids.append(point_id)
            points.append(PointStruct(
                id=point_id,
                vector=embedding,
                payload={
                    "tipo": "documento_caso",
                    "documento_id": documento_id,
                    "caso_id": caso_id,
                    "chunk_index": i,
                    "texto": chunk,
                    **metadata
                }
            ))

        self.qdrant.upsert(
            collection_name="documentos_casos",
            points=points
        )

        return point_ids

    async def index_legislacion(
        self,
        legislacion_id: int,
        texto: str,
        metadata: Dict[str, Any]
    ) -> List[str]:
        """Indexa una norma legal."""
        # Para legislación, chunks más pequeños por artículos
        chunks = self.chunk_text(texto, chunk_size=800, overlap=100)
        if not chunks:
            return []

        embeddings = self.generate_embeddings_batch(chunks)

        points = []
        point_ids = []
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            point_id = f"leg_{legislacion_id}_{i}"
            point_ids.append(point_id)
            points.append(PointStruct(
                id=point_id,
                vector=embedding,
                payload={
                    "tipo": "legislacion",
                    "fuente_id": legislacion_id,
                    "chunk_index": i,
                    "texto": chunk,
                    **metadata
                }
            ))

        self.qdrant.upsert(
            collection_name="legislacion",
            points=points
        )

        return point_ids

    async def search_jurisprudencia(
        self,
        query: str,
        jurisdiccion: Optional[str] = None,
        tipo_tribunal: Optional[str] = None,
        fecha_desde: Optional[date] = None,
        fecha_hasta: Optional[date] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Búsqueda semántica de jurisprudencia.
        Filtra por metadatos y retorna resultados ordenados por relevancia.
        """
        query_embedding = self.generate_embedding(query)

        # Construir filtros
        must_conditions = []

        if jurisdiccion:
            must_conditions.append(
                models.FieldCondition(
                    key="jurisdiccion",
                    match=models.MatchValue(value=jurisdiccion)
                )
            )

        if tipo_tribunal:
            must_conditions.append(
                models.FieldCondition(
                    key="tipo_tribunal",
                    match=models.MatchValue(value=tipo_tribunal)
                )
            )

        if fecha_desde:
            must_conditions.append(
                models.FieldCondition(
                    key="fecha",
                    range=models.Range(gte=fecha_desde.isoformat())
                )
            )

        if fecha_hasta:
            must_conditions.append(
                models.FieldCondition(
                    key="fecha",
                    range=models.Range(lte=fecha_hasta.isoformat())
                )
            )

        search_filter = models.Filter(must=must_conditions) if must_conditions else None

        results = self.qdrant.search(
            collection_name=settings.qdrant_collection_name,
            query_vector=query_embedding,
            query_filter=search_filter,
            limit=limit * 2,  # Más para deduplicar por fuente
            with_payload=True
        )

        # Deduplicar por fuente y agregar chunks del mismo documento
        seen_sources = {}
        for result in results:
            source_id = result.payload.get("fuente_id")
            if source_id not in seen_sources:
                seen_sources[source_id] = {
                    "id": source_id,
                    "score": result.score,
                    "textos": [result.payload.get("texto", "")],
                    "metadata": {
                        k: v for k, v in result.payload.items()
                        if k not in ["texto", "chunk_index"]
                    }
                }
            else:
                seen_sources[source_id]["textos"].append(result.payload.get("texto", ""))

        # Ordenar por score y limitar
        results_list = sorted(
            seen_sources.values(),
            key=lambda x: x["score"],
            reverse=True
        )[:limit]

        return results_list

    async def search_all(
        self,
        query: str,
        include_jurisprudencia: bool = True,
        include_legislacion: bool = True,
        caso_id: Optional[int] = None,
        limit: int = 20
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Búsqueda combinada en todas las fuentes.
        Útil para análisis completo de casos.
        """
        query_embedding = self.generate_embedding(query)
        results = {
            "jurisprudencia": [],
            "legislacion": [],
            "documentos_caso": []
        }

        # Búsqueda en jurisprudencia
        if include_jurisprudencia:
            jur_results = self.qdrant.search(
                collection_name=settings.qdrant_collection_name,
                query_vector=query_embedding,
                limit=limit,
                with_payload=True
            )
            results["jurisprudencia"] = [
                {
                    "id": r.payload.get("fuente_id"),
                    "score": r.score,
                    "texto": r.payload.get("texto"),
                    "metadata": {k: v for k, v in r.payload.items() if k != "texto"}
                }
                for r in jur_results
            ]

        # Búsqueda en legislación
        if include_legislacion:
            leg_results = self.qdrant.search(
                collection_name="legislacion",
                query_vector=query_embedding,
                limit=limit // 2,
                with_payload=True
            )
            results["legislacion"] = [
                {
                    "id": r.payload.get("fuente_id"),
                    "score": r.score,
                    "texto": r.payload.get("texto"),
                    "metadata": {k: v for k, v in r.payload.items() if k != "texto"}
                }
                for r in leg_results
            ]

        # Búsqueda en documentos del caso específico
        if caso_id:
            doc_filter = models.Filter(
                must=[
                    models.FieldCondition(
                        key="caso_id",
                        match=models.MatchValue(value=caso_id)
                    )
                ]
            )
            doc_results = self.qdrant.search(
                collection_name="documentos_casos",
                query_vector=query_embedding,
                query_filter=doc_filter,
                limit=limit,
                with_payload=True
            )
            results["documentos_caso"] = [
                {
                    "id": r.payload.get("documento_id"),
                    "score": r.score,
                    "texto": r.payload.get("texto"),
                    "metadata": {k: v for k, v in r.payload.items() if k != "texto"}
                }
                for r in doc_results
            ]

        return results

    async def delete_by_source(
        self,
        collection: str,
        source_id: int,
        source_field: str = "fuente_id"
    ):
        """Elimina todos los vectores de una fuente."""
        self.qdrant.delete(
            collection_name=collection,
            points_selector=models.FilterSelector(
                filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key=source_field,
                            match=models.MatchValue(value=source_id)
                        )
                    ]
                )
            )
        )

    def get_collection_stats(self) -> Dict[str, Any]:
        """Obtiene estadísticas de las colecciones."""
        stats = {}
        for collection_name in [settings.qdrant_collection_name, "documentos_casos", "legislacion"]:
            try:
                info = self.qdrant.get_collection(collection_name)
                # Compatibilidad con diferentes versiones de API
                stats[collection_name] = {
                    "points_count": getattr(info, 'points_count', 0),
                    "vectors_count": getattr(info, 'vectors_count', getattr(info, 'points_count', 0)),
                    "status": str(info.status) if hasattr(info, 'status') and info.status else "green"
                }
            except Exception as e:
                stats[collection_name] = {"error": str(e)}
        return stats
