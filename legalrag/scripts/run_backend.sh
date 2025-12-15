#!/bin/bash
# Script para ejecutar el backend de LegalRAG

cd "$(dirname "$0")/../backend"

# Activar entorno virtual si existe
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Ejecutar servidor
echo "🚀 Iniciando LegalRAG Backend..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
