import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { authApi } from '../services/api'

interface RegisterForm {
  nombre: string
  apellidos: string
  email: string
  password: string
  confirmPassword: string
}

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>()

  const password = watch('password')

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true)
    try {
      await authApi.register({
        email: data.email,
        password: data.password,
        nombre: data.nombre,
        apellidos: data.apellidos,
      })
      toast.success('Cuenta creada. Ya puedes iniciar sesión.')
      navigate('/login')
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } }
      toast.error(err.response?.data?.detail || 'Error al registrar')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Crear cuenta</h2>
      <p className="text-gray-600 mb-8">Empieza a ganar casos con IA</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="nombre" className="label">
              Nombre
            </label>
            <input
              id="nombre"
              type="text"
              className={errors.nombre ? 'input-error' : 'input'}
              {...register('nombre', { required: 'Obligatorio' })}
            />
            {errors.nombre && (
              <p className="mt-1 text-sm text-accent-danger">{errors.nombre.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="apellidos" className="label">
              Apellidos
            </label>
            <input
              id="apellidos"
              type="text"
              className={errors.apellidos ? 'input-error' : 'input'}
              {...register('apellidos', { required: 'Obligatorio' })}
            />
            {errors.apellidos && (
              <p className="mt-1 text-sm text-accent-danger">{errors.apellidos.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="email" className="label">
            Email profesional
          </label>
          <input
            id="email"
            type="email"
            className={errors.email ? 'input-error' : 'input'}
            {...register('email', {
              required: 'Obligatorio',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Email inválido',
              },
            })}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-accent-danger">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="label">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            className={errors.password ? 'input-error' : 'input'}
            {...register('password', {
              required: 'Obligatoria',
              minLength: { value: 8, message: 'Mínimo 8 caracteres' },
            })}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-accent-danger">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="label">
            Confirmar contraseña
          </label>
          <input
            id="confirmPassword"
            type="password"
            className={errors.confirmPassword ? 'input-error' : 'input'}
            {...register('confirmPassword', {
              required: 'Confirma la contraseña',
              validate: (value) => value === password || 'Las contraseñas no coinciden',
            })}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-accent-danger">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full py-3 mt-6"
        >
          {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="font-medium text-primary-900 hover:text-primary-700">
          Inicia sesión
        </Link>
      </p>
    </div>
  )
}
