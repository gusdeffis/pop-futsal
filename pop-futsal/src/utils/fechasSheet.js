// La planilla compartida devuelve Fecha/Hora como Date de Google Sheets
// serializado a ISO (ej: "2026-07-11T03:00:00.000Z"). Estas funciones lo
// convierten al formato legible DD/MM/AAAA y HH:MM, usando horas UTC porque
// así fueron serializadas (evita corrimientos de huso horario).
// Compartido entre PantallaAdmin y PantallaInformes para que ambas
// pantallas interpreten las fechas exactamente igual.

// Si Sheets malinterpretó el nombre de un club como fecha (pasó con "17 DE
// AGOSTO"), el CSV publicado exporta un valor sin ninguna letra (una fecha
// tipo "2026-08-17" o "8/17/2026", o un número de serie). Un nombre de club
// real siempre tiene letras, así que esto alcanza para detectar el caso sin
// falsos positivos.
export function pareceFechaRota(v) {
  return !/[a-zA-Z]/.test(v);
}

export function esISO(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v);
}

// A veces una celda de fecha/hora queda tan angosta en Excel/Sheets que
// muestra "#########" en vez del valor — y si alguien copia/pega ese
// estado visual en lugar del valor real, ese texto de puro símbolo queda
// guardado tal cual. No es una fecha ni una hora real: se filtra para no
// mostrarlo crudo en la app (la celda de origen igual hay que corregirla
// a mano, esto solo evita que se vea roto mientras tanto).
function esBasuraDeCelda(v) {
  return typeof v === 'string' && v.trim() !== '' && !/[a-zA-Z0-9]/.test(v);
}

export function formatearDia(v) {
  if (!v || esBasuraDeCelda(v)) return '';
  if (!esISO(v)) return v;
  const d = new Date(v);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

export function formatearHora(v) {
  if (!v || esBasuraDeCelda(v)) return '';
  if (!esISO(v)) return v;
  const d = new Date(v);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

// Clave normalizada del día en formato "AAAA-MM-DD" (ignora cualquier hora
// que venga pegada en la misma celda). Al ser AAAA-MM-DD, compararla como
// texto ya ordena cronológicamente — sirve tanto para agrupar en
// desplegables como para filtrar por rango de fechas.
export function claveDia(v) {
  if (esBasuraDeCelda(v)) return '';
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
