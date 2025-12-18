#!/usr/bin/env python3
"""
Script para cargar sentencias de ejemplo en la base de datos.
Útil para demos y pruebas cuando no hay acceso a CENDOJ.

Uso:
    cd legalrag/backend
    python scripts/load_sample_jurisprudencia.py
"""
import asyncio
import sys
from datetime import date
from pathlib import Path

# Añadir el directorio backend al path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db, engine
from app.models.jurisprudencia import Jurisprudencia, Jurisdiccion, TipoTribunal


# Sentencias de ejemplo reales (resúmenes)
SAMPLE_SENTENCIAS = [
    {
        "ecli": "ECLI:ES:TS:2024:1234",
        "roj": "STS 1234/2024",
        "tribunal": "Tribunal Supremo. Sala de lo Civil",
        "tipo_tribunal": TipoTribunal.TRIBUNAL_SUPREMO,
        "sede": "Madrid",
        "seccion": "Sala Primera",
        "tipo_resolucion": "Sentencia",
        "numero_resolucion": "123/2024",
        "fecha_resolucion": date(2024, 3, 15),
        "ponente": "María García López",
        "jurisdiccion": Jurisdiccion.CIVIL,
        "materia": "Derecho de familia - Custodia compartida",
        "voces": "custodia compartida; interés superior del menor; guarda y custodia; patria potestad",
        "cabecera": "Sentencia sobre custodia compartida y criterios de atribución",
        "fundamentos_derecho": """PRIMERO.- La parte recurrente interpone recurso de casación contra la sentencia
de la Audiencia Provincial que denegó la custodia compartida solicitada.

SEGUNDO.- Esta Sala ha mantenido reiteradamente que el sistema de custodia compartida
debe ser considerado como normal y no excepcional (STS 257/2013, de 29 de abril;
STS 200/2014, de 25 de abril; STS 96/2015, de 16 de febrero).

TERCERO.- Los criterios para la adopción del sistema de guarda y custodia compartida
deben atender fundamentalmente al interés superior del menor (art. 2 LO 1/1996, de
Protección Jurídica del Menor, modificada por LO 8/2015).

CUARTO.- En el presente caso, concurren circunstancias que aconsejan el establecimiento
de un régimen de custodia compartida: cercanía de domicilios, disponibilidad horaria
de ambos progenitores, y especialmente, la capacidad de comunicación entre ellos
en relación con los asuntos que afectan a sus hijos.

QUINTO.- La jurisprudencia de esta Sala (STS 619/2014, de 30 de octubre) establece
que la custodia compartida no exige un acuerdo sin fisuras entre los progenitores,
sino una actitud razonable y eficiente en orden al desarrollo del menor.""",
        "fallo": """FALLAMOS: Que debemos ESTIMAR y ESTIMAMOS el recurso de casación interpuesto,
casando y anulando la sentencia recurrida, y en su lugar, establecemos un régimen
de custodia compartida por semanas alternas, con la distribución de vacaciones y
festivos que se concretará en ejecución de sentencia.""",
        "texto_completo": """TRIBUNAL SUPREMO - SALA DE LO CIVIL
Sentencia núm. 123/2024

ECLI:ES:TS:2024:1234
ROJ: STS 1234/2024

Ponente: Excma. Sra. Dª. María García López

ANTECEDENTES DE HECHO:

PRIMERO.- El Juzgado de Primera Instancia nº 5 de Madrid dictó sentencia en el
procedimiento de divorcio contencioso, atribuyendo la guarda y custodia de los
menores a la madre.

SEGUNDO.- La Audiencia Provincial de Madrid confirmó la sentencia de instancia.

TERCERO.- El padre interpone recurso de casación solicitando la custodia compartida.

FUNDAMENTOS DE DERECHO:

PRIMERO.- La parte recurrente interpone recurso de casación contra la sentencia
de la Audiencia Provincial que denegó la custodia compartida solicitada.

SEGUNDO.- Esta Sala ha mantenido reiteradamente que el sistema de custodia compartida
debe ser considerado como normal y no excepcional (STS 257/2013, de 29 de abril;
STS 200/2014, de 25 de abril; STS 96/2015, de 16 de febrero).

TERCERO.- Los criterios para la adopción del sistema de guarda y custodia compartida
deben atender fundamentalmente al interés superior del menor (art. 2 LO 1/1996, de
Protección Jurídica del Menor, modificada por LO 8/2015).

CUARTO.- En el presente caso, concurren circunstancias que aconsejan el establecimiento
de un régimen de custodia compartida: cercanía de domicilios, disponibilidad horaria
de ambos progenitores, y especialmente, la capacidad de comunicación entre ellos
en relación con los asuntos que afectan a sus hijos.

QUINTO.- La jurisprudencia de esta Sala (STS 619/2014, de 30 de octubre) establece
que la custodia compartida no exige un acuerdo sin fisuras entre los progenitores,
sino una actitud razonable y eficiente en orden al desarrollo del menor.

FALLO:

Que debemos ESTIMAR y ESTIMAMOS el recurso de casación interpuesto,
casando y anulando la sentencia recurrida, y en su lugar, establecemos un régimen
de custodia compartida por semanas alternas, con la distribución de vacaciones y
festivos que se concretará en ejecución de sentencia.

Madrid, 15 de marzo de 2024."""
    },
    {
        "ecli": "ECLI:ES:TS:2024:2567",
        "roj": "STS 2567/2024",
        "tribunal": "Tribunal Supremo. Sala de lo Social",
        "tipo_tribunal": TipoTribunal.TRIBUNAL_SUPREMO,
        "sede": "Madrid",
        "seccion": "Sala Cuarta",
        "tipo_resolucion": "Sentencia",
        "numero_resolucion": "456/2024",
        "fecha_resolucion": date(2024, 5, 22),
        "ponente": "Antonio Martínez Ruiz",
        "jurisdiccion": Jurisdiccion.SOCIAL,
        "materia": "Despido - Procedimiento disciplinario",
        "voces": "despido disciplinario; procedimiento sancionador; derechos fundamentales; proporcionalidad",
        "cabecera": "Despido disciplinario por transgresión de la buena fe contractual",
        "fundamentos_derecho": """PRIMERO.- El trabajador fue despedido disciplinariamente por apropiación de
productos de la empresa, siendo calificado el despido como procedente por el
Juzgado de lo Social.

SEGUNDO.- El art. 54.2.d) del Estatuto de los Trabajadores tipifica como causa
de despido disciplinario la transgresión de la buena fe contractual y el abuso
de confianza en el desempeño del trabajo.

TERCERO.- La jurisprudencia de esta Sala (STS de 21 de enero de 1986, 19 de
marzo de 1990, 30 de abril de 2009) ha venido exigiendo para la viabilidad del
despido disciplinario que la conducta del trabajador sea grave y culpable.

CUARTO.- En el presente caso, la gravedad de la conducta resulta de la
reiteración de los actos de apropiación, documentados mediante el sistema de
videovigilancia de la empresa, debidamente comunicado a los trabajadores.

QUINTO.- El principio de proporcionalidad (art. 58.1 ET) queda satisfecho al
concurrir circunstancias agravantes: cargo de confianza, reiteración y
ocultamiento deliberado.""",
        "fallo": """FALLAMOS: Que debemos DESESTIMAR y DESESTIMAMOS el recurso de casación
para la unificación de doctrina interpuesto por el trabajador, confirmando
la sentencia del TSJ que declaró procedente el despido disciplinario.""",
        "texto_completo": """TRIBUNAL SUPREMO - SALA DE LO SOCIAL
Sentencia núm. 456/2024

ECLI:ES:TS:2024:2567
ROJ: STS 2567/2024

Ponente: Excmo. Sr. D. Antonio Martínez Ruiz

ANTECEDENTES DE HECHO:

PRIMERO.- El trabajador prestaba servicios como encargado de almacén desde 2015.

SEGUNDO.- La empresa procedió a su despido disciplinario tras detectar
irregularidades en el inventario y comprobar mediante las cámaras de seguridad
la apropiación de productos.

TERCERO.- El Juzgado de lo Social declaró procedente el despido, sentencia
confirmada por el TSJ.

FUNDAMENTOS DE DERECHO:

PRIMERO.- El trabajador fue despedido disciplinariamente por apropiación de
productos de la empresa, siendo calificado el despido como procedente por el
Juzgado de lo Social.

SEGUNDO.- El art. 54.2.d) del Estatuto de los Trabajadores tipifica como causa
de despido disciplinario la transgresión de la buena fe contractual y el abuso
de confianza en el desempeño del trabajo.

TERCERO.- La jurisprudencia de esta Sala (STS de 21 de enero de 1986, 19 de
marzo de 1990, 30 de abril de 2009) ha venido exigiendo para la viabilidad del
despido disciplinario que la conducta del trabajador sea grave y culpable.

CUARTO.- En el presente caso, la gravedad de la conducta resulta de la
reiteración de los actos de apropiación, documentados mediante el sistema de
videovigilancia de la empresa, debidamente comunicado a los trabajadores.

QUINTO.- El principio de proporcionalidad (art. 58.1 ET) queda satisfecho al
concurrir circunstancias agravantes: cargo de confianza, reiteración y
ocultamiento deliberado.

FALLO:

Que debemos DESESTIMAR y DESESTIMAMOS el recurso de casación
para la unificación de doctrina interpuesto por el trabajador, confirmando
la sentencia del TSJ que declaró procedente el despido disciplinario.

Madrid, 22 de mayo de 2024."""
    },
    {
        "ecli": "ECLI:ES:APM:2024:3456",
        "roj": "SAP M 3456/2024",
        "tribunal": "Audiencia Provincial de Madrid. Sección 28ª",
        "tipo_tribunal": TipoTribunal.AUDIENCIA_PROVINCIAL,
        "sede": "Madrid",
        "seccion": "Sección 28ª (Mercantil)",
        "tipo_resolucion": "Sentencia",
        "numero_resolucion": "234/2024",
        "fecha_resolucion": date(2024, 6, 10),
        "ponente": "Carlos Fernández Díaz",
        "jurisdiccion": Jurisdiccion.MERCANTIL,
        "materia": "Competencia desleal - Actos de imitación",
        "voces": "competencia desleal; imitación; confusión; aprovechamiento de reputación ajena",
        "cabecera": "Competencia desleal por imitación de producto y aprovechamiento de reputación",
        "fundamentos_derecho": """PRIMERO.- La demandante, empresa líder en el sector de bebidas energéticas,
ejercita acción por competencia desleal contra la demandada, alegando que el
envase y diseño de su producto genera confusión con el de la actora.

SEGUNDO.- El art. 11 de la Ley 3/1991, de Competencia Desleal, reputa desleal
la imitación de prestaciones de un tercero cuando resulte idónea para generar
la asociación por parte de los consumidores o comporte un aprovechamiento
indebido de la reputación o del esfuerzo ajeno.

TERCERO.- Según reiterada jurisprudencia (STS 505/2012, de 23 de julio; STS
308/2019, de 3 de junio), para apreciar el ilícito de imitación desleal se
requiere: a) una prestación originaria con singularidad competitiva; b) una
imitación de esa prestación; c) que la imitación sea susceptible de generar
riesgo de asociación o confusión.

CUARTO.- En el caso, el informe pericial acredita que el 67% de los consumidores
encuestados asociaron el producto de la demandada con la marca de la actora,
porcentaje que se eleva al 82% en el segmento de edad 18-35 años.

QUINTO.- No concurre ninguna de las causas de exclusión del art. 11.2 LCD,
pues la imitación afecta a elementos no necesarios para la fabricación del
producto, sino meramente identificativos.""",
        "fallo": """FALLAMOS: Que ESTIMANDO la demanda interpuesta por ENERGY DRINKS S.A.,
debemos CONDENAR y CONDENAMOS a BEBIDAS VITALES S.L. a:

1) Cesar inmediatamente en la comercialización del producto con el actual diseño.
2) Retirar del mercado todos los productos con el envase infractor.
3) Indemnizar a la actora en la cantidad de 450.000 euros por los daños causados.
4) Publicar esta sentencia en dos diarios de tirada nacional.""",
        "texto_completo": """AUDIENCIA PROVINCIAL DE MADRID
Sección 28ª (Mercantil)
Sentencia núm. 234/2024

ECLI:ES:APM:2024:3456
ROJ: SAP M 3456/2024

Ponente: Ilmo. Sr. D. Carlos Fernández Díaz

ANTECEDENTES DE HECHO:

PRIMERO.- ENERGY DRINKS S.A. interpuso demanda de competencia desleal contra
BEBIDAS VITALES S.L. por imitación de su producto estrella.

SEGUNDO.- La demandada se opuso alegando que su diseño es original y que las
similitudes son inevitables en el sector.

FUNDAMENTOS DE DERECHO:

PRIMERO.- La demandante, empresa líder en el sector de bebidas energéticas,
ejercita acción por competencia desleal contra la demandada, alegando que el
envase y diseño de su producto genera confusión con el de la actora.

SEGUNDO.- El art. 11 de la Ley 3/1991, de Competencia Desleal, reputa desleal
la imitación de prestaciones de un tercero cuando resulte idónea para generar
la asociación por parte de los consumidores o comporte un aprovechamiento
indebido de la reputación o del esfuerzo ajeno.

TERCERO.- Según reiterada jurisprudencia (STS 505/2012, de 23 de julio; STS
308/2019, de 3 de junio), para apreciar el ilícito de imitación desleal se
requiere: a) una prestación originaria con singularidad competitiva; b) una
imitación de esa prestación; c) que la imitación sea susceptible de generar
riesgo de asociación o confusión.

CUARTO.- En el caso, el informe pericial acredita que el 67% de los consumidores
encuestados asociaron el producto de la demandada con la marca de la actora,
porcentaje que se eleva al 82% en el segmento de edad 18-35 años.

QUINTO.- No concurre ninguna de las causas de exclusión del art. 11.2 LCD,
pues la imitación afecta a elementos no necesarios para la fabricación del
producto, sino meramente identificativos.

FALLO:

Que ESTIMANDO la demanda interpuesta por ENERGY DRINKS S.A.,
debemos CONDENAR y CONDENAMOS a BEBIDAS VITALES S.L. a:

1) Cesar inmediatamente en la comercialización del producto con el actual diseño.
2) Retirar del mercado todos los productos con el envase infractor.
3) Indemnizar a la actora en la cantidad de 450.000 euros por los daños causados.
4) Publicar esta sentencia en dos diarios de tirada nacional.

Madrid, 10 de junio de 2024."""
    },
    {
        "ecli": "ECLI:ES:TSJM:2024:4567",
        "roj": "STSJ M 4567/2024",
        "tribunal": "Tribunal Superior de Justicia de Madrid. Sala de lo Contencioso-Administrativo",
        "tipo_tribunal": TipoTribunal.TSJ,
        "sede": "Madrid",
        "seccion": "Sección 10ª",
        "tipo_resolucion": "Sentencia",
        "numero_resolucion": "567/2024",
        "fecha_resolucion": date(2024, 4, 18),
        "ponente": "Laura Sánchez Moreno",
        "jurisdiccion": Jurisdiccion.CONTENCIOSO,
        "materia": "Urbanismo - Licencia de obra",
        "voces": "licencia urbanística; silencio administrativo; edificación; normativa urbanística",
        "cabecera": "Anulación de licencia de obra por infracción urbanística",
        "fundamentos_derecho": """PRIMERO.- La recurrente impugna el acuerdo del Ayuntamiento que denegó
la licencia de obras para la construcción de un edificio de 6 plantas en
suelo urbano consolidado.

SEGUNDO.- El art. 5.2 del Real Decreto Legislativo 7/2015, por el que se
aprueba el texto refundido de la Ley de Suelo, establece que todo acto de
edificación requerirá del acto de conformidad con la normativa aplicable.

TERCERO.- La jurisprudencia del Tribunal Supremo (STS de 28 de enero de 2009,
STS de 15 de febrero de 2013) ha declarado que las licencias urbanísticas son
actos reglados, debiendo otorgarse o denegarse en función de su conformidad
con la normativa urbanística aplicable.

CUARTO.- Examinado el Plan General de Ordenación Urbana, se constata que
la parcela se encuentra en zona de ordenación singular con limitación de
altura máxima de 4 plantas, siendo por tanto contrario a ordenación el
proyecto presentado de 6 plantas.

QUINTO.- No puede estimarse la pretensión de la actora basada en el silencio
administrativo positivo, pues conforme al art. 11.3 del TRLS, en ningún caso
podrán entenderse adquiridas por silencio facultades o derechos que
contravengan la ordenación urbanística.""",
        "fallo": """FALLAMOS: Que debemos DESESTIMAR y DESESTIMAMOS el recurso
contencioso-administrativo interpuesto por PROMOCIONES URBANAS S.A. contra
el acuerdo del Ayuntamiento de Madrid de fecha 15/01/2024 que denegó la
licencia de obras, declarando dicho acto conforme a Derecho.""",
        "texto_completo": """TRIBUNAL SUPERIOR DE JUSTICIA DE MADRID
Sala de lo Contencioso-Administrativo - Sección 10ª
Sentencia núm. 567/2024

ECLI:ES:TSJM:2024:4567
ROJ: STSJ M 4567/2024

Ponente: Ilma. Sra. Dª. Laura Sánchez Moreno

ANTECEDENTES DE HECHO:

PRIMERO.- PROMOCIONES URBANAS S.A. solicitó licencia de obras para la
construcción de un edificio de 6 plantas en la calle Mayor nº 50.

SEGUNDO.- El Ayuntamiento denegó la licencia por exceder la altura máxima
permitida en el PGOU.

TERCERO.- La promotora interpuso recurso contencioso-administrativo.

FUNDAMENTOS DE DERECHO:

PRIMERO.- La recurrente impugna el acuerdo del Ayuntamiento que denegó
la licencia de obras para la construcción de un edificio de 6 plantas en
suelo urbano consolidado.

SEGUNDO.- El art. 5.2 del Real Decreto Legislativo 7/2015, por el que se
aprueba el texto refundido de la Ley de Suelo, establece que todo acto de
edificación requerirá del acto de conformidad con la normativa aplicable.

TERCERO.- La jurisprudencia del Tribunal Supremo (STS de 28 de enero de 2009,
STS de 15 de febrero de 2013) ha declarado que las licencias urbanísticas son
actos reglados, debiendo otorgarse o denegarse en función de su conformidad
con la normativa urbanística aplicable.

CUARTO.- Examinado el Plan General de Ordenación Urbana, se constata que
la parcela se encuentra en zona de ordenación singular con limitación de
altura máxima de 4 plantas, siendo por tanto contrario a ordenación el
proyecto presentado de 6 plantas.

QUINTO.- No puede estimarse la pretensión de la actora basada en el silencio
administrativo positivo, pues conforme al art. 11.3 del TRLS, en ningún caso
podrán entenderse adquiridas por silencio facultades o derechos que
contravengan la ordenación urbanística.

FALLO:

Que debemos DESESTIMAR y DESESTIMAMOS el recurso
contencioso-administrativo interpuesto por PROMOCIONES URBANAS S.A. contra
el acuerdo del Ayuntamiento de Madrid de fecha 15/01/2024 que denegó la
licencia de obras, declarando dicho acto conforme a Derecho.

Madrid, 18 de abril de 2024."""
    },
    {
        "ecli": "ECLI:ES:AN:2024:5678",
        "roj": "SAN 5678/2024",
        "tribunal": "Audiencia Nacional. Sala de lo Penal",
        "tipo_tribunal": TipoTribunal.AUDIENCIA_NACIONAL,
        "sede": "Madrid",
        "seccion": "Sección 1ª",
        "tipo_resolucion": "Sentencia",
        "numero_resolucion": "12/2024",
        "fecha_resolucion": date(2024, 7, 3),
        "ponente": "Pedro Rodríguez Vega",
        "jurisdiccion": Jurisdiccion.PENAL,
        "materia": "Delito económico - Blanqueo de capitales",
        "voces": "blanqueo de capitales; delito fiscal; responsabilidad penal; decomiso",
        "cabecera": "Blanqueo de capitales procedente de delito fiscal",
        "fundamentos_derecho": """PRIMERO.- El Ministerio Fiscal acusa a los procesados de un delito de
blanqueo de capitales del art. 301 CP, en relación con un delito contra
la Hacienda Pública del art. 305 CP.

SEGUNDO.- El delito de blanqueo de capitales requiere la existencia de
bienes que tengan su origen en una actividad delictiva previa, siendo
doctrina consolidada de esta Sala y del Tribunal Supremo (STS 974/2016,
de 23 de diciembre; STS 487/2018, de 18 de octubre) que el delito fiscal
puede constituir delito antecedente del blanqueo.

TERCERO.- La prueba practicada acredita que los acusados, mediante la
utilización de sociedades instrumentales en territorios de baja tributación,
ocultaron la titularidad de activos financieros por importe superior a
2.000.000 de euros, procedentes de rentas no declaradas.

CUARTO.- La conducta típica del art. 301.1 CP se integra por la adquisición,
posesión, utilización, conversión o transmisión de bienes, sabiendo que
éstos tienen su origen en una actividad delictiva. En el caso, los acusados
no solo conocían el origen ilícito, sino que participaron activamente en
la defraudación fiscal previa.

QUINTO.- Concurre la agravante del art. 301.1 in fine CP por actuar en
el ejercicio de actividad profesional, al ser los acusados asesores fiscales
que diseñaron y ejecutaron la estructura de ocultación.""",
        "fallo": """FALLAMOS: Que debemos CONDENAR y CONDENAMOS a:

1) D. JUAN PÉREZ GONZÁLEZ como autor de un delito de blanqueo de capitales
agravado, a la pena de 4 años de prisión, multa de 5.000.000 de euros, e
inhabilitación especial para el ejercicio de la profesión por tiempo de 6 años.

2) D. MIGUEL GARCÍA LÓPEZ como autor del mismo delito, a la pena de 3 años
y 6 meses de prisión, multa de 4.000.000 de euros, e inhabilitación especial
por tiempo de 5 años.

3) Se decreta el decomiso de todos los bienes, efectos y ganancias procedentes
de la actividad delictiva, así como la responsabilidad civil subsidiaria de
las sociedades instrumentales utilizadas.""",
        "texto_completo": """AUDIENCIA NACIONAL
Sala de lo Penal - Sección 1ª
Sentencia núm. 12/2024

ECLI:ES:AN:2024:5678
ROJ: SAN 5678/2024

Ponente: Ilmo. Sr. D. Pedro Rodríguez Vega

ANTECEDENTES DE HECHO:

PRIMERO.- El Ministerio Fiscal presentó escrito de acusación contra
D. Juan Pérez González y D. Miguel García López por delitos de blanqueo
de capitales y contra la Hacienda Pública.

SEGUNDO.- Los acusados, asesores fiscales de profesión, diseñaron una
estructura societaria para ocultar activos de clientes.

FUNDAMENTOS DE DERECHO:

PRIMERO.- El Ministerio Fiscal acusa a los procesados de un delito de
blanqueo de capitales del art. 301 CP, en relación con un delito contra
la Hacienda Pública del art. 305 CP.

SEGUNDO.- El delito de blanqueo de capitales requiere la existencia de
bienes que tengan su origen en una actividad delictiva previa, siendo
doctrina consolidada de esta Sala y del Tribunal Supremo (STS 974/2016,
de 23 de diciembre; STS 487/2018, de 18 de octubre) que el delito fiscal
puede constituir delito antecedente del blanqueo.

TERCERO.- La prueba practicada acredita que los acusados, mediante la
utilización de sociedades instrumentales en territorios de baja tributación,
ocultaron la titularidad de activos financieros por importe superior a
2.000.000 de euros, procedentes de rentas no declaradas.

CUARTO.- La conducta típica del art. 301.1 CP se integra por la adquisición,
posesión, utilización, conversión o transmisión de bienes, sabiendo que
éstos tienen su origen en una actividad delictiva. En el caso, los acusados
no solo conocían el origen ilícito, sino que participaron activamente en
la defraudación fiscal previa.

QUINTO.- Concurre la agravante del art. 301.1 in fine CP por actuar en
el ejercicio de actividad profesional, al ser los acusados asesores fiscales
que diseñaron y ejecutaron la estructura de ocultación.

FALLO:

Que debemos CONDENAR y CONDENAMOS a:

1) D. JUAN PÉREZ GONZÁLEZ como autor de un delito de blanqueo de capitales
agravado, a la pena de 4 años de prisión, multa de 5.000.000 de euros, e
inhabilitación especial para el ejercicio de la profesión por tiempo de 6 años.

2) D. MIGUEL GARCÍA LÓPEZ como autor del mismo delito, a la pena de 3 años
y 6 meses de prisión, multa de 4.000.000 de euros, e inhabilitación especial
por tiempo de 5 años.

3) Se decreta el decomiso de todos los bienes, efectos y ganancias procedentes
de la actividad delictiva, así como la responsabilidad civil subsidiaria de
las sociedades instrumentales utilizadas.

Madrid, 3 de julio de 2024."""
    }
]


