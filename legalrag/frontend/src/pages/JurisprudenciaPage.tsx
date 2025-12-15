import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  MagnifyingGlassIcon,
  BookOpenIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import { jurisprudenciaApi } from '../services/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface SearchResult {
  tipo: string
  id: number
  titulo: string
  extracto: string
  score: number
  metadatos: Record<string, unknown>
}

export default function JurisprudenciaPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])

  const { data: stats } = useQuery({
    queryKey: ['jurisprudencia-stats'],
    queryFn: () => jurisprudenciaApi.stats(),
  })

  const { data: recent = [] } = useQuery({
    queryKey: ['jurisprudencia-list'],
    queryFn: () => jurisprudenciaApi.list({ limit: 10 }),
  })

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 10) {
      toast.error('Introduce una búsqueda más detallada (mínimo 10 caracteres)')
      return
    }

    setIsSearching(true)
    try {
      const response = await jurisprudenciaApi.search(searchQuery, { limit: 10 })
      setSearchResults(response.resultados || [])
      if (response.resultados?.length === 0) {
        toast('No se encontraron resultados', { icon: '📭' })
      }
    } catch {
      toast.error('Error en la búsqueda')
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jurisprudencia</h1>
          <p className="text-gray-600">
            Busca y gestiona tu base de conocimiento legal
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Sentencias"
          value={stats?.jurisprudencia?.total || 0}
          sublabel={`${stats?.jurisprudencia?.indexadas || 0} indexadas`}
        />
        <StatCard
          label="Legislación"
          value={stats?.legislacion?.total || 0}
          sublabel={`${stats?.legislacion?.indexadas || 0} indexadas`}
        />
        <StatCard
          label="Vectores"
          value={stats?.vectores?.jurisprudencia?.points_count || 0}
          sublabel="en jurisprudencia"
        />
        <StatCard
          label="Vectores"
          value={stats?.vectores?.legislacion?.points_count || 0}
          sublabel="en legislación"
        />
      </div>

      {/* Semantic Search */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Búsqueda Semántica
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Describe tu caso o situación jurídica y encontraremos la jurisprudencia más relevante.
        </p>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Ej: Responsabilidad civil por defectos de construcción en vivienda nueva..."
              className="input pl-10"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="btn-primary"
          >
            {isSearching ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-6 space-y-4">
            <h3 className="font-medium text-gray-900">
              Resultados ({searchResults.length})
            </h3>
            {searchResults.map((result, i) => (
              <div
                key={i}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{result.titulo}</p>
                    <p className="text-xs text-gray-500">
                      Relevancia: {(result.score * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 line-clamp-3">{result.extracto}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent / Available */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Jurisprudencia Disponible
        </h2>

        {recent.length === 0 ? (
          <div className="text-center py-8">
            <BookOpenIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 mb-4">
              No hay jurisprudencia cargada aún
            </p>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              Puedes añadir sentencias manualmente o subir PDFs de resoluciones judiciales
              desde el formulario de carga.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recent.map((jur: {
              id: number
              roj?: string
              ecli?: string
              tribunal: string
              fecha_resolucion: string
              jurisdiccion: string
              indexada: boolean
            }) => (
              <li key={jur.id} className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {jur.roj || jur.ecli || `ID ${jur.id}`}
                    </p>
                    <p className="text-sm text-gray-500">
                      {jur.tribunal} ·{' '}
                      {format(new Date(jur.fecha_resolucion), 'd MMM yyyy', { locale: es })} ·{' '}
                      {jur.jurisdiccion}
                    </p>
                  </div>
                  <span
                    className={`badge ${jur.indexada ? 'badge-success' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {jur.indexada ? 'Indexada' : 'Pendiente'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Help */}
      <div className="card bg-gray-50 border-gray-200">
        <h3 className="font-medium text-gray-900 mb-2">¿Cómo añadir jurisprudencia?</h3>
        <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
          <li>Descarga sentencias desde CENDOJ (cendoj.poderjudicial.es)</li>
          <li>Utiliza la API para cargar las sentencias en formato JSON</li>
          <li>O sube PDFs directamente desde la API (endpoint /jurisprudencia/upload-pdf)</li>
          <li>El sistema extraerá el texto y lo indexará automáticamente</li>
        </ol>
        <p className="text-xs text-gray-500 mt-4">
          Nota: El scraping automático de CENDOJ no está permitido. Las sentencias deben cargarse manualmente.
        </p>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  sublabel,
}: {
  label: string
  value: number
  sublabel: string
}) {
  return (
    <div className="card text-center">
      <p className="text-2xl font-bold text-primary-900">{value}</p>
      <p className="text-sm font-medium text-gray-900">{label}</p>
      <p className="text-xs text-gray-500">{sublabel}</p>
    </div>
  )
}
