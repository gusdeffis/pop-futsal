import { useEffect } from 'react';
import { APPS_SCRIPT_PARTIDOS_URL } from './data';
import { generarActaTexto } from './utils/acta';

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

export function useAutoSave(datos, pantalla, activo) {
  useEffect(() => {
    if (!activo) return;
    guardarActivo(datos, pantalla);
  }, [datos, pantalla, activo]);
}

export function guardarInmediato(datos, pantalla) {
  guardarActivo(datos, pantalla);
}

// --- Envío a la planilla compartida ---

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
    return false;
  }
}
