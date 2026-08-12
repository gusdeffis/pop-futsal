import { APPS_SCRIPT_DATOS_URL } from './data';

export const HOJAS_EDITABLES = [
  { clave: 'Torneos', titulo: 'Torneos', columnas: ['Nombre'] },
  { clave: 'Clubes', titulo: 'Clubes', columnas: ['Nombre', 'CAT', 'Estadio'], anchos: [3, 0.6, 2.2] },
  { clave: 'Estadios', titulo: 'Estadios', columnas: ['Nombre'] },
  { clave: 'Arbitros', titulo: 'Árbitros', columnas: ['Nombre'] },
  { clave: 'Oficiales', titulo: 'Oficiales AFA', columnas: ['Oficial', 'PIN', 'ADM', 'INFO', 'Asignar'], anchos: [2, 0.52, 0.78, 0.8, 0.8] },
  { clave: 'Categorias', titulo: 'Categorías', columnas: ['Nombre'] },
  { clave: 'Motivos_Inicio', titulo: 'Motivos de Inicio', columnas: ['Texto en la app', 'Valor PDF'] },
  { clave: 'Motivos_ET', titulo: 'Motivos de ET', columnas: ['Texto en la app', 'Valor PDF'] },
  { clave: 'Fechas', titulo: 'Fechas', columnas: ['Nombre'] },
];

// Sin esto, si la conexión anda lenta o Apps Script tarda en responder, el
// fetch podía quedar esperando indefinidamente — con el aviso de "Buscando
// partidos asignados..." pegado en la pantalla para siempre, sin nunca
// pasar a mostrar el resultado ni el botón para reintentar. A los 20
// segundos se corta solo y se trata como un error de conexión normal.
async function fetchConTimeout(url, opciones = {}, msTimeout = 20000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), msTimeout);
  try {
    return await fetch(url, { ...opciones, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function obtenerListasAdmin() {
  if (!APPS_SCRIPT_DATOS_URL) return { ok: false, hojas: {} };
  try {
    const res = await fetchConTimeout(APPS_SCRIPT_DATOS_URL, { cache: 'no-store' });
    const json = await res.json();
    return { ok: !!json.ok, hojas: json.hojas || {} };
  } catch {
    return { ok: false, hojas: {} };
  }
}

// Reemplaza el contenido completo de una hoja puntual (sin encabezado) con
// las filas nuevas. `filas` es un array de arrays, ej: [['CLUB A'], ['CLUB B']].
export async function guardarListaAdmin(hoja, filas) {
  if (!APPS_SCRIPT_DATOS_URL) return false;
  try {
    const res = await fetch(APPS_SCRIPT_DATOS_URL, {
      method: 'POST',
      body: JSON.stringify({ hoja, filas }),
    });
    const json = await res.json();
    return !!json.ok;
  } catch {
    return false;
  }
}
