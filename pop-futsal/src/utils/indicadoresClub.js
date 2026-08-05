import { esISO, claveDia } from './fechasSheet';

// Calcula los indicadores por club (Partidos, Demora en Inicio, Entretiempos,
// Incidentes, Observación en Instalaciones, Controles Previos) a partir de
// los partidos que trae la planilla compartida "POP-Partidos".
//
// Convención: cada partido "toca" dos veces — una para el club Local y otra
// para el Visitante — igual que ya hace la hoja "Ayuda_Detalle" del tablero
// de Looker Studio. Por eso el total de "Partidos" es el doble de la
// cantidad real de partidos cargados (cada uno cuenta para sus dos clubes).

const UMBRAL_DEMORA_MIN = 1; // > 1 minuto ya cuenta como demora (mismo criterio que el resto de la app)
const ET_LIMITE_MIN = 11; // mismo límite que usa Pantalla3 para "excedido"

const COLUMNAS_OBS_INSTALACIONES = ['Tablero con Fallas', 'Iluminación Obs.', 'Humedad', 'Goteras', 'Arcos/Redes', 'Tribunas'];

// Minutos desde medianoche. Acepta "HH:MM" de texto o una fecha ISO (Google
// Sheets a veces serializa las celdas de hora como fecha con el epoch
// 1899-12-30, igual que ya vimos con el campo "Hora" del Panel Administrador).
function minutosDesdeMedianoche(v) {
  if (!v) return null;
  if (esISO(v)) {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  }
  if (typeof v === 'string' && v.includes(':')) {
    const [h, m] = v.split(':').map(Number);
    if ([h, m].some(Number.isNaN)) return null;
    return h * 60 + m;
  }
  return null;
}

function esSi(v) {
  return String(v || '').trim().toUpperCase() === 'SI';
}

// Desvío del comienzo real contra la hora pactada. Si falta alguno de los
// dos datos, se toma como 0 (no penaliza al club por falta de carga).
export function demoraInicioMin(p) {
  const hora = minutosDesdeMedianoche(p['Hora']);
  const real = minutosDesdeMedianoche(p['Hora Inicio Real']);
  if (hora === null || real === null) return 0;
  return Math.max(0, real - hora);
}

function tuvoIncidente(p) {
  return esSi(p['Incidentes']) || esSi(p['Agresiones']) || esSi(p['Gresca Generalizada']);
}

function tuvoObsInstalaciones(p) {
  return COLUMNAS_OBS_INSTALACIONES.some(col => esSi(p[col]));
}

// "Planilla Fuera de Término" para el rol de un club en un partido puntual:
// si llegó con demora (>1 min) en Planillas y Credenciales O en Formación
// Inicial, cuenta 1 — aunque le haya pasado en las dos, sigue siendo 1.
function planillaFueraDeTermino(p, rol) {
  const planillas = Number(p[`Demora Planillas ${rol}`]) || 0;
  const formacion = Number(p[`Demora Form. Inicial ${rol}`]) || 0;
  return planillas > UMBRAL_DEMORA_MIN || formacion > UMBRAL_DEMORA_MIN;
}

function vacio() {
  return {
    partidos: 0,
    demoraInicioConDemora: 0, demoraInicioMinTotales: 0,
    etExcedidos: 0, etMinTotales: 0, etConDato: 0,
    incidentes: 0, obsInstalaciones: 0,
    planillaFueraTermino: 0, camisetaSinApellido: 0,
  };
}

function formatear(club, acc) {
  return {
    club,
    partidos: acc.partidos,
    demoraInicio: {
      partidosConDemora: acc.demoraInicioConDemora,
      porcentaje: acc.partidos > 0 ? Math.round((acc.demoraInicioConDemora / acc.partidos) * 100) : 0,
      minutosTotales: acc.demoraInicioMinTotales,
      minutosPromedio: acc.demoraInicioConDemora > 0 ? Math.round(acc.demoraInicioMinTotales / acc.demoraInicioConDemora) : 0,
    },
    entretiempos: {
      cantidadExcedidos: acc.etExcedidos,
      promedioMin: acc.etConDato > 0 ? Math.round(acc.etMinTotales / acc.etConDato) : 0,
    },
    incidentes: acc.incidentes,
    obsInstalaciones: acc.obsInstalaciones,
    controlesPrevios: {
      planillaFueraTermino: acc.planillaFueraTermino,
      camisetaSinApellido: acc.camisetaSinApellido,
    },
  };
}

