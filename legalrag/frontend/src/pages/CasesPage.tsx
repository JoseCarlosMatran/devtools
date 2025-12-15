import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FolderIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'
import { casesApi } from '../services/api'
import { Case, TipoCaso, EstadoCaso, TIPO_CASO_LABELS, ESTADO_CASO_LABELS, ROL_CLIENTE_LABELS } from '../types'
import clsx from 'clsx'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function CasesPage() {
  const [search, setSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState<TipoCaso | ''>('')
  const [filterEstado, setFilterEstado] = useState<EstadoCaso | ''>('')

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['cases', { search, tipo: filterTipo, estado: filterEstado }],
    queryFn: () => casesApi.list({
      search: search || undefined,
      tipo: filterTipo || undefined,
      estado: filterEstado || undefined,
    }),
  })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Casos</h1>
          <p className="text-gray-600">Gestiona todos tus casos judiciales</p>
        </div>
        <Link to="/cases/new" className="btn-primary inline-flex items-center gap-2">
          <PlusIcon className="h-5 w-5" />
          Nuevo Caso
        </Link>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por título o referencia..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Type filter */}
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value as TipoCaso | '')}
            className="input w-full sm:w-48"
          >
            <option value="">Todos los tipos</option>
            {Object.entries(TIPO_CASO_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value as EstadoCaso | '')}
            className="input w-full sm:w-48"
          >
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO_CASO_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cases List */}
      {isLoading ? (
        <div className="card text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando casos...</p>
        </div>
      ) : cases.length === 0 ? (
        <div className="card text-center py-12">
          <FolderIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay casos</h3>
          <p className="text-gray-600 mb-4">
            {search || filterTipo || filterEstado
              ? 'No se encontraron casos con esos filtros'
              : 'Comienza creando tu primer caso'}
          </p>
          <Link to="/cases/new" className="btn-primary inline-flex items-center gap-2">
            <PlusIcon className="h-5 w-5" />
            Crear Caso
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {cases.map((caso: Case) => (
            <CaseCard key={caso.id} caso={caso} />
          ))}
        </div>
      )}
    </div>
  )
}

function CaseCard({ caso }: { caso: Case }) {
  const estadoStyles = {
    pendiente: 'border-l-yellow-500',
    en_analisis: 'border-l-blue-500',
    analizado: 'border-l-green-500',
    archivado: 'border-l-gray-400',
  }

  return (
    <Link
      to={`/cases/${caso.id}`}
      className={clsx(
        'card-hover border-l-4 flex flex-col sm:flex-row sm:items-center gap-4',
        estadoStyles[caso.estado]
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm text-gray-500 font-mono">{caso.referencia}</span>
          <span
            className={clsx('badge', {
              'badge-warning': caso.estado === 'pendiente',
              'badge-info': caso.estado === 'en_analisis',
              'badge-success': caso.estado === 'analizado',
              'bg-gray-100 text-gray-800': caso.estado === 'archivado',
            })}
          >
            {ESTADO_CASO_LABELS[caso.estado]}
          </span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 truncate">{caso.titulo}</h3>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-600">
          <span>{TIPO_CASO_LABELS[caso.tipo_caso]}</span>
          <span>·</span>
          <span>{ROL_CLIENTE_LABELS[caso.rol_cliente]}</span>
          {caso.juzgado && (
            <>
              <span>·</span>
              <span>{caso.juzgado}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 sm:flex-col sm:items-end">
        <div className="flex items-center gap-1 text-gray-500">
          <DocumentTextIcon className="h-4 w-4" />
          <span className="text-sm">{caso.documentos_count}</span>
        </div>
        <span className="text-xs text-gray-400">
          {format(new Date(caso.created_at), "d MMM yyyy", { locale: es })}
        </span>
      </div>
    </Link>
  )
}
