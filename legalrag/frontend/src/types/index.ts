// Enums
export type TipoCaso =
  | 'civil'
  | 'penal'
  | 'mercantil'
  | 'laboral'
  | 'contencioso_administrativo'
  | 'consumo'
  | 'familia'
  | 'otro'

export type RolCliente =
  | 'demandante'
  | 'demandado'
  | 'acusacion_particular'
  | 'investigado'
  | 'tercero'

export type EstadoCaso =
  | 'pendiente'
  | 'en_analisis'
  | 'analizado'
  | 'archivado'

export type TipoDocumento =
  | 'demanda'
  | 'contestacion'
  | 'contrato'
  | 'atestado'
  | 'escrito_judicial'
  | 'sentencia'
  | 'auto'
  | 'providencia'
  | 'recurso'
  | 'prueba'
  | 'informe_pericial'
  | 'otro'

export type EstadoProcesamiento =
  | 'pendiente'
  | 'procesando'
  | 'procesado'
  | 'error'

// Interfaces
export interface User {
  id: number
  email: string
  nombre: string
  apellidos: string
  numero_colegiado?: string
  colegio_abogados?: string
  role: string
  is_active: boolean
  despacho_id?: number
  created_at: string
  last_login?: string
}

export interface Case {
  id: number
  referencia: string
  titulo: string
  descripcion?: string
  tipo_caso: TipoCaso
  rol_cliente: RolCliente
  juzgado?: string
  numero_procedimiento?: string
  estado: EstadoCaso
  abogado_id: number
  created_at: string
  updated_at: string
  documentos_count: number
  tiene_analisis: boolean
}

export interface Document {
  id: number
  caso_id: number
  nombre_original: string
  tipo_documento: TipoDocumento
  descripcion?: string
  tipo_mime: string
  tamano_bytes: number
  estado: EstadoProcesamiento
  num_paginas?: number
  embeddings_generados: boolean
  created_at: string
  updated_at: string
  texto_extraido?: string
  error_mensaje?: string
}

export interface CaseAnalysis {
  id: number
  caso_id: number
  version: number
  resumen_ejecutivo: string
  hechos_relevantes: HechoRelevante[]
  problemas_juridicos: ProblemaJuridico[]
  normativa_aplicable: NormativaAplicable[]
  jurisprudencia_relevante: JurisprudenciaRelevante[]
  estrategia_defensa?: string
  estrategia_ataque?: string
  argumentos_principales: ArgumentoJuridico[]
  riesgos: Riesgo[]
  puntos_debiles: string[]
  recomendaciones: string[]
  modelo_usado: string
  created_at: string
}

export interface HechoRelevante {
  descripcion: string
  relevancia: 'alta' | 'media' | 'baja'
  fuente_documento?: string
}

export interface ProblemaJuridico {
  descripcion: string
  tipo: 'sustantivo' | 'procesal' | 'probatorio'
  normas_relacionadas: string[]
}

export interface NormativaAplicable {
  norma: string
  articulos: string[]
  relevancia: string
  aplicacion: string
}

export interface JurisprudenciaRelevante {
  identificador: string
  tribunal: string
  fecha: string
  extracto: string
  aplicacion_caso: string
  score_relevancia?: number
}

export interface ArgumentoJuridico {
  titulo: string
  desarrollo: string
  fundamento_legal: string
  jurisprudencia_apoyo: string[]
  fuerza: 'fuerte' | 'moderado' | 'débil'
}

export interface Riesgo {
  descripcion: string
  gravedad: 'alta' | 'media' | 'baja'
  mitigacion?: string
}

// Labels para UI
export const TIPO_CASO_LABELS: Record<TipoCaso, string> = {
  civil: 'Civil',
  penal: 'Penal',
  mercantil: 'Mercantil',
  laboral: 'Laboral',
  contencioso_administrativo: 'Contencioso-Administrativo',
  consumo: 'Consumo',
  familia: 'Familia',
  otro: 'Otro',
}

export const ROL_CLIENTE_LABELS: Record<RolCliente, string> = {
  demandante: 'Demandante',
  demandado: 'Demandado',
  acusacion_particular: 'Acusación Particular',
  investigado: 'Investigado',
  tercero: 'Tercero',
}

export const ESTADO_CASO_LABELS: Record<EstadoCaso, string> = {
  pendiente: 'Pendiente',
  en_analisis: 'En análisis',
  analizado: 'Analizado',
  archivado: 'Archivado',
}

export const TIPO_DOCUMENTO_LABELS: Record<TipoDocumento, string> = {
  demanda: 'Demanda',
  contestacion: 'Contestación',
  contrato: 'Contrato',
  atestado: 'Atestado',
  escrito_judicial: 'Escrito Judicial',
  sentencia: 'Sentencia',
  auto: 'Auto',
  providencia: 'Providencia',
  recurso: 'Recurso',
  prueba: 'Prueba',
  informe_pericial: 'Informe Pericial',
  otro: 'Otro',
}
