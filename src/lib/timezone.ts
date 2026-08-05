/**
 * Utilidades de timezone para Argentina (America/Argentina/Buenos_Aires)
 * Argentina no tiene horario de verano — siempre UTC-3.
 */

export const AR_TZ = 'America/Argentina/Buenos_Aires'

/**
 * Retorna el inicio del día actual en Argentina como UTC Date.
 * Ej: si son las 01:00 UTC del 5/08 → en Argentina es 22:00 del 4/08
 *     → devuelve el inicio del 4/08 en Argentina = 03:00 UTC del 4/08
 */
export function getArgentinaTodayStart(): Date {
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: AR_TZ }).format(new Date())
  return new Date(todayStr + 'T00:00:00-03:00')
}

/**
 * Retorna el inicio de N días atrás en Argentina como UTC Date.
 */
export function getArgentinaDaysAgoStart(days: number): Date {
  const todayStart = getArgentinaTodayStart()
  return new Date(todayStart.getTime() - days * 24 * 60 * 60 * 1000)
}

/**
 * Formatea una fecha ISO en hora local Argentina para mostrar al usuario.
 */
export function formatTimeAR(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: AR_TZ,
  })
}

/**
 * Retorna la clave de agrupación de día para una fecha ISO (en timezone Argentina).
 */
export function formatDayKeyAR(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: AR_TZ,
  })
}
