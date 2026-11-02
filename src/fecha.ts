/** Día local YYYY-MM-DD. No usar toISOString: en UTC el día cambia a media tarde/noche. */
export function fechaLocal(fecha = new Date()): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${dia}`
}
