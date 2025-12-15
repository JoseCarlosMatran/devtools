import { useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import {
  ArrowLeftIcon,
  DocumentArrowUpIcon,
  DocumentTextIcon,
  TrashIcon,
  SparklesIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { casesApi, documentsApi, exportApi } from '../services/api'
import {
  Case,
  Document,
  TIPO_CASO_LABELS,
  ROL_CLIENTE_LABELS,
  ESTADO_CASO_LABELS,
  TIPO_DOCUMENTO_LABELS,
} from '../types'
import clsx from 'clsx'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isUploading, setIsUploading] = useState(false)

  const { data: caso, isLoading: loadingCase } = useQuery({
    queryKey: ['case', id],
    queryFn: () => casesApi.get(Number(id)),
    enabled: !!id,
  })

  const { data: documents = [], isLoading: loadingDocs } = useQuery({
    queryKey: ['documents', id],
    queryFn: () => documentsApi.listByCase(Number(id)),
    enabled: !!id,
  })

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      return documentsApi.upload(Number(id), file)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', id] })
      queryClient.invalidateQueries({ queryKey: ['case', id] })
      toast.success('Documento subido correctamente')
    },
    onError: () => {
      toast.error('Error al subir el documento')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (docId: number) => documentsApi.delete(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', id] })
      queryClient.invalidateQueries({ queryKey: ['case', id] })
      toast.success('Documento eliminado')
    },
  })

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsUploading(true)
    for (const file of acceptedFiles) {
      await uploadMutation.mutateAsync(file)
    }
    setIsUploading(false)
  }, [uploadMutation])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
  })

  const handleExportPDF = async () => {
    try {
      toast.loading('Generando informe...', { id: 'export' })
      const blob = await exportApi.caseReport(Number(id))
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `informe_${caso?.referencia}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Informe descargado', { id: 'export' })
    } catch {
      toast.error('Error al generar el informe. Asegúrate de haber ejecutado el análisis primero.', { id: 'export' })
    }
  }

  if (loadingCase) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-900"></div>
      </div>
    )
  }

  if (!caso) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-medium text-gray-900">Caso no encontrado</h2>
        <Link to="/cases" className="text-primary-900 hover:underline mt-2 inline-block">
          Volver a mis casos
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/cases')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Volver
          </button>
          <div className="flex items-center gap-3 mb-2">
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
          <h1 className="text-2xl font-bold text-gray-900">{caso.titulo}</h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to={`/cases/${id}/analysis`}
            className="btn-primary inline-flex items-center gap-2"
          >
            <SparklesIcon className="h-5 w-5" />
            Analizar Caso
          </Link>
          {caso.tiene_analisis && (
            <button
              onClick={handleExportPDF}
              className="btn-secondary inline-flex items-center gap-2"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              Descargar PDF
            </button>
          )}
        </div>
      </div>

      {/* Case Info */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Información del Caso</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoItem label="Tipo" value={TIPO_CASO_LABELS[caso.tipo_caso]} />
          <InfoItem label="Rol Cliente" value={ROL_CLIENTE_LABELS[caso.rol_cliente]} />
          <InfoItem label="Juzgado" value={caso.juzgado || '-'} />
          <InfoItem label="Procedimiento" value={caso.numero_procedimiento || '-'} />
        </div>
        {caso.descripcion && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-600">{caso.descripcion}</p>
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Documentos ({documents.length})
        </h2>

        {/* Upload Zone */}
        <div
          {...getRootProps()}
          className={clsx(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors mb-6',
            isDragActive
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
          )}
        >
          <input {...getInputProps()} />
          <DocumentArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          {isUploading ? (
            <p className="text-gray-600">Subiendo documentos...</p>
          ) : isDragActive ? (
            <p className="text-primary-600">Suelta los archivos aquí</p>
          ) : (
            <>
              <p className="text-gray-600">Arrastra documentos aquí o haz clic para seleccionar</p>
              <p className="text-sm text-gray-400 mt-1">PDF, DOC, DOCX, TXT (máx. 50MB)</p>
            </>
          )}
        </div>

        {/* Documents List */}
        {loadingDocs ? (
          <p className="text-center text-gray-600 py-4">Cargando documentos...</p>
        ) : documents.length === 0 ? (
          <p className="text-center text-gray-500 py-4">No hay documentos aún</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {documents.map((doc: Document) => (
              <li
                key={doc.id}
                className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <DocumentTextIcon className="h-8 w-8 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {doc.nombre_original}
                    </p>
                    <p className="text-xs text-gray-500">
                      {TIPO_DOCUMENTO_LABELS[doc.tipo_documento]} ·{' '}
                      {(doc.tamano_bytes / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={clsx('badge', {
                      'bg-gray-100 text-gray-600': doc.estado === 'pendiente',
                      'badge-info': doc.estado === 'procesando',
                      'badge-success': doc.estado === 'procesado',
                      'badge-danger': doc.estado === 'error',
                    })}
                  >
                    {doc.estado}
                  </span>
                  {doc.estado === 'error' && (
                    <button
                      onClick={() => documentsApi.reprocess(doc.id)}
                      className="p-1 text-gray-400 hover:text-primary-600"
                      title="Reintentar"
                    >
                      <ArrowPathIcon className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm('¿Eliminar este documento?')) {
                        deleteMutation.mutate(doc.id)
                      }
                    }}
                    className="p-1 text-gray-400 hover:text-accent-danger"
                    title="Eliminar"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Quick Analysis CTA */}
      {documents.length > 0 && !caso.tiene_analisis && (
        <div className="card bg-gradient-to-r from-primary-900 to-primary-800 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">¿Listo para analizar?</h3>
              <p className="text-primary-200">
                Tienes {documents.length} documento(s) subidos. Ejecuta el análisis para obtener estrategia jurídica.
              </p>
            </div>
            <Link
              to={`/cases/${id}/analysis`}
              className="btn-secondary bg-white text-primary-900 hover:bg-primary-50 inline-flex items-center gap-2"
            >
              <SparklesIcon className="h-5 w-5" />
              Analizar Ahora
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  )
}
