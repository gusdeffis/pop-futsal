import { useEffect, useRef } from 'react';
import { APPS_SCRIPT_PARTIDOS_URL } from './data';

const KEY = 'pop_partido_actual';
const KEY_HISTORIAL = 'pop_historial';

function guardarAhora(datos, pantalla) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      datos, pantalla, timestamp: new Date().toISOString(),
    }));
  } catch {
    // localStorage lleno o no disponible: se ignora, no es crítico
  }
}

export function useAutoSave(datos, pantalla) {
  const pantallaAnterior = useRef(pantalla);

  useEffect(() => {
    // Si lo que cambió fue la pantalla (navegación Siguiente/Atrás), se guarda
    // al instante, sin esperar el debounce, para no perder nada si se cierra la app.
    if (pantallaAnterior.current !== pantalla) {
      pantallaAnterior.current = pantalla;
      guardarAhora(datos, pantalla);
      return;
    }
    // Si lo que cambió fue un campo (tipeo), se espera un poco para no escribir
    // en cada tecla.
    const timer = setTimeout(() => guardarAhora(datos, pantalla), 400);
    return () => clearTimeout(timer);
  }, [datos, pantalla]);
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

// Guarda (o actualiza si ya existe) el partido actual en el historial.
// Se llama al llegar a la pantalla de Acta / generar PDF / compartir.
export function guardarEnHistorial(datos, actaTexto, enviadoNube) {
  const historial = obtenerHistorial();
  const id = `${datos.torneo}_${datos.fecha_nro}_${datos.local}_${datos.visitante}`.replace(/\s+/g, '_');
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
    datos,
    enviadoNube: !!enviadoNube,
  };
  const sinDuplicado = historial.filter(h => h.id !== id);
  sinDuplicado.unshift(entrada);
  localStorage.setItem(KEY_HISTORIAL, JSON.stringify(sinDuplicado.slice(0, 200)));
  return id;
}

// Marca (o desmarca) una entrada existente del historial como enviada a la
// planilla compartida, sin tocar el resto de sus datos.
export function marcarEnviadoNube(id, enviado) {
  const historial = obtenerHistorial();
  const actualizado = historial.map(h => h.id === id ? { ...h, enviadoNube: !!enviado } : h);
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
