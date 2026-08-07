import { useState, useEffect } from 'react';
import {
  SHEET_URLS,
  DEFAULT_TORNEOS, DEFAULT_CLUBES, DEFAULT_ESTADIOS, DEFAULT_ARBITROS,
  DEFAULT_OFICIALES_AFA, DEFAULT_CATEGORIAS, DEFAULT_MOTIVOS_INICIO, DEFAULT_MOTIVOS_ET,
  DEFAULT_FECHAS, OFICIAL_PINS,
} from './data';
import { pareceFechaRota } from './utils/fechasSheet';

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

// Hoja "Oficiales": cuatro columnas (Nombre | PIN | Perfil | Informes).
// Devuelve { pines: {NOMBRE: pin}, perfiles: {NOMBRE: 'ADMINISTRADOR'|'OFICIAL'},
// veInformes: {NOMBRE: true|false} }. Perfil e Informes son opcionales: si
// están vacías, se toman como 'OFICIAL' y sin acceso a Informes.
export function parsePinesCSV(texto) {
  const lineas = texto.split(/\r?\n/);
  const pines = {};
  const perfiles = {};
  const veInformes = {};
  for (let i = 1; i < lineas.length; i++) {
    const cols = lineas[i].split(',');
    const nombre = (cols[0] ?? '').trim().replace(/^"|"$/g, '').trim();
    const pin = (cols[1] ?? '').trim().replace(/^"|"$/g, '').trim();
    const perfil = (cols[2] ?? '').trim().replace(/^"|"$/g, '').trim().toUpperCase();
    const informes = (cols[3] ?? '').trim().replace(/^"|"$/g, '').trim().toUpperCase();
    if (nombre && pin) {
      pines[nombre.toUpperCase()] = pin;
      perfiles[nombre.toUpperCase()] = perfil === 'ADMINISTRADOR' ? 'ADMINISTRADOR' : 'OFICIAL';
      veInformes[nombre.toUpperCase()] = informes === 'SI';
    }
  }
  return { pines, perfiles, veInformes };
}


// Hoja de 2 columnas genérica: columna A = texto que se ve en la app,
// columna B = valor exacto que hay que usar al llenar el PDF (si está vacía,
// se usa la columna A tal cual). Devuelve { textoApp: valorPdf }.
export function parseMapaCSV(texto) {
  const lineas = texto.split(/\r?\n/);
  const mapa = {};
  for (let i = 1; i < lineas.length; i++) {
    const cols = lineas[i].split(',');
    const a = (cols[0] ?? '').trim().replace(/^"|"$/g, '').trim();
    const b = (cols[1] ?? '').trim().replace(/^"|"$/g, '').trim();
    // OJO: no tocar la mayúscula/minúscula acá. La clave tiene que calzar
    // exacto con el texto que llega de <option value>, y el valor tiene
    // que calzar exacto con la opción del desplegable fijo del PDF (que
    // es sensible a mayúscula/minúscula) — antes esto se guardaba todo en
    // MAYÚSCULA y por eso el campo de motivo nunca llegaba al PDF.
    if (a) mapa[a] = b || a;
  }
  return mapa;
}
// Hoja "Clubes": columna A = nombre, columna B = Categoria (A/B/C/D, opcional).
// Devuelve { NOMBRE: 'A'|'B'|'C'|'D'|'' }.
function parseClubesCategoriaCSV(texto) {
  const lineas = texto.split(/\r?\n/);
  const mapa = {};
  for (let i = 1; i < lineas.length; i++) {
    const cols = lineas[i].split(',');
    const nombre = (cols[0] ?? '').trim().replace(/^"|"$/g, '').trim();
    const categoria = (cols[1] ?? '').trim().replace(/^"|"$/g, '').trim();
    if (nombre) mapa[nombre.toUpperCase()] = categoria.toUpperCase();
  }
  return mapa;
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
    iniciales.perfiles = cacheInicial.perfiles || {};
    iniciales.veInformes = cacheInicial.veInformes || {};
    iniciales.clubesCategoria = cacheInicial.clubesCategoria || {};
    iniciales.motivosInicioMapa = cacheInicial.motivosInicioMapa
      || Object.fromEntries(DEFAULT_MOTIVOS_INICIO.filter(Boolean).map(m => [m.toUpperCase(), m.toUpperCase()]));
    iniciales.motivosETMapa = cacheInicial.motivosETMapa
      || Object.fromEntries(DEFAULT_MOTIVOS_ET.filter(Boolean).map(m => [m.toUpperCase(), m.toUpperCase()]));
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
          let valores = await fetchLista(url);
          if (clave === 'clubes') valores = valores.filter(v => !pareceFechaRota(v));
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

      // PINs, Perfiles e Informes: se leen de las columnas B, C y D de la
      // MISMA hoja "Oficiales" (A = nombre, B = PIN, C = Perfil, D = Informes),
      // no hace falta una pestaña aparte.
      if (SHEET_URLS.oficiales) {
        try {
          const res = await fetch(SHEET_URLS.oficiales, { cache: 'no-store' });
          if (res.ok) {
            const { pines, perfiles, veInformes } = parsePinesCSV(await res.text());
            if (Object.keys(pines).length > 0) {
              nuevasListas.pines = pines;
              nuevasListas.perfiles = perfiles;
              nuevasListas.veInformes = veInformes;
              cache.pines = pines;
              cache.perfiles = perfiles;
              cache.veInformes = veInformes;
              huboActualizacion = true;
            }
          }
        } catch {
          // sin conexión o error: se mantiene el respaldo/caché existente
        }
      }

      // Columna B de la hoja Clubes: categoría (A/B/C/D) de cada club, para
      // filtrar el listado según el torneo elegido.
      if (SHEET_URLS.clubes) {
        try {
          const res = await fetch(SHEET_URLS.clubes, { cache: 'no-store' });
          if (res.ok) {
            const mapa = parseClubesCategoriaCSV(await res.text());
            if (Object.keys(mapa).length > 0) {
              nuevasListas.clubesCategoria = mapa;
              cache.clubesCategoria = mapa;
              huboActualizacion = true;
            }
          }
        } catch {
          // sin conexión o error: se mantiene el respaldo/caché existente
        }
      }

      // Columna B de las hojas de Motivos (valor exacto para el PDF, además
      // del texto que se ve en la app en la columna A).
      for (const [clave, urlKey] of [['motivosInicioMapa', 'motivosInicio'], ['motivosETMapa', 'motivosET']]) {
        const url = SHEET_URLS[urlKey];
        if (!url) continue;
        try {
          const res = await fetch(url, { cache: 'no-store' });
          if (res.ok) {
            const mapa = parseMapaCSV(await res.text());
            if (Object.keys(mapa).length > 0) {
              nuevasListas[clave] = mapa;
              cache[clave] = mapa;
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
