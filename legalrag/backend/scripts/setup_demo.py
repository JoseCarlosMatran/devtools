#!/usr/bin/env python3
"""
Script todo-en-uno para configurar la demo de LegalRAG.
Crea un usuario de prueba y carga las 3 sentencias del Tribunal Supremo.

Uso:
    cd legalrag/backend
    python scripts/setup_demo.py
"""
import asyncio
import sys
from datetime import datetime, date
from pathlib import Path

# Añadir el directorio backend al path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.core.database import engine
from app.core.security import get_password_hash
from app.models.user import User
from app.models.jurisprudencia import Jurisprudencia, Jurisdiccion, TipoTribunal

# ============================================================
# DATOS DE LAS 3 SENTENCIAS REALES DEL TRIBUNAL SUPREMO
# ============================================================

SENTENCIAS = [
    {
        "ecli": "ECLI:ES:TS:2025:5481",
        "roj": "STS 5481/2025",
        "tribunal": "Tribunal Supremo. Sala de lo Civil. Pleno",
        "tipo_tribunal": TipoTribunal.TRIBUNAL_SUPREMO,
        "sede": "Madrid",
        "seccion": "991 (Pleno)",
        "tipo_resolucion": "Sentencia",
        "numero_resolucion": "1796/2025",
        "fecha_resolucion": date(2025, 12, 5),
        "ponente": "Pedro José Vela Torres",
        "jurisdiccion": Jurisdiccion.CIVIL,
        "materia": "Cláusulas abusivas - Gastos hipotecarios - Protección consumidores",
        "voces": "cláusulas abusivas; gastos hipotecarios; préstamo hipotecario; consumidores; Directiva 93/13/CEE; costas procesales; subrogación; novación",
        "cabecera": "Sentencia del Pleno sobre cláusulas de gastos en préstamos hipotecarios y costas en procesos con consumidores. Modifica jurisprudencia sobre costas en segunda instancia.",
        "fundamentos_derecho": """PRIMERO.- Resumen de antecedentes
1.- D. Felicisimo formuló una demanda frente a Caja Laboral Popular Sociedad Cooperativa de Crédito, en la que solicitaba que se declarase nula la cláusula novena de la escritura de 5 de septiembre de 2017, sobre extinción de condominio, subrogación y novación de préstamo, en cuanto imputa al prestatario los gastos de formalización del préstamo.

2.- En la escritura se novaron las estipulaciones del préstamo relativas a intereses moratorios y vencimiento anticipado, imponiéndose en la cláusula novena todos los gastos de la operación al demandante.

3.- La sentencia de primera instancia estimó la nulidad de la cláusula de gastos y condenó a pagar a la entidad demandada el 50% de las cantidades reclamadas.

4.- La Audiencia Provincial estimó el recurso de apelación de la entidad bancaria, entendiendo que debió ser acogida la excepción de falta de legitimación pasiva.

SEGUNDO.- Procedencia del examen previo del recurso de casación sobre el extraordinario por infracción procesal
Esta Sala ha admitido la posibilidad de alterar el orden legal en el que deberían resolverse los recursos.

TERCERO.- Recurso de casación. Motivo único
El recurso de casación debe ser estimado. La estipulación que debe estimarse abusiva es la que imputa de forma genérica al prestatario los gastos vinculados a la novación.

CUARTO.- Problemática de las costas en los procesos con consumidores
1.- La jurisprudencia del TJUE sobre las costas: El consumidor debe quedar indemne económicamente en procedimientos donde se haya visto obligado a litigar por cláusulas abusivas (SSTJUE de 13/09/2018, 16/07/2020, 07/04/2022).

2.- La sentencia del Tribunal Constitucional 121/2025, de 26 de mayo, estimó un recurso de amparo.

3.- Adaptación de la jurisprudencia: Cuando el consumidor se vea obligado a acudir a la segunda instancia para no verse vinculado por una cláusula abusiva y su recurso resulte estimado, las costas de esa segunda instancia deberán imponerse al profesional predisponente.""",
        "fallo": """1.º- Estimar el recurso de casación interpuesto por D. Felicisimo, contra la sentencia 1697/2021 de 12 de noviembre, dictada por la Sección 4ª de la Audiencia Provincial de Vizcaya, que casamos y anulamos.

2.º- Estimar en parte el recurso de apelación interpuesto por Caja Laboral Popular Sociedad Cooperativa de Crédito, declarando la nulidad por abusiva de la cláusula novena (gastos) incluida en la escritura de 5 de septiembre de 2017.

3.º- No hacer expresa imposición de las costas causadas por los recursos de casación e infracción procesal.

4.º- Imponer a Caja Laboral Popular Sociedad Cooperativa de Crédito la mitad de las costas causadas al consumidor por el recurso de apelación y las costas de la primera instancia.""",
        "texto_completo": "STS 5481/2025 - Sentencia del Tribunal Supremo sobre cláusulas abusivas en gastos hipotecarios. El Pleno de la Sala Civil establece nueva doctrina sobre imposición de costas en segunda instancia cuando el consumidor recurre contra cláusulas abusivas.",
        "fuente": "cendoj_manual"
    },
    {
        "ecli": "ECLI:ES:TS:2025:5442",
        "roj": "STS 5442/2025",
        "tribunal": "Tribunal Supremo. Sala de lo Civil",
        "tipo_tribunal": TipoTribunal.TRIBUNAL_SUPREMO,
        "sede": "Madrid",
        "seccion": "1",
        "tipo_resolucion": "Sentencia",
        "numero_resolucion": "1794/2025",
        "fecha_resolucion": date(2025, 12, 4),
        "ponente": "Pedro José Vela Torres",
        "jurisdiccion": Jurisdiccion.CIVIL,
        "materia": "Cláusulas abusivas - Gastos hipotecarios - Prescripción acción restitutoria",
        "voces": "cláusulas abusivas; gastos hipotecarios; prescripción; acción restitutoria; consumidores; Directiva 93/13/CEE; dies a quo",
        "cabecera": "Prescripción de la acción de restitución de gastos hipotecarios. El dies a quo es la firmeza de la sentencia que declara la nulidad, salvo prueba de conocimiento anterior por el consumidor.",
        "fundamentos_derecho": """PRIMERO.- Resumen de antecedentes
1.- El 26 de noviembre de 1999, D. Jesús Luis y D.ª Aurelia concertaron un préstamo hipotecario con cláusula que atribuía a los prestatarios el pago de todos los gastos generados por el contrato.

2.- En julio de 2019, los prestatarios presentaron demanda solicitando la nulidad de la cláusula y la restitución de las cantidades indebidamente abonadas.

3.- La sentencia de primera instancia estimó la demanda, declarando la nulidad de la cláusula y acordando la restitución de 223,32 euros.

4.- La Audiencia Provincial estimó el recurso de apelación del banco, declarando prescrita la acción de reclamación.

SEGUNDO.- Recurso de casación
La sentencia recurrida considera que la acción de restitución ha prescrito, iniciándose el plazo en la fecha del pago. Esto se opone a la jurisprudencia de esta Sala (Sentencia de Pleno 857/2024, de 14 de junio) que establece:

«Salvo en aquellos casos en que la entidad prestamista pruebe que, en el marco de sus relaciones contractuales, ese concreto consumidor pudo conocer en una fecha anterior que esa estipulación (cláusula de gastos) era abusiva, el día inicial del plazo de prescripción de la acción de restitución de gastos hipotecarios indebidamente pagados por un consumidor será el de la firmeza de la sentencia que declara la nulidad de la cláusula que obligaba a tales pagos».

La STJUE de 13 de marzo de 2025 (C-230/24) ha declarado que la jurisprudencia nacional que distingue entre el carácter imprescriptible de la acción de nulidad y el carácter prescriptible de la acción de restitución no se opone a los arts. 6.1 y 7.1 de la Directiva 93/13/CEE.""",
        "fallo": """1.º- Estimar el recurso de casación interpuesto por D. Jesús Luis y D.ª Aurelia, contra la sentencia n.º 151/2022, de 16 de febrero, dictada por la Sección 5.ª de la Audiencia Provincial de Palma de Mallorca, que casamos y dejamos sin efecto.

2.º- Desestimar totalmente el recurso de apelación interpuesto contra la sentencia de primera instancia, manteniendo todos sus pronunciamientos.

3.º- No hacer expresa imposición de las costas causadas por el recurso de casación.

4.º- Se imponen a CaixaBank S.A. las costas causadas por el recurso de apelación.""",
        "texto_completo": "STS 5442/2025 - Sentencia del Tribunal Supremo sobre prescripción de la acción de restitución de gastos hipotecarios. Aplicación de la doctrina del Pleno 857/2024 sobre el dies a quo del plazo de prescripción.",
        "fuente": "cendoj_manual"
    },
    {
        "ecli": "ECLI:ES:TS:2025:11153A",
        "roj": "ATS 11153/2025",
        "tribunal": "Tribunal Supremo. Sala de lo Civil",
        "tipo_tribunal": TipoTribunal.TRIBUNAL_SUPREMO,
        "sede": "Madrid",
        "seccion": "1",
        "tipo_resolucion": "Auto",
        "numero_resolucion": "254/2025",
        "fecha_resolucion": date(2025, 12, 4),
        "ponente": "Pedro José Vela Torres",
        "jurisdiccion": Jurisdiccion.CIVIL,
        "materia": "Cláusulas abusivas - Gastos hipotecarios - Allanamiento en casación",
        "voces": "allanamiento; recurso de casación; cláusulas abusivas; gastos hipotecarios; prescripción; art. 487.1 LEC; devolución actuaciones",
        "cabecera": "Allanamiento en casación. Estimación del recurso por auto al existir doctrina jurisprudencial (STS Pleno 857/2024). Devolución de actuaciones a la Audiencia Provincial.",
        "fundamentos_derecho": """PRIMERO.- La sentencia de la Audiencia Provincial debe ser casada porque es contraria a la jurisprudencia de esta Sala

1.- La posibilidad del allanamiento se extiende también al recurso de casación, por colegirse así del art. 19.3 LEC. La STS 571/2018, de 15 de octubre, sienta este criterio.

2.- Al no apreciarse fraude de ley ni renuncia contra el interés general o perjuicio de tercero, debe estimarse el recurso de casación, oponiéndose la sentencia recurrida a la Sentencia de Pleno 857/2024, de 14 de junio.

3.- El art. 487.1 LEC (redacción RDL 5/2023) establece que cuando la resolución impugnada se oponga a doctrina jurisprudencial existente, el recurso podrá decidirse mediante auto que, casando la resolución recurrida, devolverá el asunto al tribunal de procedencia.

4.- Procede devolver el asunto a la Audiencia Provincial para que dicte nueva resolución conforme a la doctrina jurisprudencial.""",
        "fallo": """1.º- Estimar el recurso de casación interpuesto por D.ª Bárbara y D. Samuel, contra la sentencia n.º 1125/2021, de 20 de diciembre, dictada por la Sección 5.ª de la Audiencia Provincial de Palma de Mallorca.

2.º- Casar la expresada sentencia y devolver las actuaciones a la Audiencia Provincial para que resuelva el recurso de apelación de acuerdo con la doctrina jurisprudencial.

3.º- No hacer expresa imposición de las costas de casación y ordenar la devolución del depósito constituido.""",
        "texto_completo": "ATS 11153/2025 - Auto del Tribunal Supremo estimando recurso de casación por allanamiento. Aplicación del art. 487.1 LEC cuando existe doctrina jurisprudencial (STS Pleno 857/2024).",
        "fuente": "cendoj_manual"
    }
]

