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

// Bug real corregido: valorFecha/claveDia solo sabían interpretar 2
// formatos (número serial, o fecha-ISO de la API) — el caso MÁS COMÚN de
// todos, una fecha ya escrita como texto plano "DD/MM/AAAA" (que es como
// queda la mayoría de los partidos, incluso los cargados bien desde la
// app), no estaba contemplado y devolvía -Infinity ("sin fecha", al fondo
// de cualquier orden) — por eso la lista de Panel Administrador se veía
// desordenada: solo los partidos con fecha en un formato "raro" quedaban
// bien ubicados, y los normales (la mayoría) quedaban revueltos al final.
function parseTextoDDMMAAAA(v) {
  if (typeof v !== 'string') return null;
  const m = v.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const dia = Number(m[1]), mes = Number(m[2]), anio = Number(m[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  return Date.UTC(anio, mes - 1, dia);
}

// Bug real corregido: muchos partidos viejos tienen Día/Hora guardados como
// NÚMERO puro de Sheets/Excel (el mismo motivo por el que la celda se ve
// como "#########" — número real, columna angosta), no como texto ni como
// fecha-ISO. Antes esto no se reconocía y devolvía el número crudo (o
// quedaba vacío según el caso) en vez de la fecha/hora legible. El "día 0"
// de Sheets es el 30/12/1899 (con el bug histórico de año bisiesto de
// Lotus 1-2-3, que Sheets hereda a propósito para ser compatible con
// Excel) — la parte entera son los días desde ahí, la parte decimal es la
// hora del día.
function esSerialSheets(v) {
  return typeof v === 'number' && Number.isFinite(v);
}
const EPOCH_SHEETS_MS = Date.UTC(1899, 11, 30);
function desdeSerialSheets(v) {
  return new Date(EPOCH_SHEETS_MS + v * 86400000);
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
  if (esSerialSheets(v)) {
    const d = desdeSerialSheets(v);
    return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
  }
  if (!v || esBasuraDeCelda(v)) return '';
  if (!esISO(v)) return v;
  const d = new Date(v);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

export function formatearHora(v) {
  if (esSerialSheets(v)) {
    const d = desdeSerialSheets(v);
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  }
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
  if (esSerialSheets(v)) {
    const d = desdeSerialSheets(v);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }
  const textoMs = parseTextoDDMMAAAA(v);
  if (textoMs !== null) {
    const d = new Date(textoMs);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }
  if (esBasuraDeCelda(v)) return '';
  if (!esISO(v)) return v || '';
  const d = new Date(v);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// Valor numérico comparable a partir del Día (para ordenar cronológicamente).
// Si no se puede interpretar como fecha, va al final.
export function valorFecha(v) {
  if (esSerialSheets(v)) return desdeSerialSheets(v).getTime();
  const textoMs = parseTextoDDMMAAAA(v);
  if (textoMs !== null) return textoMs;
  if (!esISO(v)) return -Infinity;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? -Infinity : t;
}
