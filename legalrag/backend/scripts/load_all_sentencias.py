#!/usr/bin/env python3
"""
Carga todas las sentencias JSON de la carpeta sentencias/ en la base de datos.

Uso:
    cd legalrag/backend
    python scripts/load_all_sentencias.py
"""
import asyncio
import json
import sys
from datetime import datetime
from pathlib import Path

# Añadir el directorio backend al path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.core.database import engine
from app.models.jurisprudencia import Jurisprudencia, Jurisdiccion, TipoTribunal


def parse_date(date_str: str):
    """Parsea una fecha en formato ISO."""
    return datetime.strptime(date_str, "%Y-%m-%d").date()


def get_tipo_tribunal(tipo_str: str) -> TipoTribunal:
    """Convierte string a TipoTribunal enum."""
    mapping = {
        "tribunal_supremo": TipoTribunal.TRIBUNAL_SUPREMO,
        "audiencia_nacional": TipoTribunal.AUDIENCIA_NACIONAL,
        "tribunal_superior_justicia": TipoTribunal.TSJ,
        "tsj": TipoTribunal.TSJ,
        "audiencia_provincial": TipoTribunal.AUDIENCIA_PROVINCIAL,
        "juzgado_mercantil": TipoTribunal.JUZGADO_MERCANTIL,
        "juzgado_social": TipoTribunal.JUZGADO_SOCIAL,
    }
    return mapping.get(tipo_str.lower(), TipoTribunal.OTRO)


def get_jurisdiccion(jur_str: str) -> Jurisdiccion:
    """Convierte string a Jurisdiccion enum."""
    mapping = {
        "civil": Jurisdiccion.CIVIL,
        "penal": Jurisdiccion.PENAL,
        "social": Jurisdiccion.SOCIAL,
        "contencioso_administrativo": Jurisdiccion.CONTENCIOSO,
        "contencioso": Jurisdiccion.CONTENCIOSO,
        "mercantil": Jurisdiccion.MERCANTIL,
        "militar": Jurisdiccion.MILITAR,
    }
    return mapping.get(jur_str.lower(), Jurisdiccion.CIVIL)


async def load_all():
    """Carga todas las sentencias JSON en la base de datos."""
    sentencias_dir = Path(__file__).parent / "sentencias"

    if not sentencias_dir.exists():
        print(f"No existe el directorio {sentencias_dir}")
        return

    json_files = list(sentencias_dir.glob("*.json"))

    if not json_files:
        print("No hay archivos JSON en la carpeta sentencias/")
        return

    print(f"Encontrados {len(json_files)} archivos JSON")
    print("=" * 50)

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    loaded = 0
    skipped = 0
    errors = 0

    async with async_session() as db:
        for json_file in json_files:
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                ecli = data.get("ecli")
                roj = data.get("roj")

                # Verificar duplicados
                if ecli:
                    result = await db.execute(
                        select(Jurisprudencia).where(Jurisprudencia.ecli == ecli)
                    )
                    if result.scalar_one_or_none():
                        print(f"  ⏭️  {json_file.name}: Ya existe (ECLI)")
                        skipped += 1
                        continue

                if roj:
                    result = await db.execute(
                        select(Jurisprudencia).where(Jurisprudencia.roj == roj)
                    )
                    if result.scalar_one_or_none():
                        print(f"  ⏭️  {json_file.name}: Ya existe (ROJ)")
                        skipped += 1
                        continue

                # Crear sentencia
                sentencia = Jurisprudencia(
                    ecli=ecli,
                    roj=roj,
                    tribunal=data.get("tribunal", "Tribunal desconocido"),
                    tipo_tribunal=get_tipo_tribunal(data.get("tipo_tribunal", "otro")),
                    sede=data.get("sede"),
                    seccion=data.get("seccion"),
                    tipo_resolucion=data.get("tipo_resolucion", "Sentencia"),
                    numero_resolucion=data.get("numero_resolucion"),
                    fecha_resolucion=parse_date(data["fecha_resolucion"]),
                    ponente=data.get("ponente"),
                    jurisdiccion=get_jurisdiccion(data.get("jurisdiccion", "civil")),
                    materia=data.get("materia"),
                    voces=data.get("voces"),
                    cabecera=data.get("cabecera"),
                    fundamentos_derecho=data.get("fundamentos_derecho", ""),
                    fallo=data.get("fallo"),
                    texto_completo=data.get("texto_completo", ""),
                    fuente="cendoj_manual",
                    indexada=False
                )

                db.add(sentencia)
                loaded += 1
                print(f"  ✅ {json_file.name}: {roj or ecli}")

            except Exception as e:
                print(f"  ❌ {json_file.name}: Error - {e}")
                errors += 1

        await db.commit()

    print("=" * 50)
    print(f"Resumen:")
    print(f"  - Cargadas: {loaded}")
    print(f"  - Omitidas (duplicados): {skipped}")
    print(f"  - Errores: {errors}")

    if loaded > 0:
        print(f"\n✅ {loaded} sentencias añadidas a la base de datos")
        print("Para indexar en Qdrant, reinicia el backend o usa el endpoint de reindexación")


if __name__ == "__main__":
    print("=" * 50)
    print("CARGANDO SENTENCIAS EN BASE DE DATOS")
    print("=" * 50)
    asyncio.run(load_all())
