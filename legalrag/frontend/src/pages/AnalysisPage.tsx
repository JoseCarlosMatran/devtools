import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import {
  ArrowLeftIcon,
  SparklesIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  LightBulbIcon,
  ScaleIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'
import { casesApi, analysisApi, exportApi } from '../services/api'
import { CaseAnalysis } from '../types'
import clsx from 'clsx'

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [profundidad, setProfundidad] = useState<'rapido' | 'normal' | 'completo'>('completo')

  const { data: caso } = useQuery({
    queryKey: ['case', id],
    queryFn: () => casesApi.get(Number(id)),
    enabled: !!id,
  })

  const { data: analysis, isLoading: loadingAnalysis } = useQuery({
    queryKey: ['analysis', id],
    queryFn: () => analysisApi.getLatest(Number(id)),
    enabled: !!id,
    retry: false,
  })

  const analyzeMutation = useMutation({
    mutationFn: () => analysisApi.analyze(Number(id), { profundidad, forzar_nuevo: true }),
    onSuccess: (data) => {
      queryClient.setQueryData(['analysis', id], data)
      queryClient.invalidateQueries({ queryKey: ['case', id] })
      toast.success('Análisis completado')
    },
    onError: () => {
      toast.error('Error al ejecutar el análisis')
    },
  })

  const handleExport = async () => {
    try {
      toast.loading('Generando PDF...', { id: 'export' })
      const blob = await exportApi.caseReport(Number(id))
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `informe_${caso?.referencia}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('PDF descargado', { id: 'export' })
    } catch {
      toast.error('Error al generar el PDF', { id: 'export' })
    }
  }

  const isAnalyzing = analyzeMutation.isPending

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate(`/cases/${id}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Volver al caso
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Análisis Jurídico</h1>
          <p className="text-gray-600">{caso?.titulo}</p>
        </div>

        <div className="flex gap-2">
          {analysis && (
            <button onClick={handleExport} className="btn-secondary inline-flex items-center gap-2">
              <ArrowDownTrayIcon className="h-5 w-5" />
              Exportar PDF
            </button>
          )}
          <div className="flex items-center gap-2">
            <select
              value={profundidad}
              onChange={(e) => setProfundidad(e.target.value as 'rapido' | 'normal' | 'completo')}
              className="input py-2"
              disabled={isAnalyzing}
            >
              <option value="rapido">Análisis Rápido</option>
              <option value="normal">Análisis Normal</option>
              <option value="completo">Análisis Completo</option>
            </select>
            <button
              onClick={() => analyzeMutation.mutate()}
              disabled={isAnalyzing}
              className="btn-primary inline-flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Analizando...
                </>
              ) : (
                <>
                  <SparklesIcon className="h-5 w-5" />
                  {analysis ? 'Reanalizar' : 'Analizar'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isAnalyzing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card bg-primary-50 border border-primary-200"
        >
          <div className="flex items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-900"></div>
            <div>
              <h3 className="font-medium text-primary-900">Analizando caso...</h3>
              <p className="text-sm text-primary-700">
                Estamos procesando los documentos, buscando jurisprudencia relevante y generando estrategia.
                Esto puede tardar unos minutos.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* No Analysis Yet */}
      {!analysis && !loadingAnalysis && !isAnalyzing && (
        <div className="card text-center py-12">
          <SparklesIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sin análisis aún</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Ejecuta el análisis para obtener estrategia jurídica, argumentos para juicio y jurisprudencia relevante.
          </p>
          <button
            onClick={() => analyzeMutation.mutate()}
            className="btn-primary inline-flex items-center gap-2"
          >
            <SparklesIcon className="h-5 w-5" />
            Ejecutar Análisis
          </button>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && !isAnalyzing && (
        <AnalysisResults analysis={analysis} />
      )}
    </div>
  )
}

function AnalysisResults({ analysis }: { analysis: CaseAnalysis }) {
  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <DocumentTextIcon className="h-5 w-5 text-primary-600" />
          Resumen Ejecutivo
        </h2>
        <p className="text-gray-700 whitespace-pre-line">{analysis.resumen_ejecutivo}</p>
      </motion.div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Strategy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ScaleIcon className="h-5 w-5 text-primary-600" />
            Estrategia Jurídica
          </h2>
          {analysis.estrategia_defensa && (
            <div className="mb-4">
              <h3 className="font-medium text-gray-700 mb-2">Defensa</h3>
              <p className="text-gray-600 text-sm whitespace-pre-line">{analysis.estrategia_defensa}</p>
            </div>
          )}
          {analysis.estrategia_ataque && (
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Ataque</h3>
              <p className="text-gray-600 text-sm whitespace-pre-line">{analysis.estrategia_ataque}</p>
            </div>
          )}
        </motion.div>

        {/* Risks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-accent-warning" />
            Riesgos y Puntos Débiles
          </h2>
          {analysis.riesgos?.length > 0 ? (
            <ul className="space-y-3">
              {analysis.riesgos.map((riesgo, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    className={clsx('mt-1 w-2 h-2 rounded-full flex-shrink-0', {
                      'bg-accent-danger': riesgo.gravedad === 'alta',
                      'bg-accent-warning': riesgo.gravedad === 'media',
                      'bg-accent-success': riesgo.gravedad === 'baja',
                    })}
                  />
                  <div>
                    <p className="text-sm text-gray-700">{riesgo.descripcion}</p>
                    {riesgo.mitigacion && (
                      <p className="text-xs text-gray-500 mt-1">
                        <strong>Mitigación:</strong> {riesgo.mitigacion}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">No se identificaron riesgos significativos.</p>
          )}
        </motion.div>
      </div>

      {/* Arguments */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <LightBulbIcon className="h-5 w-5 text-accent-gold" />
          Argumentos para Juicio
        </h2>
        {analysis.argumentos_principales?.length > 0 ? (
          <div className="space-y-4">
            {analysis.argumentos_principales.map((arg, i) => (
              <div key={i} className="border-l-4 border-primary-200 pl-4 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium text-gray-900">{arg.titulo}</h3>
                  <span
                    className={clsx('text-xs px-2 py-0.5 rounded', {
                      'bg-green-100 text-green-700': arg.fuerza === 'fuerte',
                      'bg-yellow-100 text-yellow-700': arg.fuerza === 'moderado',
                      'bg-gray-100 text-gray-600': arg.fuerza === 'débil',
                    })}
                  >
                    {arg.fuerza}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{arg.desarrollo}</p>
                <p className="text-xs text-primary-700">
                  <strong>Fundamento:</strong> {arg.fundamento_legal}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No se generaron argumentos específicos.</p>
        )}
      </motion.div>

      {/* Jurisprudencia */}
      {analysis.jurisprudencia_relevante?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Jurisprudencia Relevante</h2>
          <div className="space-y-4">
            {analysis.jurisprudencia_relevante.map((jur, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{jur.identificador}</p>
                    <p className="text-sm text-gray-500">
                      {jur.tribunal} · {jur.fecha}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 italic mb-2">"{jur.extracto}"</p>
                <p className="text-sm text-primary-700">
                  <strong>Aplicación:</strong> {jur.aplicacion_caso}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recommendations */}
      {analysis.recomendaciones?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 text-accent-success" />
            Recomendaciones
          </h2>
          <ul className="space-y-2">
            {analysis.recomendaciones.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-accent-success mt-1">✓</span>
                {rec}
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  )
}
