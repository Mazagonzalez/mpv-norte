import Dexie, { type EntityTable } from 'dexie'

export type EstadoProyecto = 'activo' | 'pausado' | 'estacionado' | 'cerrado' | 'terminado'

export interface Proyecto {
  id: string
  nombre: string
  porQue: string
  estado: EstadoProyecto
  siguientePaso: string
  notaPausa: string
  aprendizaje: string
  creadoEn: string
  actualizadoEn: string
}

export interface Foco {
  /** Día local en formato YYYY-MM-DD. Es la clave: solo puede haber un foco por día. */
  fecha: string
  proyectoId: string
  paso: string
  hecho: boolean
}

export interface Idea {
  id: string
  titulo: string
  fecha: string
}

export const MAX_ACTIVOS = 2

export const db = new Dexie('norte') as Dexie & {
  proyectos: EntityTable<Proyecto, 'id'>
  focos: EntityTable<Foco, 'fecha'>
  ideas: EntityTable<Idea, 'id'>
}

db.version(1).stores({
  proyectos: 'id, estado',
  focos: 'fecha, proyectoId',
  ideas: 'id, fecha',
})
