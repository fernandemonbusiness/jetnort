// DATOS DE EJEMPLO: confirmar horarios, precios, duración y distribución de asientos con JETNORT.
export const CITIES = { OI: ['Oruro', 'Iquique'], IO: ['Iquique', 'Oruro'] }
export const SERVICES = {
  semicama: { name: 'Semicama', price: 200, rows: 10, per: 4, left: 2 }, // 2+2 (a confirmar)
  cama: { name: 'Cama', price: 260, rows: 10, per: 3, left: 2 }          // 2+1 (a confirmar)
}
// days: 0=domingo ... 6=sábado
export const TRIPS = [
  { id: 'OI-S', dir: 'OI', dep: '20:00', arr: '07:00 (+1)', svc: 'semicama', days: [0, 1, 2, 3, 4, 5, 6] },
  { id: 'OI-C', dir: 'OI', dep: '21:00', arr: '08:00 (+1)', svc: 'cama', days: [0, 1, 3, 5] },
  { id: 'IO-S', dir: 'IO', dep: '19:00', arr: '06:00 (+1)', svc: 'semicama', days: [0, 1, 2, 3, 4, 5, 6] },
  { id: 'IO-C', dir: 'IO', dep: '20:00', arr: '07:00 (+1)', svc: 'cama', days: [0, 2, 4, 6] }
]
// Asientos ocupados simulados (reemplazar por consulta a base de datos)
export function occupied(tripId, date, total) {
  let h = 2166136261
  for (const ch of tripId + date) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  const set = new Set()
  for (let i = 0; i < Math.floor(total * 0.35); i++) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) + i
    set.add((Math.abs(h) % total) + 1)
  }
  return set
}
