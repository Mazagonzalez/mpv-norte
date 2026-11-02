import { db, MAX_ACTIVOS, type Idea, type Proyecto } from './db'
import { fechaLocal } from './fecha'

// Las reglas del sistema viven aquí, dentro de transacciones: la interfaz solo las refleja.

async function exigirCupo() {
  const activos = await db.proyectos.where('estado').equals('activo').count()
  if (activos >= MAX_ACTIVOS) {
    throw new Error(`Ya tienes ${MAX_ACTIVOS} proyectos activos. Decide sobre uno para liberar cupo.`)
  }
}

function proyectoNuevo(datos: Pick<Proyecto, 'nombre' | 'porQue' | 'siguientePaso' | 'estado'>): Proyecto {
  const ahora = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    nombre: datos.nombre.trim(),
    porQue: datos.porQue.trim(),
    siguientePaso: datos.siguientePaso.trim(),
    estado: datos.estado,
    notaPausa: '',
    aprendizaje: '',
    creadoEn: ahora,
    actualizadoEn: ahora,
  }
}

export function crearProyecto(datos: Pick<Proyecto, 'nombre' | 'porQue' | 'siguientePaso'>, estado: 'activo' | 'estacionado') {
  return db.transaction('rw', db.proyectos, async () => {
    if (estado === 'activo') await exigirCupo()
    await db.proyectos.add(proyectoNuevo({ ...datos, estado }))
  })
}

export function actualizarSiguientePaso(id: string, siguientePaso: string) {
  return db.proyectos.update(id, { siguientePaso: siguientePaso.trim(), actualizadoEn: new Date().toISOString() })
}

/** Saca un proyecto de activo. Si era el foco pendiente de hoy, ese foco ya no tiene sentido y se quita. */
function decidir(id: string, cambios: Partial<Proyecto>) {
  return db.transaction('rw', db.proyectos, db.focos, async () => {
    await db.proyectos.update(id, { ...cambios, actualizadoEn: new Date().toISOString() })
    const foco = await db.focos.get(fechaLocal())
    if (foco && foco.proyectoId === id && !foco.hecho) await db.focos.delete(foco.fecha)
  })
}

export const pausar = (id: string, notaPausa: string) => decidir(id, { estado: 'pausado', notaPausa: notaPausa.trim() })
export const estacionar = (id: string) => decidir(id, { estado: 'estacionado' })
export const cerrar = (id: string, aprendizaje: string) => decidir(id, { estado: 'cerrado', aprendizaje: aprendizaje.trim() })
export const terminar = (id: string) => decidir(id, { estado: 'terminado' })

export function reanudar(id: string, siguientePaso: string) {
  return db.transaction('rw', db.proyectos, async () => {
    await exigirCupo()
    await db.proyectos.update(id, {
      estado: 'activo',
      siguientePaso: siguientePaso.trim(),
      notaPausa: '',
      actualizadoEn: new Date().toISOString(),
    })
  })
}

export function capturarIdea(titulo: string) {
  return db.ideas.add({ id: crypto.randomUUID(), titulo: titulo.trim(), fecha: new Date().toISOString() })
}

export function activarIdea(idea: Idea, porQue: string) {
  return db.transaction('rw', db.proyectos, db.ideas, async () => {
    await exigirCupo()
    await db.proyectos.add(proyectoNuevo({ nombre: idea.titulo, porQue, siguientePaso: '', estado: 'activo' }))
    await db.ideas.delete(idea.id)
  })
}
