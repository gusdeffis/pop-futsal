import { useEffect } from 'react';
import { APPS_SCRIPT_PARTIDOS_URL } from './data';
import { generarActaTexto } from './utils/acta';
import { calcularSinBalonBackup } from './utils/pdfFiller';

// Mismo motivo que en useListasAdmin.js: sin un límite de tiempo, un fetch
// lento podía dejar pantallas como "Buscando partidos asignados..." pegadas
// para siempre, sin nunca mostrar el resultado ni el botón de reintentar.
async function fetchConTimeout(url, opciones = {}, msTimeout = 20000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), msTimeout);
  try {
    return await fetch(url, { ...opciones, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

const KEY_HISTORIAL = 'pop_historial';
const KEY_PUNTERO = 'pop_puntero_activo';
const KEY_LOGIN = 'pop_login';
const LOGIN_DURA_MS = 8 * 60 * 60 * 1000; // 8 horas sin actividad

// --- Login persistente ---

export function guardarLogin(nombre) {
  try { localStorage.setItem(KEY_LOGIN, JSON.stringify({ nombre, ts: Date.now() })); } catch {}
}

export function cargarLogin() {
  try {
    const raw = localStorage.getItem(KEY_LOGIN);
    if (!raw) return null;
    const { nombre, ts } = JSON.parse(raw);
    if (Date.now() - ts > LOGIN_DURA_MS) {
      localStorage.removeItem(KEY_LOGIN);
      return null;
    }
    guardarLogin(nombre);
    return nombre;
  } catch {
    return null;
  }
}

export function borrarLogin() {
  localStorage.removeItem(KEY_LOGIN);
}

// --- Historial: acá vive TODO partido, en curso o finalizado. No hay un
// "cajón único" separado que se pueda pisar al tocar otro partido por error.

export function obtenerHistorial() {
  try {
    const raw = localStorage.getItem(KEY_HISTORIAL);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function generarId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Guarda (o actualiza) un partido en el historial usando datos._id como
// identificador fijo. `estado` es 'en_curso' o 'finalizado'; si no se pasa,
// se conserva el que ya tenía (o 'en_curso' si es la primera vez).
export function guardarEnHistorial(datos, actaTexto, opciones = {}) {
  const historial = obtenerHistorial();
  const id = datos._id || `${datos.torneo}_${datos.fecha_nro}_${datos.local}_${datos.visitante}`.replace(/\s+/g, '_');
  const previa = historial.find(h => h.id === id);
  const entrada = {
    id,
    timestamp: new Date().toISOString(),
    estado: opciones.estado || previa?.estado || 'en_curso',
    torneo: datos.torneo,
    fecha_nro: datos.fecha_nro,
    cat: datos.cat,
    dia: datos.dia,
    local: datos.local,
    visitante: datos.visitante,
    res_local: datos.res_local,
    res_visitante: datos.res_visitante,
    conclusiones: datos.conclusiones,
    actaTexto,
    datos: { ...datos, _id: id },
    enviadoNube: opciones.enviadoNube !== undefined ? !!opciones.enviadoNube : !!previa?.enviadoNube,
    fechaEnvioNube: previa?.fechaEnvioNube,
  };
  const sinDuplicado = historial.filter(h => h.id !== id);
  sinDuplicado.unshift(entrada);
  localStorage.setItem(KEY_HISTORIAL, JSON.stringify(sinDuplicado.slice(0, 200)));
  return id;
}

export function marcarEnviadoNube(id, enviado) {
  const historial = obtenerHistorial();
  const actualizado = historial.map(h => h.id === id
    ? { ...h, enviadoNube: !!enviado, fechaEnvioNube: enviado ? new Date().toISOString() : h.fechaEnvioNube }
    : h);
  localStorage.setItem(KEY_HISTORIAL, JSON.stringify(actualizado));
}

// Registra CADA intento de envío (haya salido bien, mal, o quedado sin
// confirmar) — separado de marcarEnviadoNube, que solo se llama si la
// respuesta del servidor llegó y confirmó. Sirve para avisar si se intenta
// reenviar muy poco después de un intento anterior, aunque la tarjeta
// todavía no se haya puesto en verde (justo el caso que generó un partido
// duplicado: la respuesta del primer envío no llegó a tiempo al celular).
export function marcarIntentoEnvio(id) {
  const historial = obtenerHistorial();
  const actualizado = historial.map(h => h.id === id ? { ...h, ultimoIntentoEnvio: new Date().toISOString() } : h);
  localStorage.setItem(KEY_HISTORIAL, JSON.stringify(actualizado));
}

// --- Puntero al último partido tocado: solo un id + en qué pantalla se
// quedó. Los datos reales viven en el Historial, esto es nada más que un
// "marcapáginas" para que "Continuar Partido" sepa a cuál ir.

function guardarPuntero(id, pantalla) {
  try { localStorage.setItem(KEY_PUNTERO, JSON.stringify({ id, pantalla })); } catch {}
}

export function limpiarPuntero() {
  localStorage.removeItem(KEY_PUNTERO);
}

// Devuelve { datos, pantalla } del último partido en curso tocado, buscando
// sus datos reales en el Historial (o null si no hay nada pendiente).
export function cargarGuardado() {
  try {
    const raw = localStorage.getItem(KEY_PUNTERO);
    if (!raw) return null;
    const { id, pantalla } = JSON.parse(raw);
    const entrada = obtenerHistorial().find(h => h.id === id && h.estado === 'en_curso');
    if (!entrada) return null;
    return { datos: entrada.datos, pantalla: pantalla || 1 };
  } catch {
    return null;
  }
}

// Guarda el partido activo: actualiza su entrada en el Historial (conserva
// el estado que ya tenía — en_curso o finalizado) y mueve el puntero a él.
// Editar un partido ya finalizado también actualiza su registro local; lo
// único que exige un "Finalizar Partido" explícito es el reenvío a la nube.
function guardarActivo(datos, pantalla) {
  if (!datos._id) return;
  guardarEnHistorial(datos, generarActaTexto(datos));
  guardarPuntero(datos._id, pantalla);
}

// --- Envío automático "EN CURSO" a la planilla compartida ---
// Mientras el partido se carga, se manda solo a la planilla (marcado
// "EN CURSO"), así el administrador lo ve desde cualquier aparato aunque
// el oficial nunca toque "Finalizar Partido" o cambie de celular. Reglas:
// - solo partidos EN CURSO (uno ya finalizado se reenvía únicamente con
//   "Finalizar Partido", como siempre);
// - solo cuando ya tiene Local y Visitante (no manda filas vacías);
// - espera DEMORA_ENVIO_MS sin cambios antes de mandar (no manda en cada
//   tecla), y no repite si los datos no cambiaron desde el último envío;
// - al salir de la app se manda al instante.
// El script de la planilla NUNCA deja que un envío "EN CURSO" pise un
// partido que ya figura "FINALIZADO".
const DEMORA_ENVIO_MS = 15000;
let timerEnvio = null;
let ultimoEnviado = {}; // id -> firma de los datos ya enviados

function estaEnCurso(id) {
  const h = obtenerHistorial().find(x => x.id === id);
  return !h || h.estado !== 'finalizado';
}

function listoParaEnviar(datos) {
  return !!(datos && datos._id && String(datos.local || '').trim() && String(datos.visitante || '').trim());
}

async function enviarEnCurso(datos, oficialLogueado, { alSalir = false } = {}) {
  if (!listoParaEnviar(datos) || !estaEnCurso(datos._id)) return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  const firma = JSON.stringify(datos);
  if (ultimoEnviado[datos._id] === firma) return true;
  const acta = (datos.conclusiones || []).length ? generarActaTexto(datos) : '';
  const ok = await enviarAPlanillaCompartida(datos, acta, oficialLogueado, { estado: 'EN CURSO', keepalive: alSalir });
  if (ok) ultimoEnviado[datos._id] = firma;
  return ok;
}

export function programarEnvioEnCurso(datos, oficialLogueado) {
  if (timerEnvio) clearTimeout(timerEnvio);
  timerEnvio = null;
  if (!listoParaEnviar(datos)) return;
  timerEnvio = setTimeout(() => { timerEnvio = null; enviarEnCurso(datos, oficialLogueado); }, DEMORA_ENVIO_MS);
}

export function enviarEnCursoYa(datos, oficialLogueado) {
  if (timerEnvio) clearTimeout(timerEnvio);
  timerEnvio = null;
  return enviarEnCurso(datos, oficialLogueado, { alSalir: true });
}

// Al finalizar: se cancela cualquier envío "EN CURSO" pendiente.
export function cancelarEnvioEnCurso() {
  if (timerEnvio) clearTimeout(timerEnvio);
  timerEnvio = null;
}

// Solo para pruebas automáticas.
export function _reiniciarEnvioEnCurso() { cancelarEnvioEnCurso(); ultimoEnviado = {}; }

export function useAutoSave(datos, pantalla, activo, oficialLogueado) {
  useEffect(() => {
    if (!activo) return;
    guardarActivo(datos, pantalla);
    programarEnvioEnCurso(datos, oficialLogueado);
  }, [datos, pantalla, activo, oficialLogueado]);
}

export function guardarInmediato(datos, pantalla, oficialLogueado) {
  guardarActivo(datos, pantalla);
  enviarEnCursoYa(datos, oficialLogueado);
}

// Fila de la planilla que todavía está "EN CURSO" (no finalizada). Las filas
// viejas no tienen la columna Estado: cuentan como finalizadas.
export function esEnCursoNube(p) {
  return String((p && p['Estado']) || '').trim().toUpperCase() === 'EN CURSO';
}

// --- Perfil Administrador: trae TODOS los partidos de la planilla
// compartida (no solo los guardados en este celular). Usa el mismo Apps
// Script de siempre, ahora con doGet agregado.

export async function obtenerTodosLosPartidos() {
  if (!APPS_SCRIPT_PARTIDOS_URL) return { ok: false, partidos: [] };
  try {
    const res = await fetchConTimeout(APPS_SCRIPT_PARTIDOS_URL, { cache: 'no-store' });
    const json = await res.json();
    return { ok: !!json.ok, partidos: json.partidos || [] };
  } catch {
    return { ok: false, partidos: [] };
  }
}

// --- Envío a la planilla compartida ---

// `estado`: 'FINALIZADO' (por defecto: Finalizar Partido / Subir) o
// 'EN CURSO' (envío automático mientras se carga).
export async function enviarAPlanillaCompartida(datos, actaTexto, oficialLogueado, { estado = 'FINALIZADO', keepalive = false } = {}) {
  if (!APPS_SCRIPT_PARTIDOS_URL) return false;
  try {
    // Punto pedido: "Sin balón de back-up" tiene 2 controles independientes
    // en la app (el checkbox de la pantalla de Incidentes, y "Balón
    // Back-up" de Control Previo) — pero a la planilla compartida debe
    // viajar UN SOLO valor combinado en la columna "sin_balon", como si se
    // hubiera tildado ahí, sin importar cuál de los 2 detectó el problema.
    const payload = { ...datos, sin_balon: calcularSinBalonBackup(datos), acta_texto: actaTexto, oficial_logueado: oficialLogueado, estado_envio: estado };
    const res = await fetch(APPS_SCRIPT_PARTIDOS_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      keepalive,
    });
    const json = await res.json();
    return !!json.ok;
  } catch {
    return false;
  }
}
