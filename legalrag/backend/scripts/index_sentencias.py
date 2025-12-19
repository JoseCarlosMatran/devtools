#!/usr/bin/env python3
"""
Script para indexar las sentencias existentes en Qdrant.
"""
import asyncio
import sys
sys.path.insert(0, '/home/user/devtools/legalrag/backend')

from sqlalchemy import select, update
from app.core.database import AsyncSessionLocal
from app.models.jurisprudencia import Jurisprudencia
from app.services.rag_service import RAGService

async def index_all_sentencias():
    """Indexa todas las sentencias no indexadas."""
    rag_service = RAGService()

    # Inicializar colecciones
    await rag_service.init_collection()
    print("✅ Colecciones inicializadas")

    # Primero obtener IDs de sentencias no indexadas
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Jurisprudencia.id, Jurisprudencia.roj).where(Jurisprudencia.indexada == False)
        )
        sentencias_info = result.all()
        print(f"📋 Encontradas {len(sentencias_info)} sentencias sin indexar")

    # Procesar cada sentencia en su propia sesión
    for jur_id, roj in sentencias_info:
        async with AsyncSessionLocal() as db:
            try:
                # Obtener sentencia completa
                result = await db.execute(
                    select(Jurisprudencia).where(Jurisprudencia.id == jur_id)
                )
                jur = result.scalar_one()

                # Preparar texto para indexar
                texto = f"""
                {jur.cabecera or ''}
                {jur.fundamentos_derecho or ''}
                {jur.fallo or ''}
                """

                # Si el texto es muy corto, usar texto completo
                if len(texto.strip()) < 500 and jur.texto_completo:
                    texto = jur.texto_completo

                # Metadata
                metadata = {
                    "id": jur.id,
                    "ecli": jur.ecli or "",
                    "roj": jur.roj or "",
                    "tribunal": jur.tribunal or "",
                    "tipo_tribunal": jur.tipo_tribunal.value if jur.tipo_tribunal else "",
                    "jurisdiccion": jur.jurisdiccion.value if jur.jurisdiccion else "",
                    "fecha": str(jur.fecha_resolucion) if jur.fecha_resolucion else "",
                    "materia": jur.materia or "",
                    "voces": jur.voces or ""
                }

                # Indexar
                await rag_service.index_jurisprudencia(jur.id, texto, metadata)

                # Marcar como indexada usando update directo
                await db.execute(
                    update(Jurisprudencia).where(Jurisprudencia.id == jur_id).values(indexada=True)
                )
                await db.commit()

                materia_short = (jur.materia or "")[:50]
                print(f"  ✅ Indexada: {roj} - {materia_short}...")

            except Exception as e:
                print(f"  ❌ Error indexando {roj}: {e}")

    # Mostrar estadísticas
    stats = rag_service.get_collection_stats()
    print(f"\n📊 Estadísticas Qdrant:")
    for collection, data in stats.items():
        if "error" not in data:
            print(f"  - {collection}: {data.get('points_count', 0)} vectores")
        else:
            print(f"  - {collection}: {data['error']}")

if __name__ == "__main__":
    asyncio.run(index_all_sentencias())
