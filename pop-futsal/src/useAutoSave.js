import { useEffect } from 'react';

const KEY = 'pop_partido_actual';
const KEY_HISTORIAL = 'pop_historial';

export function useAutoSave(datos, pantalla) {
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(KEY, JSON.stringify({
        datos,
        pantalla,
        timestamp: new Date().toISOString(),
      }));
    }, 500);
    return () => clearTimeout(timer);
  }, [datos, pantalla]);
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
export function guardarEnHistorial(datos, actaTexto) {
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
  };
  const sinDuplicado = historial.filter(h => h.id !== id);
  sinDuplicado.unshift(entrada);
  localStorage.setItem(KEY_HISTORIAL, JSON.stringify(sinDuplicado.slice(0, 200)));
}
