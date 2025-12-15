import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { casesApi } from '../services/api'
import { TipoCaso, RolCliente, TIPO_CASO_LABELS, ROL_CLIENTE_LABELS } from '../types'

interface NewCaseForm {
  titulo: string
  descripcion: string
  tipo_caso: TipoCaso
  rol_cliente: RolCliente
  juzgado: string
  numero_procedimiento: string
}

export default function NewCasePage() {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewCaseForm>()

  const onSubmit = async (data: NewCaseForm) => {
    setIsLoading(true)
    try {
      const newCase = await casesApi.create({
        titulo: data.titulo,
        descripcion: data.descripcion || undefined,
        tipo_caso: data.tipo_caso,
        rol_cliente: data.rol_cliente,
        juzgado: data.juzgado || undefined,
        numero_procedimiento: data.numero_procedimiento || undefined,
      })
      toast.success('Caso creado correctamente')
      navigate(`/cases/${newCase.id}`)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } }
      toast.error(err.response?.data?.detail || 'Error al crear el caso')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Volver
      </button>

      <div className="card">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Nuevo Caso</h1>
        <p className="text-gray-600 mb-8">
          Define los datos básicos del caso. Podrás añadir documentos después.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Título */}
          <div>
            <label htmlFor="titulo" className="label">
              Título del caso *
            </label>
            <input
              id="titulo"
              type="text"
              placeholder="Ej: Reclamación de cantidad por impago"
              className={errors.titulo ? 'input-error' : 'input'}
              {...register('titulo', {
                required: 'El título es obligatorio',
                minLength: { value: 5, message: 'Mínimo 5 caracteres' },
              })}
            />
            {errors.titulo && (
              <p className="mt-1 text-sm text-accent-danger">{errors.titulo.message}</p>
            )}
          </div>

          {/* Tipo y Rol */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tipo_caso" className="label">
                Tipo de caso *
              </label>
              <select
                id="tipo_caso"
                className={errors.tipo_caso ? 'input-error' : 'input'}
                {...register('tipo_caso', { required: 'Selecciona un tipo' })}
              >
                <option value="">Seleccionar...</option>
                {Object.entries(TIPO_CASO_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {errors.tipo_caso && (
                <p className="mt-1 text-sm text-accent-danger">{errors.tipo_caso.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="rol_cliente" className="label">
                Rol del cliente *
              </label>
              <select
                id="rol_cliente"
                className={errors.rol_cliente ? 'input-error' : 'input'}
                {...register('rol_cliente', { required: 'Selecciona un rol' })}
              >
                <option value="">Seleccionar...</option>
                {Object.entries(ROL_CLIENTE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {errors.rol_cliente && (
                <p className="mt-1 text-sm text-accent-danger">{errors.rol_cliente.message}</p>
              )}
            </div>
          </div>

          {/* Juzgado y Procedimiento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="juzgado" className="label">
                Juzgado
              </label>
              <input
                id="juzgado"
                type="text"
                placeholder="Ej: Juzgado de Primera Instancia nº 5 de Madrid"
                className="input"
                {...register('juzgado')}
              />
            </div>

            <div>
              <label htmlFor="numero_procedimiento" className="label">
                Nº Procedimiento
              </label>
              <input
                id="numero_procedimiento"
                type="text"
                placeholder="Ej: 123/2024"
                className="input"
                {...register('numero_procedimiento')}
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label htmlFor="descripcion" className="label">
              Descripción del caso
            </label>
            <textarea
              id="descripcion"
              rows={4}
              placeholder="Describe brevemente los hechos y circunstancias del caso..."
              className="input resize-none"
              {...register('descripcion')}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-secondary flex-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary flex-1"
            >
              {isLoading ? 'Creando...' : 'Crear Caso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
