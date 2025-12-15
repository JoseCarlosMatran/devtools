import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  FolderIcon,
  DocumentTextIcon,
  ChartBarIcon,
  PlusIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'
import { casesApi, jurisprudenciaApi } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { Case, ESTADO_CASO_LABELS, TIPO_CASO_LABELS } from '../types'
import clsx from 'clsx'

export default function DashboardPage() {
  const { user } = useAuthStore()

  const { data: cases = [] } = useQuery({
    queryKey: ['cases'],
    queryFn: () => casesApi.list({ limit: 5 }),
  })

  const { data: stats } = useQuery({
    queryKey: ['jurisprudencia-stats'],
    queryFn: () => jurisprudenciaApi.stats(),
  })

  const recentCases = cases.slice(0, 5)
  const pendingCases = cases.filter((c: Case) => c.estado === 'pendiente').length
  const analyzedCases = cases.filter((c: Case) => c.estado === 'analizado').length

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hola, {user?.nombre}
          </h1>
          <p className="text-gray-600">
            Bienvenido a LegalRAG. Prepara tu próximo caso.
          </p>
        </div>
        <Link to="/cases/new" className="btn-primary inline-flex items-center gap-2">
          <PlusIcon className="h-5 w-5" />
          Nuevo Caso
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Casos Activos"
          value={cases.length}
          icon={FolderIcon}
          color="primary"
        />
        <StatCard
          title="Pendientes de Análisis"
          value={pendingCases}
          icon={DocumentTextIcon}
          color="warning"
        />
        <StatCard
          title="Casos Analizados"
          value={analyzedCases}
          icon={ChartBarIcon}
          color="success"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Cases */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Casos Recientes</h2>
            <Link
              to="/cases"
              className="text-sm text-primary-900 hover:text-primary-700 flex items-center gap-1"
            >
              Ver todos <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>

          {recentCases.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FolderIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No tienes casos aún</p>
              <Link to="/cases/new" className="text-primary-900 hover:underline text-sm">
                Crea tu primer caso
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentCases.map((caso: Case) => (
                <li key={caso.id}>
                  <Link
                    to={`/cases/${caso.id}`}
                    className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {caso.titulo}
                      </p>
                      <p className="text-xs text-gray-500">
                        {caso.referencia} · {TIPO_CASO_LABELS[caso.tipo_caso]}
                      </p>
                    </div>
                    <span
                      className={clsx('badge ml-2', {
                        'badge-warning': caso.estado === 'pendiente',
                        'badge-info': caso.estado === 'en_analisis',
                        'badge-success': caso.estado === 'analizado',
                        'bg-gray-100 text-gray-800': caso.estado === 'archivado',
                      })}
                    >
                      {ESTADO_CASO_LABELS[caso.estado]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* System Stats */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Base de Conocimiento</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Jurisprudencia</p>
                <p className="text-xs text-gray-500">Sentencias indexadas</p>
              </div>
              <span className="text-2xl font-bold text-primary-900">
                {stats?.jurisprudencia?.indexadas || 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Legislación</p>
                <p className="text-xs text-gray-500">Normas disponibles</p>
              </div>
              <span className="text-2xl font-bold text-primary-900">
                {stats?.legislacion?.indexadas || 0}
              </span>
            </div>

            <Link
              to="/jurisprudencia"
              className="block text-center py-2 text-sm text-primary-900 hover:text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors"
            >
              Gestionar Jurisprudencia
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Start Guide */}
      <div className="card bg-gradient-to-r from-primary-900 to-primary-800 text-white">
        <h2 className="text-lg font-semibold mb-4">¿Cómo empezar?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Step number={1} title="Crea un caso" description="Define el tipo de caso y rol de tu cliente" />
          <Step number={2} title="Sube documentos" description="Demandas, contratos, atestados, etc." />
          <Step number={3} title="Obtén análisis" description="Estrategia, argumentos y jurisprudencia" />
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: number
  icon: React.ElementType
  color: 'primary' | 'warning' | 'success'
}) {
  const colorClasses = {
    primary: 'bg-primary-100 text-primary-900',
    warning: 'bg-yellow-100 text-yellow-700',
    success: 'bg-green-100 text-green-700',
  }

  return (
    <div className="card flex items-center gap-4">
      <div className={clsx('p-3 rounded-lg', colorClasses[color])}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-600">{title}</p>
      </div>
    </div>
  )
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">
        {number}
      </div>
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-primary-200">{description}</p>
      </div>
    </div>
  )
}
