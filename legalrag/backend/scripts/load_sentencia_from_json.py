#!/usr/bin/env python3
"""
Script para cargar una sentencia desde un archivo JSON.

Uso:
    cd legalrag/backend
    python scripts/load_sentencia_from_json.py scripts/sentencia_sts_5481_2025.json
"""
import asyncio
import json
import sys
from datetime import date, datetime
from pathlib import Path

# Añadir el directorio backend al path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.core.database import engine
from app.models.jurisprudencia import Jurisprudencia, Jurisdiccion, TipoTribunal


def parse_date(date_str: str) -> date:
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


async def load_from_json(json_path: str, texto_completo: str = None):
    """Carga una sentencia desde un archivo JSON."""

    # Leer JSON
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"\nCargando sentencia: {data.get('roj', data.get('ecli', 'sin identificador'))}")

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        # Verificar duplicados
        if data.get("ecli"):
            result = await db.execute(
                select(Jurisprudencia).where(Jurisprudencia.ecli == data["ecli"])
            )
            if result.scalar_one_or_none():
                print(f"⚠️  Ya existe una sentencia con ECLI {data['ecli']}")
                return None

        if data.get("roj"):
            result = await db.execute(
                select(Jurisprudencia).where(Jurisprudencia.roj == data["roj"])
            )
            if result.scalar_one_or_none():
                print(f"⚠️  Ya existe una sentencia con ROJ {data['roj']}")
                return None

        # Crear sentencia
        sentencia = Jurisprudencia(
            ecli=data.get("ecli"),
            roj=data.get("roj"),
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
            texto_completo=texto_completo or data.get("texto_completo", ""),
            fuente="cendoj_manual",
            indexada=False
        )

        db.add(sentencia)
        await db.commit()
        await db.refresh(sentencia)

        print(f"✅ Sentencia guardada con ID: {sentencia.id}")
        print(f"   ECLI: {sentencia.ecli}")
        print(f"   ROJ: {sentencia.roj}")
        print(f"   Tribunal: {sentencia.tribunal}")
        print(f"   Fecha: {sentencia.fecha_resolucion}")
        print(f"   Jurisdicción: {sentencia.jurisdiccion.value}")

        return sentencia


async def main():
    if len(sys.argv) < 2:
        print("Uso: python load_sentencia_from_json.py <archivo.json> [archivo_texto.txt]")
        print("\nEl archivo JSON debe contener los metadatos de la sentencia.")
        print("Opcionalmente, puede proporcionar un archivo de texto con el contenido completo.")
        sys.exit(1)

    json_path = sys.argv[1]
    texto_path = sys.argv[2] if len(sys.argv) > 2 else None

    texto_completo = None
    if texto_path:
        with open(texto_path, 'r', encoding='utf-8') as f:
            texto_completo = f.read()

    await load_from_json(json_path, texto_completo)


if __name__ == "__main__":
    asyncio.run(main())
