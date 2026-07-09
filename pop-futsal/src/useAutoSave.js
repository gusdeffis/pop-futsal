import { useEffect } from 'react';

const KEY = 'pop_partido_actual';

export function useAutoSave(datos) {
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(KEY, JSON.stringify({
        datos,
        timestamp: new Date().toISOString(),
      }));
    }, 500);
    return () => clearTimeout(timer);
  }, [datos]);
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