// Filtra los partidos por Torneo, División (columna "Categoría" de la
// planilla: 1a/3a/4a/etc.), rango de fechas de calendario (Día) y rango de
// Fecha N°. Cada filtro es opcional — si no se pasa, no filtra por ese campo.
export function filtrarPartidos(partidos, filtros = {}) {
  const { torneo, division, fechaDesde, fechaHasta, fechaNroDesde, fechaNroHasta } = filtros;
  return (partidos || []).filter(p => {
    if (torneo && p['Torneo'] !== torneo) return false;
    if (division && p['Categoría'] !== division) return false;
    if (fechaDesde || fechaHasta) {
      const clave = claveDia(p['Día']);
      if (fechaDesde && clave < fechaDesde) return false;
      if (fechaHasta && clave > fechaHasta) return false;
    }
    if (fechaNroDesde !== undefined && fechaNroDesde !== '' && fechaNroDesde !== null) {
      const n = Number(p['Fecha N°']);
      if (Number.isNaN(n) || n < Number(fechaNroDesde)) return false;
    }
    if (fechaNroHasta !== undefined && fechaNroHasta !== '' && fechaNroHasta !== null) {
      const n = Number(p['Fecha N°']);
      if (Number.isNaN(n) || n > Number(fechaNroHasta)) return false;
    }
    return true;
  });
}

// `opciones.categoriaClub` + `opciones.clubesCategoria` filtran por
// categoría de CLUB (A/B/C/D, viene de la hoja Clubes, no de los partidos):
// un club que no tenga esa categoría asignada simplemente no genera fila —
// y el TOTAL se recalcula solo con los clubes que quedaron, así que
// porcentajes y promedios del total siguen siendo matemáticamente correctos
// (no un promedio de promedios).
export function calcularIndicadoresPorClub(partidos, opciones = {}) {
  const { categoriaClub, clubesCategoria } = opciones;
  const acumulados = new Map();
  const obtener = (club) => {
    if (!acumulados.has(club)) acumulados.set(club, vacio());
    return acumulados.get(club);
  };

  (partidos || []).forEach(p => {
    [['Local', 'L'], ['Visitante', 'V']].forEach(([campoClub, rol]) => {
      const club = p[campoClub];
      if (!club || esISO(club)) return; // nombre vacío o corrompido (Sheets lo guardó como fecha)
      if (categoriaClub && (clubesCategoria?.[club] || '') !== categoriaClub) return;
      const acc = obtener(club);
      acc.partidos += 1;

      const demora = demoraInicioMin(p);
      if (demora > UMBRAL_DEMORA_MIN) acc.demoraInicioConDemora += 1;
      acc.demoraInicioMinTotales += demora;

      if (esSi(p['ET Excedido'])) acc.etExcedidos += 1;
      const etMin = Number(p['ET min.']);
      if (p['ET min.'] !== '' && p['ET min.'] != null && !Number.isNaN(etMin)) {
        acc.etMinTotales += etMin;
        acc.etConDato += 1;
      }

      if (tuvoIncidente(p)) acc.incidentes += 1;
      if (tuvoObsInstalaciones(p)) acc.obsInstalaciones += 1;

      if (planillaFueraDeTermino(p, rol)) acc.planillaFueraTermino += 1;
      if (!esSi(p['Camiseta c/Apellido OK'])) acc.camisetaSinApellido += 1;
    });
  });

  const porClub = [...acumulados.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([club, acc]) => formatear(club, acc));

  const accTotal = [...acumulados.values()].reduce((t, acc) => {
    t.partidos += acc.partidos;
    t.demoraInicioConDemora += acc.demoraInicioConDemora;
    t.demoraInicioMinTotales += acc.demoraInicioMinTotales;
    t.etExcedidos += acc.etExcedidos;
    t.etMinTotales += acc.etMinTotales;
    t.etConDato += acc.etConDato;
    t.incidentes += acc.incidentes;
    t.obsInstalaciones += acc.obsInstalaciones;
    t.planillaFueraTermino += acc.planillaFueraTermino;
    t.camisetaSinApellido += acc.camisetaSinApellido;
    return t;
  }, vacio());

  return { porClub, total: formatear('TOTAL', accTotal) };
}
