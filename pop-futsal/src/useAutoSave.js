import { useEffect } from 'react';
import { APPS_SCRIPT_PARTIDOS_URL } from './data';

const KEY = 'pop_partido_actual';
const KEY_HISTORIAL = 'pop_historial';
const KEY_LOGIN = 'pop_login';
const LOGIN_DURA_MS = 8 * 60 * 60 * 1000; // 8 horas sin actividad

// Guarda quién está identificado, con la hora. Se usa para no pedir el PIN
// de nuevo solo por cambiar de app o apagar la pantalla.
export function guardarLogin(nombre) {
  try { localStorage.setItem(KEY_LOGIN, JSON.stringify({ nombre, ts: Date.now() })); } catch {}
}

// Devuelve el nombre logueado si sigue vigente (menos de 8hs de inactividad),
// y de paso renueva el reloj. Si ya venció, lo borra y devuelve null.
export function cargarLogin() {
  try {
    const raw = localStorage.getItem(KEY_LOGIN);
    if (!raw) return null;
    const { nombre, ts } = JSON.parse(raw);
    if (Date.now() - ts > LOGIN_DURA_MS) {
      localStorage.removeItem(KEY_LOGIN);
      return null;
    }
    guardarLogin(nombre); // renueva el reloj: mientras se use, no vence
    return nombre;
  } catch {
    return null;
  }
}

export function borrarLogin() {
  localStorage.removeItem(KEY_LOGIN);
}

function guardarAhora(datos, pantalla) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      datos, pantalla, timestamp: new Date().toISOString(),
    }));
  } catch {
    // localStorage lleno o no disponible: se ignora, no es crítico
  }
}

export function useAutoSave(datos, pantalla, activo) {
  useEffect(() => {
    // Solo guarda cuando estamos realmente dentro de un partido (activo=true).
    // Si no, en la pantalla de inicio el estado "en blanco" por defecto
    // pisaría un partido guardado antes de que el usuario llegue a tocar
    // "Continuar Partido" — que es justo el bug que causaba la pérdida de datos.
    if (!activo) return;
    guardarAhora(datos, pantalla);
  }, [datos, pantalla, activo]);
}

export function guardarInmediato(datos, pantalla) {
  guardarAhora(datos, pantalla);
}

export function cargarGuardado() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function limpiarGuardado() {
  localStorage.removeItem(KEY);
}

// --- Historial de partidos finalizados ---

export function obtenerHistorial() {
  try {
    const raw = localStorage.getItem(KEY_HISTORIAL);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// Genera un identificador único y estable para un partido nuevo.
export function generarId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Guarda (o actualiza si ya existe) el partido actual en el historial, usando
// datos._id como identificador fijo (no se recalcula desde Torneo/Local/
// Visitante, así que editar esos campos no "pierde" la entrada original).
// Si datos no tiene _id todavía (partidos viejos, antes de este cambio), se
// arma uno de respaldo a partir de Torneo+Fecha+Local+Visitante.
export function guardarEnHistorial(datos, actaTexto, enviadoNube) {
  const historial = obtenerHistorial();
  const id = datos._id || `${datos.torneo}_${datos.fecha_nro}_${datos.local}_${datos.visitante}`.replace(/\s+/g, '_');
  const previa = historial.find(h => h.id === id);
  const entrada = {
    id,
    timestamp: new Date().toISOString(),
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
    enviadoNube: enviadoNube !== undefined ? !!enviadoNube : !!previa?.enviadoNube,
    fechaEnvioNube: previa?.fechaEnvioNube,
  };
  const sinDuplicado = historial.filter(h => h.id !== id);
  sinDuplicado.unshift(entrada);
  localStorage.setItem(KEY_HISTORIAL, JSON.stringify(sinDuplicado.slice(0, 200)));
  return id;
}

// Marca (o desmarca) una entrada existente del historial como enviada a la
// planilla compartida, con la fecha exacta del envío.
export function marcarEnviadoNube(id, enviado) {
  const historial = obtenerHistorial();
  const actualizado = historial.map(h => h.id === id
    ? { ...h, enviadoNube: !!enviado, fechaEnvioNube: enviado ? new Date().toISOString() : h.fechaEnvioNube }
    : h);
  localStorage.setItem(KEY_HISTORIAL, JSON.stringify(actualizado));
}

// Manda el partido finalizado a la planilla compartida "POPA-2026-Partidos"
// (vía Apps Script). Devuelve true/false según si se pudo mandar o no; si
// falla no rompe nada, el partido ya quedó guardado en el historial local igual.
export async function enviarAPlanillaCompartida(datos, actaTexto, oficialLogueado) {
  if (!APPS_SCRIPT_PARTIDOS_URL) return false;
  try {
    const res = await fetch(APPS_SCRIPT_PARTIDOS_URL, {
      method: 'POST',
      body: JSON.stringify({ ...datos, acta_texto: actaTexto, oficial_logueado: oficialLogueado }),
    });
    const json = await res.json();
    return !!json.ok;
  } catch {
    // sin conexión o error de red: el partido igual quedó en el historial local
    return false;
  }
}
