import { db, MAX_ACTIVOS, type EstadoProyecto, type Foco, type Idea, type Proyecto } from './db'
import { fechaLocal } from './fecha'

export interface Respaldo {
  app: 'norte'
  version: 1
  exportadoEn: string
  proyectos: Proyecto[]
  focos: Foco[]
  ideas: Idea[]
}

const ESTADOS: EstadoProyecto[] = ['activo', 'pausado', 'estacionado', 'cerrado', 'terminado']

export async function exportar() {
  const respaldo: Respaldo = {
    app: 'norte',
    version: 1,
    exportadoEn: new Date().toISOString(),
    proyectos: await db.proyectos.toArray(),
    focos: await db.focos.toArray(),
    ideas: await db.ideas.toArray(),
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(respaldo, null, 2)], { type: 'application/json' }))
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = `norte-respaldo-${fechaLocal()}.json`
  enlace.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

const sonTextos = (obj: Record<string, unknown>, campos: string[]) => campos.every((c) => typeof obj[c] === 'string')
const esObjeto = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null

/** Valida el archivo completo antes de tocar los datos actuales. Lanza un error legible si algo no cuadra. */
export function leerRespaldo(texto: string): Respaldo {
  let datos: unknown
  try {
    datos = JSON.parse(texto)
  } catch {
    throw new Error('El archivo no es un JSON válido.')
  }
  if (!esObjeto(datos) || datos.app !== 'norte' || datos.version !== 1) {
    throw new Error('Este archivo no es un respaldo de Norte.')
  }
  const { proyectos, focos, ideas } = datos
  if (!Array.isArray(proyectos) || !Array.isArray(focos) || !Array.isArray(ideas)) {
    throw new Error('Al respaldo le faltan datos.')
  }

  const camposProyecto = ['id', 'nombre', 'porQue', 'siguientePaso', 'notaPausa', 'aprendizaje', 'creadoEn', 'actualizadoEn']
  if (!proyectos.every((p) => esObjeto(p) && sonTextos(p, camposProyecto) && ESTADOS.includes(p.estado as EstadoProyecto))) {
    throw new Error('Hay un proyecto inválido en el respaldo.')
  }
  const ids = new Set(proyectos.map((p) => p.id))
  if (ids.size !== proyectos.length) throw new Error('Hay proyectos repetidos en el respaldo.')
  if (proyectos.filter((p) => p.estado === 'activo').length > MAX_ACTIVOS) {
    throw new Error(`El respaldo tiene más de ${MAX_ACTIVOS} proyectos activos.`)
  }

  const focosValidos = focos.every(
    (f) =>
      esObjeto(f) &&
      sonTextos(f, ['fecha', 'proyectoId', 'paso']) &&
      /^\d{4}-\d{2}-\d{2}$/.test(f.fecha as string) &&
      typeof f.hecho === 'boolean' &&
      ids.has(f.proyectoId),
  )
  if (!focosValidos) throw new Error('Hay un foco inválido en el respaldo.')
  if (new Set(focos.map((f) => f.fecha)).size !== focos.length) throw new Error('Hay dos focos para el mismo día.')

  if (!ideas.every((i) => esObjeto(i) && sonTextos(i, ['id', 'titulo', 'fecha']))) {
    throw new Error('Hay una idea inválida en el respaldo.')
  }
  if (new Set(ideas.map((i) => i.id)).size !== ideas.length) throw new Error('Hay ideas repetidas en el respaldo.')

  return datos as unknown as Respaldo
}

/** Reemplaza todos los datos. Es una sola transacción: si algo falla, queda todo como estaba. */
export function importar({ proyectos, focos, ideas }: Respaldo) {
  return db.transaction('rw', db.proyectos, db.focos, db.ideas, async () => {
    await Promise.all([db.proyectos.clear(), db.focos.clear(), db.ideas.clear()])
    await Promise.all([db.proyectos.bulkAdd(proyectos), db.focos.bulkAdd(focos), db.ideas.bulkAdd(ideas)])
  })
}
