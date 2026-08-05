import { formatearHora } from './fechasSheet';
import { demoraInicioMin } from './indicadoresClub';

// Ítems de la tabla de Instalaciones — columna real de la planilla y el
// texto que se muestra en el informe.
const ITEMS_INSTALACIONES = [
  ['Campo Buen Estado', 'Campo de Juego'],
  ['Iluminación OK', 'Iluminación'],
  ['Mesa Crono OK', 'Mesa Crono'],
  ['Tablero OK', 'Tablero'],
  ['Redes Perimetrales OK', 'Redes Perimetrales'],
  ['Altura OK', 'Altura'],
  ['Pared Protecciones OK', 'Pared Sin Protección'],
  ['Meta Anclada OK', 'Meta Anclada'],
  ['Vestuario Local OK', 'Vestuario Local'],
  ['Vestuario Visita OK', 'Vestuario Visitante'],
  ['Vestuario Árbitro OK', 'Vestuario Árbitros'],
  ['Baños OK', 'Baños Públicos'],
  ['Limpieza OK', 'Limpieza'],
];

// Marcas de "Durante el partido" — columna real y el texto que se muestra.
const ITEMS_DURANTE = [
  ['Tablero con Fallas', 'Tablero con fallas'],
  ['Sin Balón Backup', 'Sin balón de resguardo'],
  ['Sin Médico', 'Sin médico'],
  ['Sin Policía', 'Sin policía'],
  ['Calent. Suplentes - Hubo Incumpl.', 'Incumplimiento en calentamiento de suplentes'],
  ['Fuera de Zona L', 'Fuera de zona (Local)'], ['Fuera de Zona V', 'Fuera de zona (Visitante)'],
  ['Sin Chalecos L', 'Sin chalecos (Local)'], ['Sin Chalecos V', 'Sin chalecos (Visitante)'],
  ['Con Balones L', 'Con balones (Local)'], ['Con Balones V', 'Con balones (Visitante)'],
  ['Más de 5 L', 'Más de 5 suplentes (Local)'], ['Más de 5 V', 'Más de 5 suplentes (Visitante)'],
  ['Iluminación Obs.', 'Observación de iluminación'], ['Humedad', 'Humedad'], ['Goteras', 'Goteras'],
  ['Arcos/Redes', 'Arcos/Redes'], ['Tribunas', 'Tribunas'], ['Invasión de Campo', 'Invasión de campo'],
  ['Público Local', 'Incidentes de público local'], ['Público Visita', 'Incidentes de público visitante'],
];

function esSi(v) {
  return String(v || '').trim().toUpperCase() === 'SI';
}

function partidosDelClub(club, partidos) {
  return (partidos || [])
    .filter(p => p['Local'] === club || p['Visitante'] === club)
    .map(p => ({ ...p, __rol: p['Local'] === club ? 'L' : 'V' }))
    .sort((a, b) => (Number(a['Fecha N°']) || 0) - (Number(b['Fecha N°']) || 0));
}

// Arma todas las secciones del informe PDF de un club, a partir de sus
// partidos en la planilla compartida. Función pura — no genera el PDF en sí
// (eso lo hace informeClubPdf.js), solo prepara los datos ya listos para
// mostrarse en cada tabla.
export function armarInformeClub(club, partidos) {
  const propios = partidosDelClub(club, partidos);

  const estadio = propios.find(p => p['Estadio'])?.['Estadio'] || '';

  const instalaciones = ITEMS_INSTALACIONES.map(([col, label]) => {
    const fechas = propios.filter(p => !esSi(p[col])).map(p => p['Fecha N°']).filter(Boolean);
    return { item: label, fecha: fechas.join(', '), observacion: fechas.length ? `Sin cumplir en fecha ${fechas.join(', ')}` : '' };
  });

  const controlHorarios = propios.map(p => {
    const rival = p.__rol === 'L' ? p['Visitante'] : p['Local'];
    const ip = demoraInicioMin(p);
    const etMin = Number(p['ET min.']) || 0;
    const etExcedido = esSi(p['ET Excedido']);
    const partes = [];
    if (ip > 1) partes.push(`IP= ${ip} min.${p['Motivo Demora Inicio'] ? ` (${p['Motivo Demora Inicio']})` : ''}`);
    if (etExcedido) partes.push(`ET= ${etMin} min.${p['Motivo Demora ET'] ? ` (${p['Motivo Demora ET']})` : ''}`);
    return {
      fecha: p['Fecha N°'] || '',
      lv: p.__rol,
      rival: rival || '',
      inicioPartido: formatearHora(p['Hora']) || '',
      demora: ip > 1 ? `${ip} min.` : '',
      et: etMin > 0 ? `${etMin} min.` : '',
      observacion: partes.join(' + '),
    };
  });

  const controlesPrevios = propios.map(p => {
    const fi = Number(p[`Demora Form. Inicial ${p.__rol}`]) || 0;
    const sinApellido = !esSi(p['Camiseta c/Apellido OK']);
    const partes = [];
    if (fi > 1) partes.push(`Formación Inicial: ${fi} min. de demora`);
    if (sinApellido) partes.push('Camiseta sin apellido');
    return {
      fecha: p['Fecha N°'] || '',
      fi: fi > 1 ? `${fi} min.` : '',
      apellido: sinApellido ? 'X' : '',
      observacion: partes.join(' + '),
    };
  });

  const durantePartido = propios
    .filter(p => ITEMS_DURANTE.some(([col]) => esSi(p[col])) || (p['Obs. Partido'] || '').trim())
    .map(p => ({
      fecha: p['Fecha N°'] || '',
      observacion: ITEMS_DURANTE.filter(([col]) => esSi(p[col])).map(([, label]) => label).join(', '),
      aclaracion: p['Obs. Partido'] || '',
    }));

  const incidentes = propios
    .filter(p => esSi(p['Incidentes']) || esSi(p['Agresiones']) || esSi(p['Gresca Generalizada']))
    .map(p => {
      const tipos = [];
      if (esSi(p['Incidentes'])) tipos.push('Incidentes');
      if (esSi(p['Agresiones'])) tipos.push('Agresiones');
      if (esSi(p['Gresca Generalizada'])) tipos.push('Gresca generalizada');
      return { fecha: p['Fecha N°'] || '', observacion: tipos.join(', '), aclaracion: p['Obs. Partido'] || '' };
    });

  return { club, estadio, instalaciones, controlHorarios, controlesPrevios, durantePartido, incidentes };
}
