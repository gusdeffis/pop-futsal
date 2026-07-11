import { useState, useEffect } from 'react';
import {
  SHEET_URLS,
  DEFAULT_TORNEOS, DEFAULT_CLUBES, DEFAULT_ESTADIOS, DEFAULT_ARBITROS,
  DEFAULT_OFICIALES_AFA, DEFAULT_CATEGORIAS, DEFAULT_MOTIVOS_INICIO, DEFAULT_MOTIVOS_ET,
  DEFAULT_FECHAS, OFICIAL_PINS,
} from './data';

const CACHE_KEY = 'pop_listas_cache';

// Mapeo clave interna -> [urlKey en SHEET_URLS, lista por defecto, llevaBlancoInicial]
const CONFIG = {
  torneos: ['torneos', DEFAULT_TORNEOS, false],
  clubes: ['clubes', DEFAULT_CLUBES, false],
  estadios: ['estadios', DEFAULT_ESTADIOS, false],
  arbitros: ['arbitros', DEFAULT_ARBITROS, false],
  oficiales: ['oficiales', DEFAULT_OFICIALES_AFA, false],
  categorias: ['categorias', DEFAULT_CATEGORIAS, false],
  fechas: ['partidos', DEFAULT_FECHAS, false],
  motivosInicio: ['motivosInicio', DEFAULT_MOTIVOS_INICIO, true],
  motivosET: ['motivosET', DEFAULT_MOTIVOS_ET, true],
};

function parseCSVColumnaA(texto) {
  const lineas = texto.split(/\r?\n/);
  const valores = [];
  // Salta la primera línea (encabezado "Nombre")
  for (let i = 1; i < lineas.length; i++) {
    let v = lineas[i].split(',')[0] ?? '';
    v = v.trim().replace(/^"|"$/g, '').trim();
    if (v) valores.push(v.toUpperCase());
  }
  return valores;
}

// Hoja "PINs": dos columnas (Nombre | PIN). Devuelve un objeto { NOMBRE: pin }.
function parsePinesCSV(texto) {
  const lineas = texto.split(/\r?\n/);
  const pines = {};
  for (let i = 1; i < lineas.length; i++) {
    const cols = lineas[i].split(',');
    const nombre = (cols[0] ?? '').trim().replace(/^"|"$/g, '').trim();
    const pin = (cols[1] ?? '').trim().replace(/^"|"$/g, '').trim();
    if (nombre && pin) pines[nombre.toUpperCase()] = pin;
  }
  return pines;
}

function cargarCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function guardarCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage lleno o no disponible: seguimos sin caché
  }
}

async function fetchLista(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const texto = await res.text();
  return parseCSVColumnaA(texto);
}

export function useListas() {
  const cacheInicial = cargarCache();

  const [listas, setListas] = useState(() => {
    const iniciales = {};
    for (const [clave, [, def, blanco]] of Object.entries(CONFIG)) {
      const cacheada = cacheInicial[clave];
      const base = (cacheada && cacheada.length ? cacheada : def).map(v => v ? v.toUpperCase() : v);
      iniciales[clave] = blanco && base[0] !== '' ? ['', ...base] : base;
    }
    iniciales.pines = cacheInicial.pines || OFICIAL_PINS;
    return iniciales;
  });
  const [cargando, setCargando] = useState(true);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(cacheInicial.__timestamp || null);

  useEffect(() => {
    let activo = true;

    async function cargarTodas() {
      const cache = cargarCache();
      const nuevasListas = {};
      let huboActualizacion = false;

      await Promise.all(Object.entries(CONFIG).map(async ([clave, [urlKey, def, blanco]]) => {
        const url = SHEET_URLS[urlKey];
        if (!url) return; // pestaña todavía no publicada: se queda con el fallback
        try {
          const valores = await fetchLista(url);
          if (valores.length > 0) {
            const final = blanco ? ['', ...valores] : valores;
            nuevasListas[clave] = final;
            cache[clave] = valores;
            huboActualizacion = true;
          }
        } catch {
          // sin conexión o error de red: se mantiene la caché/fallback existente
        }
      }));

      // PINs: se leen de la columna B de la MISMA hoja "Oficiales" (columna A
      // = nombre, columna B = PIN), no hace falta una pestaña aparte.
      if (SHEET_URLS.oficiales) {
        try {
          const res = await fetch(SHEET_URLS.oficiales, { cache: 'no-store' });
          if (res.ok) {
            const pines = parsePinesCSV(await res.text());
            if (Object.keys(pines).length > 0) {
              nuevasListas.pines = pines;
              cache.pines = pines;
              huboActualizacion = true;
            }
          }
        } catch {
          // sin conexión o error: se mantiene el respaldo/caché existente
        }
      }

      if (activo && huboActualizacion) {
        cache.__timestamp = new Date().toISOString();
        guardarCache(cache);
        setListas(prev => ({ ...prev, ...nuevasListas }));
        setUltimaActualizacion(cache.__timestamp);
      }
      if (activo) setCargando(false);
    }

    cargarTodas();
    return () => { activo = false; };
  }, []);

  return { ...listas, cargando, ultimaActualizacion };
}