async def load_samples():
    """Carga las sentencias de ejemplo en la base de datos."""
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy.orm import sessionmaker

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        loaded = 0
        skipped = 0

        for data in SAMPLE_SENTENCIAS:
            # Verificar si ya existe
            result = await db.execute(
                select(Jurisprudencia).where(Jurisprudencia.ecli == data["ecli"])
            )
            if result.scalar_one_or_none():
                print(f"  Ya existe: {data['ecli']}")
                skipped += 1
                continue

            # Crear sentencia
            sentencia = Jurisprudencia(**data, fuente="demo", indexada=False)
            db.add(sentencia)
            loaded += 1
            print(f"  Cargada: {data['ecli']} - {data['jurisdiccion'].value}")

        await db.commit()

        print(f"\n{'='*50}")
        print(f"Resumen:")
        print(f"  - Cargadas: {loaded}")
        print(f"  - Omitidas (ya existían): {skipped}")
        print(f"  - Total disponibles: {loaded + skipped}")


async def main():
    print("="*50)
    print("Cargando sentencias de ejemplo para demo")
    print("="*50)
    print()

    await load_samples()

    print()
    print("Para indexar en Qdrant, use el endpoint de reindexación")
    print("o cargue mediante POST /api/v1/ingestion/manual")


if __name__ == "__main__":
    asyncio.run(main())
