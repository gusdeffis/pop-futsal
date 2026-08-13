import { APPS_SCRIPT_DATOS_URL } from './data';

export const HOJAS_EDITABLES = [
  { clave: 'Torneos', titulo: 'Torneos', columnas: ['Nombre'] },
  { clave: 'Clubes', titulo: 'Clubes', columnas: ['Nombre', 'CAT', 'Estadio'], anchos: [3, 0.6, 2.2] },
  { clave: 'Estadios', titulo: 'Estadios', columnas: ['Nombre'] },
  { clave: 'Arbitros', titulo: 'Árbitros', columnas: ['Nombre'] },
  { clave: 'Oficiales', titulo: 'Usuarios', columnas: ['Oficial', 'PIN', 'ADM', 'INFO', 'Asignar'], anchos: [2, 0.52, 0.78, 0.8, 0.8] },
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

// Punto: Fixture es la única hoja que crece de verdad con el tiempo (más
// aún si a futuro se suman divisionales B/C/D y sus femeninos) — pedirla
// siempre junto con el resto (chico y estable) hacía que la carga de
// Editar Listas se pusiera cada vez más lenta con el tiempo, sin motivo
// para las otras 9 hojas. Parámetros opcionales, ambos ignorados si no se
// pasan (se sigue trayendo todo, compatible con quien ya lo usaba así):
//   sinFixture: true  → trae todo MENOS Fixture (arranque liviano)
//   soloHoja: 'Fixture' → trae SOLO esa hoja puntual
export async function obtenerListasAdmin({ sinFixture, soloHoja } = {}) {
  if (!APPS_SCRIPT_DATOS_URL) return { ok: false, hojas: {} };
  try {
    const params = new URLSearchParams();
    if (soloHoja) params.set('hoja', soloHoja);
    else if (sinFixture) params.set('sinFixture', '1');
    const query = params.toString();
    const url = query ? `${APPS_SCRIPT_DATOS_URL}?${query}` : APPS_SCRIPT_DATOS_URL;
    // 45 segundos acá (no los 20 de otros lugares): esto trae varias hojas
    // de POP-Datos de un solo viaje (Fixture y Árbitros son las más
    // pesadas), y un límite pensado para una carga chica le cortaba la
    // espera antes de tiempo — caso real: el link directo al Apps Script
    // sí traía los datos bien, pero tardaba más de 20 segundos.
    const res = await fetchConTimeout(url, { cache: 'no-store' }, 45000);
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
    // Mismo motivo que arriba: guardar Fixture completo (muchas filas) más
    // el bloqueo (LockService) del lado del Apps Script pueden tardar más
    // que 20 segundos en un caso normal, no solo en uno colgado de verdad.
    const res = await fetchConTimeout(APPS_SCRIPT_DATOS_URL, {
      method: 'POST',
      body: JSON.stringify({ hoja, filas }),
    }, 45000);
    const json = await res.json();
    return !!json.ok;
  } catch {
    return false;
  }
}
