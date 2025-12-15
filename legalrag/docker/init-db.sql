-- ============================================
-- LegalRAG - Inicialización de Base de Datos
-- ============================================

-- Extensiones útiles
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- Para búsqueda de texto similar

-- Índices de texto completo en español
-- (Se crearán con las tablas vía SQLAlchemy)

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'LegalRAG database initialized successfully';
END $$;
