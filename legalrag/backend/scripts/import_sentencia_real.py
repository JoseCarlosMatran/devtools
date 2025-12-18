#!/usr/bin/env python3
"""
Script interactivo para importar sentencias reales copiadas de CENDOJ.

Uso:
    cd legalrag/backend
    python scripts/import_sentencia_real.py

El script te pedirá pegar el texto de la sentencia y extraerá
automáticamente los metadatos (ROJ, ECLI, tribunal, fecha, etc.)
"""
import asyncio
import re
import sys
from datetime import datetime, date
from pathlib import Path

# Añadir el directorio backend al path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.core.database import engine
from app.models.jurisprudencia import Jurisprudencia, Jurisdiccion, TipoTribunal


def extract_ecli(text: str) -> str | None:
    """Extrae el ECLI del texto."""
    # Formato: ECLI:ES:TS:2024:1234
    match = re.search(r'ECLI:ES:[A-Z]+:\d{4}:\d+', text)
    return match.group(0) if match else None


def extract_roj(text: str) -> str | None:
    """Extrae el ROJ del texto."""
    # Formatos: STS 1234/2024, SAP M 5678/2024, STSJ CAT 9012/2024
    patterns = [
        r'ROJ:\s*(S[A-Z]+\s+[A-Z]*\s*\d+/\d{4})',
        r'(STS\s+\d+/\d{4})',
        r'(SAP\s+[A-Z]+\s+\d+/\d{4})',
        r'(STSJ\s+[A-Z]+\s+\d+/\d{4})',
        r'(SAN\s+\d+/\d{4})',
        r'(ATS\s+\d+/\d{4})',
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    return None


def extract_tribunal(text: str) -> tuple[str, TipoTribunal]:
    """Extrae el tribunal y su tipo."""
    text_lower = text.lower()

    if "tribunal supremo" in text_lower:
        # Detectar sala
        if "sala de lo civil" in text_lower or "sala primera" in text_lower:
            return "Tribunal Supremo. Sala de lo Civil", TipoTribunal.TRIBUNAL_SUPREMO
        elif "sala de lo penal" in text_lower or "sala segunda" in text_lower:
            return "Tribunal Supremo. Sala de lo Penal", TipoTribunal.TRIBUNAL_SUPREMO
        elif "sala de lo social" in text_lower or "sala cuarta" in text_lower:
            return "Tribunal Supremo. Sala de lo Social", TipoTribunal.TRIBUNAL_SUPREMO
        elif "sala de lo contencioso" in text_lower or "sala tercera" in text_lower:
            return "Tribunal Supremo. Sala de lo Contencioso-Administrativo", TipoTribunal.TRIBUNAL_SUPREMO
        return "Tribunal Supremo", TipoTribunal.TRIBUNAL_SUPREMO

    elif "audiencia nacional" in text_lower:
        if "sala de lo penal" in text_lower:
            return "Audiencia Nacional. Sala de lo Penal", TipoTribunal.AUDIENCIA_NACIONAL
        elif "sala de lo contencioso" in text_lower:
            return "Audiencia Nacional. Sala de lo Contencioso-Administrativo", TipoTribunal.AUDIENCIA_NACIONAL
        elif "sala de lo social" in text_lower:
            return "Audiencia Nacional. Sala de lo Social", TipoTribunal.AUDIENCIA_NACIONAL
        return "Audiencia Nacional", TipoTribunal.AUDIENCIA_NACIONAL

    elif "tribunal superior de justicia" in text_lower or "tsj" in text_lower:
        # Detectar comunidad
        comunidades = {
            "madrid": "Madrid", "cataluña": "Cataluña", "catalunya": "Cataluña",
            "andalucía": "Andalucía", "valencia": "Comunidad Valenciana",
            "galicia": "Galicia", "país vasco": "País Vasco", "euskadi": "País Vasco",
            "castilla y león": "Castilla y León", "castilla-la mancha": "Castilla-La Mancha",
            "canarias": "Canarias", "aragón": "Aragón", "murcia": "Murcia",
            "extremadura": "Extremadura", "baleares": "Islas Baleares",
            "asturias": "Asturias", "navarra": "Navarra", "cantabria": "Cantabria",
            "la rioja": "La Rioja"
        }
        for key, nombre in comunidades.items():
            if key in text_lower:
                return f"Tribunal Superior de Justicia de {nombre}", TipoTribunal.TSJ
        return "Tribunal Superior de Justicia", TipoTribunal.TSJ

    elif "audiencia provincial" in text_lower:
        # Detectar provincia
        match = re.search(r'audiencia provincial de\s+([a-záéíóúñ]+)', text_lower)
        if match:
            provincia = match.group(1).title()
            return f"Audiencia Provincial de {provincia}", TipoTribunal.AUDIENCIA_PROVINCIAL
        return "Audiencia Provincial", TipoTribunal.AUDIENCIA_PROVINCIAL

    elif "juzgado de lo mercantil" in text_lower:
        return "Juzgado de lo Mercantil", TipoTribunal.JUZGADO_MERCANTIL

    elif "juzgado de lo social" in text_lower:
        return "Juzgado de lo Social", TipoTribunal.JUZGADO_SOCIAL

    return "Tribunal desconocido", TipoTribunal.OTRO


def extract_fecha(text: str) -> date | None:
    """Extrae la fecha de la sentencia."""
    # Patrones comunes
    patterns = [
        # "15 de marzo de 2024"
        r'(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})',
        # "15/03/2024" o "15-03-2024"
        r'(\d{1,2})[/-](\d{1,2})[/-](\d{4})',
    ]

    meses = {
        'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4,
        'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
        'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
    }

    # Buscar formato con nombre de mes
    match = re.search(patterns[0], text.lower())
    if match:
        dia = int(match.group(1))
        mes = meses[match.group(2)]
        año = int(match.group(3))
        try:
            return date(año, mes, dia)
        except ValueError:
            pass

    # Buscar formato numérico
    match = re.search(patterns[1], text)
    if match:
        dia = int(match.group(1))
        mes = int(match.group(2))
        año = int(match.group(3))
        try:
            return date(año, mes, dia)
        except ValueError:
            pass

    return None


def extract_jurisdiccion(text: str, tribunal: str) -> Jurisdiccion:
    """Extrae la jurisdicción."""
    text_lower = text.lower()
    tribunal_lower = tribunal.lower()

    if "civil" in tribunal_lower or "civil" in text_lower[:500]:
        return Jurisdiccion.CIVIL
    elif "penal" in tribunal_lower or "penal" in text_lower[:500]:
        return Jurisdiccion.PENAL
    elif "social" in tribunal_lower or "social" in text_lower[:500] or "laboral" in text_lower[:500]:
        return Jurisdiccion.SOCIAL
    elif "contencioso" in tribunal_lower or "contencioso" in text_lower[:500]:
        return Jurisdiccion.CONTENCIOSO
    elif "mercantil" in tribunal_lower or "mercantil" in text_lower[:500]:
        return Jurisdiccion.MERCANTIL

    return Jurisdiccion.CIVIL  # Default


def extract_ponente(text: str) -> str | None:
    """Extrae el nombre del ponente."""
    patterns = [
        r'[Pp]onente[:\s]+(?:Excm[oa]\.?\s*)?(?:Sr[a]?\.?\s*)?(?:D[ña]?\.?\s*)?([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,4})',
        r'[Pp]onente[:\s]+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑA-Za-záéíóúñ\s\.]+?)(?:\n|$)',
    ]

    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            ponente = match.group(1).strip()
            # Limpiar
            ponente = re.sub(r'\s+', ' ', ponente)
            if len(ponente) > 5 and len(ponente) < 100:
                return ponente

    return None


def extract_fundamentos(text: str) -> str:
    """Extrae los fundamentos de derecho."""
    # Buscar sección de fundamentos
    patterns = [
        r'FUNDAMENTOS\s+DE\s+DERECHO(.+?)(?:FALLO|FALLAMOS|PARTE\s+DISPOSITIVA)',
        r'FUNDAMENTOS\s+JURÍDICOS(.+?)(?:FALLO|FALLAMOS|PARTE\s+DISPOSITIVA)',
        r'RAZONAMIENTOS\s+JURÍDICOS(.+?)(?:FALLO|FALLAMOS|PARTE\s+DISPOSITIVA)',
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
        if match:
            return match.group(1).strip()

    # Si no encuentra, devolver todo el texto
    return text


def extract_fallo(text: str) -> str | None:
    """Extrae el fallo."""
    patterns = [
        r'(?:FALLO|FALLAMOS)(.+?)(?:$|Así\s+por\s+esta)',
        r'PARTE\s+DISPOSITIVA(.+?)(?:$|Así\s+por\s+esta)',
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
        if match:
            fallo = match.group(1).strip()
            if len(fallo) > 20:
                return fallo[:2000]  # Limitar longitud

    return None


def parse_sentencia(texto: str) -> dict:
    """Parsea el texto completo de una sentencia y extrae metadatos."""
    tribunal, tipo_tribunal = extract_tribunal(texto)

    return {
        "ecli": extract_ecli(texto),
        "roj": extract_roj(texto),
        "tribunal": tribunal,
        "tipo_tribunal": tipo_tribunal,
        "fecha_resolucion": extract_fecha(texto),
        "jurisdiccion": extract_jurisdiccion(texto, tribunal),
        "ponente": extract_ponente(texto),
        "fundamentos_derecho": extract_fundamentos(texto),
        "fallo": extract_fallo(texto),
        "texto_completo": texto,
    }


async def save_sentencia(data: dict) -> Jurisprudencia | None:
    """Guarda la sentencia en la base de datos."""
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        # Verificar duplicados
        if data["ecli"]:
            result = await db.execute(
                select(Jurisprudencia).where(Jurisprudencia.ecli == data["ecli"])
            )
            if result.scalar_one_or_none():
                print(f"⚠️  Ya existe una sentencia con ECLI {data['ecli']}")
                return None

        if data["roj"]:
            result = await db.execute(
                select(Jurisprudencia).where(Jurisprudencia.roj == data["roj"])
            )
            if result.scalar_one_or_none():
                print(f"⚠️  Ya existe una sentencia con ROJ {data['roj']}")
                return None

        # Crear sentencia
        sentencia = Jurisprudencia(
            ecli=data["ecli"],
            roj=data["roj"],
            tribunal=data["tribunal"],
            tipo_tribunal=data["tipo_tribunal"],
            fecha_resolucion=data["fecha_resolucion"] or date.today(),
            jurisdiccion=data["jurisdiccion"],
            ponente=data["ponente"],
            fundamentos_derecho=data["fundamentos_derecho"],
            fallo=data["fallo"],
            texto_completo=data["texto_completo"],
            fuente="manual_import",
            indexada=False
        )

        db.add(sentencia)
        await db.commit()
        await db.refresh(sentencia)

        return sentencia


def print_extracted_data(data: dict):
    """Muestra los datos extraídos para confirmación."""
    print("\n" + "="*60)
    print("DATOS EXTRAÍDOS:")
    print("="*60)
    print(f"ECLI:         {data['ecli'] or '(no encontrado)'}")
    print(f"ROJ:          {data['roj'] or '(no encontrado)'}")
    print(f"Tribunal:     {data['tribunal']}")
    print(f"Tipo:         {data['tipo_tribunal'].value}")
    print(f"Fecha:        {data['fecha_resolucion'] or '(no encontrada)'}")
    print(f"Jurisdicción: {data['jurisdiccion'].value}")
    print(f"Ponente:      {data['ponente'] or '(no encontrado)'}")
    print(f"Fundamentos:  {len(data['fundamentos_derecho'])} caracteres")
    print(f"Fallo:        {'Sí' if data['fallo'] else 'No'} extraído")
    print(f"Texto total:  {len(data['texto_completo'])} caracteres")
    print("="*60)


async def interactive_import():
    """Proceso interactivo de importación."""
    print("\n" + "="*60)
    print("IMPORTADOR DE SENTENCIAS REALES")
    print("="*60)
    print("\nInstrucciones:")
    print("1. Ve a CENDOJ (https://www.poderjudicial.es/search/indexAN.jsp)")
    print("2. Busca y abre una sentencia")
    print("3. Selecciona y copia TODO el texto (Ctrl+A, Ctrl+C)")
    print("4. Pega aquí el texto completo")
    print("\nPega el texto de la sentencia (termina con línea vacía + 'FIN'):")
    print("-"*60)

    lines = []
    while True:
        try:
            line = input()
            if line.strip().upper() == "FIN":
                break
            lines.append(line)
        except EOFError:
            break

    texto = "\n".join(lines)

    if len(texto) < 500:
        print("\n❌ El texto es demasiado corto. Asegúrate de copiar la sentencia completa.")
        return

    print(f"\n✓ Recibidos {len(texto)} caracteres")
    print("Analizando texto...")

    data = parse_sentencia(texto)
    print_extracted_data(data)

    # Permitir correcciones
    print("\n¿Los datos son correctos? (s/n): ", end="")
    response = input().strip().lower()

    if response != 's':
        print("\nPuedes corregir los datos manualmente:")

        # ECLI
        if not data["ecli"]:
            print("ECLI (dejar vacío si no tiene): ", end="")
            ecli = input().strip()
            if ecli:
                data["ecli"] = ecli

        # ROJ
        if not data["roj"]:
            print("ROJ (ej: STS 1234/2024): ", end="")
            roj = input().strip()
            if roj:
                data["roj"] = roj

        # Fecha
        if not data["fecha_resolucion"]:
            print("Fecha (DD/MM/YYYY): ", end="")
            fecha_str = input().strip()
            if fecha_str:
                try:
                    parts = fecha_str.split("/")
                    data["fecha_resolucion"] = date(int(parts[2]), int(parts[1]), int(parts[0]))
                except:
                    print("Formato de fecha inválido, usando fecha actual")
                    data["fecha_resolucion"] = date.today()

        # Jurisdicción
        print(f"Jurisdicción actual: {data['jurisdiccion'].value}")
        print("Cambiar? (civil/penal/social/contencioso_administrativo/mercantil) o Enter para mantener: ", end="")
        jur = input().strip().lower()
        if jur:
            try:
                data["jurisdiccion"] = Jurisdiccion(jur)
            except:
                pass

    # Guardar
    print("\n¿Guardar sentencia? (s/n): ", end="")
    if input().strip().lower() == 's':
        sentencia = await save_sentencia(data)
        if sentencia:
            print(f"\n✅ Sentencia guardada con ID: {sentencia.id}")
            print(f"   ECLI: {sentencia.ecli}")
            print(f"   ROJ: {sentencia.roj}")
        else:
            print("\n❌ No se pudo guardar la sentencia")
    else:
        print("\nCancelado.")


async def main():
    while True:
        await interactive_import()

        print("\n¿Importar otra sentencia? (s/n): ", end="")
        if input().strip().lower() != 's':
            break

    print("\n¡Hasta luego!")


if __name__ == "__main__":
    asyncio.run(main())
