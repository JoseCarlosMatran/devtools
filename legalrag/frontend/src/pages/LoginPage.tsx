import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { authApi } from '../services/api'
import { useAuthStore } from '../store/authStore'

interface LoginForm {
  email: string
  password: string
}

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>()

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    try {
      const tokenData = await authApi.login(data.email, data.password)
      // Guardar token primero para que el interceptor lo use en /me
      useAuthStore.getState().setToken(tokenData.access_token)
      const userData = await authApi.me()
      setAuth(userData, tokenData.access_token)
      toast.success('Bienvenido a LegalRAG')
      navigate('/dashboard')
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } }
      toast.error(err.response?.data?.detail || 'Error al iniciar sesión')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Iniciar sesión</h2>
      <p className="text-gray-600 mb-8">Accede a tu cuenta de LegalRAG</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className={errors.email ? 'input-error' : 'input'}
            {...register('email', {
              required: 'El email es obligatorio',
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
            autoComplete="current-password"
            className={errors.password ? 'input-error' : 'input'}
            {...register('password', {
              required: 'La contraseña es obligatoria',
              minLength: {
                value: 8,
                message: 'Mínimo 8 caracteres',
              },
            })}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-accent-danger">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full py-3"
        >
          {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        ¿No tienes cuenta?{' '}
        <Link to="/register" className="font-medium text-primary-900 hover:text-primary-700">
          Regístrate
        </Link>
      </p>
    </div>
  )
}
