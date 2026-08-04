import { APPS_SCRIPT_DATOS_URL } from './data';

export const HOJAS_EDITABLES = [
  { clave: 'Torneos', titulo: 'Torneos', columnas: ['Nombre'] },
  { clave: 'Clubes', titulo: 'Clubes', columnas: ['Nombre'] },
  { clave: 'Estadios', titulo: 'Estadios', columnas: ['Nombre'] },
  { clave: 'Arbitros', titulo: 'Árbitros', columnas: ['Nombre'] },
  { clave: 'Oficiales', titulo: 'Oficiales AFA', columnas: ['Nombre', 'PIN', 'Perfil'] },
  { clave: 'Categorias', titulo: 'Categorías', columnas: ['Nombre'] },
  { clave: 'Motivos_Inicio', titulo: 'Motivos de Inicio', columnas: ['Texto en la app', 'Valor PDF'] },
  { clave: 'Motivos_ET', titulo: 'Motivos de ET', columnas: ['Texto en la app', 'Valor PDF'] },
  { clave: 'Fechas', titulo: 'Fechas', columnas: ['Nombre'] },
];

export async function obtenerListasAdmin() {
  if (!APPS_SCRIPT_DATOS_URL) return { ok: false, hojas: {} };
  try {
    const res = await fetch(APPS_SCRIPT_DATOS_URL, { cache: 'no-store' });
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
