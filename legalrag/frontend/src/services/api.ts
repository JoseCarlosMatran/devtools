import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_URL = import.meta.env.VITE_API_URL || '/api/v1'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para añadir token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth
export const authApi = {
  login: async (email: string, password: string) => {
    const formData = new URLSearchParams()
    formData.append('username', email)
    formData.append('password', password)
    const { data } = await api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    return data
  },
  register: async (userData: {
    email: string
    password: string
    nombre: string
    apellidos: string
  }) => {
    const { data } = await api.post('/auth/register', userData)
    return data
  },
  me: async () => {
    const { data } = await api.get('/auth/me')
    return data
  },
}

// Cases
export const casesApi = {
  list: async (params?: { tipo?: string; estado?: string; search?: string }) => {
    const { data } = await api.get('/cases', { params })
    return data
  },
  get: async (id: number) => {
    const { data } = await api.get(`/cases/${id}`)
    return data
  },
  create: async (caseData: {
    titulo: string
    descripcion?: string
    tipo_caso: string
    rol_cliente: string
    juzgado?: string
    numero_procedimiento?: string
  }) => {
    const { data } = await api.post('/cases', caseData)
    return data
  },
  update: async (id: number, updateData: Partial<{
    titulo: string
    descripcion: string
    estado: string
  }>) => {
    const { data } = await api.patch(`/cases/${id}`, updateData)
    return data
  },
  delete: async (id: number) => {
    await api.delete(`/cases/${id}`)
  },
  stats: async (id: number) => {
    const { data } = await api.get(`/cases/${id}/stats`)
    return data
  },
}

// Documents
export const documentsApi = {
  upload: async (caseId: number, file: File, tipo?: string, descripcion?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (tipo) formData.append('tipo_documento', tipo)
    if (descripcion) formData.append('descripcion', descripcion)

    const { data } = await api.post(`/documents/upload/${caseId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },
  listByCase: async (caseId: number) => {
    const { data } = await api.get(`/documents/case/${caseId}`)
    return data
  },
  get: async (id: number) => {
    const { data } = await api.get(`/documents/${id}`)
    return data
  },
  delete: async (id: number) => {
    await api.delete(`/documents/${id}`)
  },
  reprocess: async (id: number) => {
    const { data } = await api.post(`/documents/${id}/reprocess`)
    return data
  },
}

// Analysis
export const analysisApi = {
  analyze: async (caseId: number, options?: {
    forzar_nuevo?: boolean
    profundidad?: string
  }) => {
    const { data } = await api.post(`/analysis/case/${caseId}`, options || {})
    return data
  },
  getLatest: async (caseId: number) => {
    const { data } = await api.get(`/analysis/case/${caseId}/latest`)
    return data
  },
  list: async (caseId: number) => {
    const { data } = await api.get(`/analysis/case/${caseId}`)
    return data
  },
  get: async (id: number) => {
    const { data } = await api.get(`/analysis/${id}`)
    return data
  },
}

// Jurisprudencia
export const jurisprudenciaApi = {
  search: async (query: string, filters?: {
    jurisdiccion?: string
    tipo_tribunal?: string
    limit?: number
  }) => {
    const { data } = await api.post('/jurisprudencia/search', {
      query,
      ...filters,
    })
    return data
  },
  list: async (params?: { jurisdiccion?: string; search?: string }) => {
    const { data } = await api.get('/jurisprudencia', { params })
    return data
  },
  get: async (id: number) => {
    const { data } = await api.get(`/jurisprudencia/${id}`)
    return data
  },
  stats: async () => {
    const { data } = await api.get('/jurisprudencia/stats')
    return data
  },
}

// Export
export const exportApi = {
  caseReport: async (caseId: number) => {
    const response = await api.post(`/export/case/${caseId}/report`, null, {
      responseType: 'blob',
    })
    return response.data
  },
  arguments: async (caseId: number) => {
    const response = await api.post(`/export/case/${caseId}/arguments`, null, {
      responseType: 'blob',
    })
    return response.data
  },
}
