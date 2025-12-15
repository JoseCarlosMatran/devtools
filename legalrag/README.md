# LegalRAG - Plataforma de Análisis Jurídico con IA

**Prepara la defensa o ataque de un caso judicial en minutos.**

LegalRAG es una plataforma SaaS pensada exclusivamente para abogados que permite analizar casos judiciales, encontrar jurisprudencia relevante y generar estrategias de defensa/ataque utilizando inteligencia artificial.

## Características Principales

- **Análisis Automático de Casos**: Sube documentos (demandas, contratos, atestados) y obtén un análisis completo
- **RAG Jurídico**: Sistema de recuperación de información adaptado al derecho español
- **Generación de Estrategias**: Argumentos listos para usar en juicio
- **Jurisprudencia Relevante**: Búsqueda semántica en tu base de sentencias
- **Exportación PDF**: Informes profesionales descargables
- **Multi-despacho**: Sistema de roles y suscripciones

## Stack Tecnológico

- **Backend**: Python 3.11+ con FastAPI
- **Base de Datos**: PostgreSQL 16
- **Vector DB**: Qdrant
- **Embeddings**: intfloat/multilingual-e5-large
- **LLM**: OpenAI GPT-4 (configurable)
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Autenticación**: JWT

## Requisitos Previos

- Python 3.11+
- Node.js 18+
- Docker y Docker Compose
- OpenAI API Key (para análisis con IA)

## Instalación

### 1. Clonar y configurar

```bash
cd legalrag
```

### 2. Iniciar servicios con Docker

```bash
cd docker
docker-compose up -d
```

Esto inicia:
- PostgreSQL en puerto 5432
- Qdrant en puertos 6333/6334
- Redis en puerto 6379

### 3. Configurar Backend

```bash
cd backend

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# o: venv\Scripts\activate  # Windows

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tu OPENAI_API_KEY
```

### 4. Configurar Frontend

```bash
cd frontend

# Instalar dependencias
npm install
```

## Ejecución

### Desarrollo

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Docs API: http://localhost:8000/docs

## Uso

### 1. Registro

1. Accede a http://localhost:3000
2. Crea una cuenta con tu email profesional
3. Opcionalmente, crea un despacho

### 2. Crear un Caso

1. Click en "Nuevo Caso"
2. Define: título, tipo (civil, penal, etc.), rol del cliente
3. Guarda el caso

### 3. Subir Documentos

1. Dentro del caso, arrastra documentos (PDF, DOCX)
2. El sistema extrae el texto automáticamente
3. Los documentos se indexan para búsqueda

### 4. Ejecutar Análisis

1. Click en "Analizar Caso"
2. Selecciona profundidad (rápido/normal/completo)
3. Espera el análisis (1-3 minutos)
4. Revisa: resumen, estrategia, argumentos, riesgos

### 5. Exportar PDF

1. Una vez analizado, click en "Exportar PDF"
2. Descarga el informe profesional

## Cargar Jurisprudencia

El sistema requiere jurisprudencia cargada manualmente (no hay scraping de CENDOJ).

### Vía API

```bash
curl -X POST http://localhost:8000/api/v1/jurisprudencia \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tribunal": "Tribunal Supremo Sala 1ª",
    "tipo_tribunal": "tribunal_supremo",
    "fecha_resolucion": "2024-01-15",
    "jurisdiccion": "civil",
    "roj": "STS 123/2024",
    "fundamentos_derecho": "PRIMERO.- ...",
    "texto_completo": "..."
  }'
```

### Subir PDF

```bash
curl -X POST "http://localhost:8000/api/v1/jurisprudencia/upload-pdf?jurisdiccion=civil&tipo_tribunal=tribunal_supremo&fecha_resolucion=2024-01-15&tribunal=Tribunal%20Supremo" \
  -H "Authorization: Bearer <token>" \
  -F "file=@sentencia.pdf"
```

## Estructura del Proyecto

```
legalrag/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # Endpoints REST
│   │   ├── core/               # Config, DB, Security
│   │   ├── models/             # SQLAlchemy models
│   │   ├── schemas/            # Pydantic schemas
│   │   └── services/           # Lógica de negocio
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/         # Componentes React
│   │   ├── pages/              # Páginas
│   │   ├── services/           # API client
│   │   └── store/              # Zustand store
│   └── package.json
├── docker/
│   └── docker-compose.yml
└── data/                       # Archivos subidos
```

## API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /api/v1/auth/register | Registro |
| POST | /api/v1/auth/login | Login |
| GET | /api/v1/auth/me | Usuario actual |
| POST | /api/v1/cases | Crear caso |
| GET | /api/v1/cases | Listar casos |
| POST | /api/v1/documents/upload/{id} | Subir documento |
| POST | /api/v1/analysis/case/{id} | Analizar caso |
| POST | /api/v1/jurisprudencia/search | Buscar jurisprudencia |
| POST | /api/v1/export/case/{id}/report | Exportar PDF |

## Modelo de Suscripción

| Tier | Consultas/mes | Características |
|------|---------------|-----------------|
| Free | 10 | Análisis básico |
| Basic | 50 | Análisis completo |
| Professional | 200 | Multi-usuario |
| Enterprise | Ilimitado | API, soporte |

## Seguridad

- Autenticación JWT con tokens de 24h
- Contraseñas hasheadas con bcrypt
- CORS configurado
- Roles: abogado, admin_despacho, super_admin
- Datos aislados por usuario/despacho

## Producción

Para desplegar en producción:

1. Cambiar `APP_ENV=production` en .env
2. Configurar `SECRET_KEY` y `JWT_SECRET_KEY` seguros
3. Usar PostgreSQL gestionado
4. Configurar HTTPS
5. Build del frontend: `npm run build`
6. Usar gunicorn/uvicorn workers

## Licencia

Propietario - Todos los derechos reservados.

## Soporte

Para soporte técnico o comercial, contactar con el equipo de desarrollo.
