// La planilla compartida devuelve Fecha/Hora como Date de Google Sheets
// serializado a ISO (ej: "2026-07-11T03:00:00.000Z"). Estas funciones lo
// convierten al formato legible DD/MM/AAAA y HH:MM, usando horas UTC porque
// así fueron serializadas (evita corrimientos de huso horario).
// Compartido entre PantallaAdmin y PantallaInformes para que ambas
// pantallas interpreten las fechas exactamente igual.

export function esISO(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v);
}

export function formatearDia(v) {
  if (!v) return '';
  if (!esISO(v)) return v;
  const d = new Date(v);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

export function formatearHora(v) {
  if (!v) return '';
  if (!esISO(v)) return v;
  const d = new Date(v);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

// Clave normalizada del día en formato "AAAA-MM-DD" (ignora cualquier hora
// que venga pegada en la misma celda). Al ser AAAA-MM-DD, compararla como
// texto ya ordena cronológicamente — sirve tanto para agrupar en
// desplegables como para filtrar por rango de fechas.
export function claveDia(v) {
  if (!esISO(v)) return v || '';
  const d = new Date(v);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// Valor numérico comparable a partir del Día (para ordenar cronológicamente).
// Si no se puede interpretar como fecha, va al final.
export function valorFecha(v) {
  if (!esISO(v)) return -Infinity;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? -Infinity : t;
}