# ============================================================
# USUARIO DE PRUEBA
# ============================================================

DEMO_USER = {
    "email": "demo@legalrag.es",
    "password": "demo1234",
    "full_name": "Usuario Demo",
    "is_active": True,
    "is_superuser": False
}


async def setup_demo():
    """Configura la demo: usuario + sentencias."""
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    print("=" * 60)
    print("CONFIGURACIÓN DE DEMO - LegalRAG")
    print("=" * 60)

    async with async_session() as db:
        # 1. Crear usuario demo
        print("\n1. CREANDO USUARIO DEMO...")
        result = await db.execute(
            select(User).where(User.email == DEMO_USER["email"])
        )
        existing_user = result.scalar_one_or_none()

        if existing_user:
            print(f"   Usuario ya existe: {DEMO_USER['email']}")
        else:
            user = User(
                email=DEMO_USER["email"],
                hashed_password=get_password_hash(DEMO_USER["password"]),
                full_name=DEMO_USER["full_name"],
                is_active=DEMO_USER["is_active"],
                is_superuser=DEMO_USER["is_superuser"]
            )
            db.add(user)
            await db.commit()
            print(f"   Usuario creado: {DEMO_USER['email']}")

        print(f"\n   Credenciales de acceso:")
        print(f"   - Email: {DEMO_USER['email']}")
        print(f"   - Password: {DEMO_USER['password']}")

        # 2. Cargar sentencias
        print("\n2. CARGANDO SENTENCIAS DEL TRIBUNAL SUPREMO...")

        loaded = 0
        skipped = 0

        for data in SENTENCIAS:
            # Verificar si ya existe
            result = await db.execute(
                select(Jurisprudencia).where(Jurisprudencia.roj == data["roj"])
            )
            if result.scalar_one_or_none():
                print(f"   Ya existe: {data['roj']}")
                skipped += 1
                continue

            # Crear sentencia
            sentencia = Jurisprudencia(
                ecli=data["ecli"],
                roj=data["roj"],
                tribunal=data["tribunal"],
                tipo_tribunal=data["tipo_tribunal"],
                sede=data["sede"],
                seccion=data["seccion"],
                tipo_resolucion=data["tipo_resolucion"],
                numero_resolucion=data["numero_resolucion"],
                fecha_resolucion=data["fecha_resolucion"],
                ponente=data["ponente"],
                jurisdiccion=data["jurisdiccion"],
                materia=data["materia"],
                voces=data["voces"],
                cabecera=data["cabecera"],
                fundamentos_derecho=data["fundamentos_derecho"],
                fallo=data["fallo"],
                texto_completo=data["texto_completo"],
                fuente=data["fuente"],
                indexada=False
            )
            db.add(sentencia)
            loaded += 1
            print(f"   Cargada: {data['roj']} - {data['materia'][:40]}...")

        await db.commit()

        print("\n" + "=" * 60)
        print("RESUMEN")
        print("=" * 60)
        print(f"Sentencias cargadas: {loaded}")
        print(f"Sentencias omitidas (duplicados): {skipped}")
        print(f"\nTotal en base de datos: {loaded + skipped}")

        print("\n" + "=" * 60)
        print("PRÓXIMOS PASOS")
        print("=" * 60)
        print("1. Reinicia el backend para que se indexen las sentencias")
        print("2. Accede a http://localhost:3000")
        print(f"3. Login con: {DEMO_USER['email']} / {DEMO_USER['password']}")
        print("4. Prueba buscar: 'cláusulas abusivas gastos hipotecarios'")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(setup_demo())
