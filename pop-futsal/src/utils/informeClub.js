import { demoraInicioMin } from './indicadoresClub';

// Ítems de la tabla de Instalaciones — columna real de la planilla y el
// texto que se muestra en el informe. Son todos propios de la cancha del
// Local (así lo confirma la fórmula original: filtra siempre por rol=Local).
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

function esSi(v) {
  return String(v || '').trim().toUpperCase() === 'SI';
}

function partidosDelClub(club, partidos) {
  return (partidos || [])
    .filter(p => p['Local'] === club || p['Visitante'] === club)
    .map(p => ({ ...p, __rol: p['Local'] === club ? 'L' : 'V' }))
    .sort((a, b) => (Number(a['Fecha N°']) || 0) - (Number(b['Fecha N°']) || 0));
}

// Texto de "Durante el partido" para un partido puntual, replicando exacto
// la fórmula original de las hojas de club: la mayoría de los ítems son
// propios de la cancha del Local únicamente; "Médico" aplica a los dos
// roles; y los 4 ítems de "Calentamiento de Suplentes" tienen una columna
// distinta según el rol (Local o Visitante) de este club en ese partido.
function textoDurantePartido(p) {
  const esLocal = p.__rol === 'L';
  const partes = [];
  if (esLocal && esSi(p['Tablero con Fallas'])) partes.push('Tablero con fallas');
  if (esLocal && esSi(p['Sin Balón Backup'])) partes.push('Sin balón de backup');
  if (esSi(p['Sin Médico'])) partes.push('Médico');
  if (esLocal && esSi(p['Sin Policía'])) partes.push('Policía');
  if (esSi(p[`Fuera de Zona ${p.__rol}`])) partes.push('Calentamiento Suplentes Fuera de Zona');
  if (esSi(p[`Sin Chalecos ${p.__rol}`])) partes.push('Calentamiento Suplentes Sin Chalecos');
  if (esSi(p[`Con Balones ${p.__rol}`])) partes.push('Calentamiento Suplentes Con Balones');
  if (esSi(p[`Más de 5 ${p.__rol}`])) partes.push('Calentamiento Suplentes Más de 5');
  if (esLocal && esSi(p['Iluminación Obs.'])) partes.push('Iluminación');
  if (esLocal && esSi(p['Humedad'])) partes.push('Humedad');
  if (esLocal && esSi(p['Goteras'])) partes.push('Goteras');
  if (esLocal && esSi(p['Arcos/Redes'])) partes.push('Arcos/Redes');
  if (esLocal && esSi(p['Tribunas'])) partes.push('Tribuna');
  return partes.join(' + ');
}

// Texto de "Incidentes": en la planilla vieja Incidentes/Invasión/Agresiones
// estaban separados por rol (Local/Visitante); la hoja compartida actual
// los guarda en una sola columna por partido (no por rol), así que se
// muestran igual para los dos clubes de ese partido — es la mejor
// aproximación posible con los datos que trae la planilla nueva.
function textoIncidentes(p) {
  const partes = [];
  if (esSi(p['Incidentes'])) partes.push('Incidentes');
  if (esSi(p['Invasión de Campo'])) partes.push('Invasión de Campo');
  if (esSi(p['Agresiones'])) partes.push('Agresiones');
  if (esSi(p['Gresca Generalizada'])) partes.push('Gresca');
  return partes.join(' + ');
}

// Arma todas las secciones del informe PDF de un club, a partir de sus
// partidos en la planilla compartida. Función pura — no genera el PDF en sí
// (eso lo hace informeClubPdf.js), solo prepara los datos ya listos para
// mostrarse en cada tabla.
export function armarInformeClub(club, partidos) {
  const propios = partidosDelClub(club, partidos);

  const estadio = propios.find(p => p['Estadio'])?.['Estadio'] || '';

  const instalaciones = ITEMS_INSTALACIONES.map(([col, label]) => {
    const fechas = propios.filter(p => p.__rol === 'L' && !esSi(p[col])).map(p => p['Fecha N°']).filter(Boolean);
    return { item: label, fecha: fechas.join(' '), observacion: fechas.length ? `Sin cumplir en fecha ${fechas.join(' ')}` : '' };
  });

  const controlHorarios = propios.map(p => {
    const rival = p.__rol === 'L' ? p['Visitante'] : p['Local'];
    const ip = demoraInicioMin(p);
    const etMin = Number(p['ET min.']) || 0;
    const etExcedido = esSi(p['ET Excedido']);
    const partes = [];
    if (ip > 1) partes.push(`IP= ${ip} min${p['Motivo Demora Inicio'] ? ` (${p['Motivo Demora Inicio']})` : ''}`);
    if (etExcedido) partes.push(`ET= ${etMin} min${p['Motivo Demora ET'] ? ` (${p['Motivo Demora ET']})` : ''}`);
    return {
      fecha: p['Fecha N°'] || '',
      lv: p.__rol,
      rival: rival || '',
      inicioPartido: esSi(p['Comenzó en Hora']) ? 'En hora' : '',
      demora: ip > 1 ? String(ip) : '',
      et: etMin > 0 ? String(etMin) : '',
      observacion: partes.join(' + '),
    };
  });

  const controlesPrevios = propios.map(p => {
    const demoraPlanillas = Number(p[`Demora Planillas ${p.__rol}`]) || 0;
    const demoraFormInicial = Number(p[`Demora Form. Inicial ${p.__rol}`]) || 0;
    const fi = Math.max(demoraPlanillas, demoraFormInicial);
    const sinApellido = !esSi(p['Camiseta c/Apellido OK']);
    const partes = [];
    if (demoraPlanillas > 0) partes.push('Demora en la entrega de Planillas, Credenciales');
    if (demoraFormInicial > 0) partes.push('Demora entrega Planilla con Formación Inicial');
    if (sinApellido) partes.push('Falta de Apellido en Camiseta');
    return {
      fecha: p['Fecha N°'] || '',
      fi: fi > 0 ? String(fi) : '',
      apellido: sinApellido ? 'x' : '',
      observacion: partes.join(' + '),
    };
  });

  const durantePartido = propios
    .map(p => ({ fecha: p['Fecha N°'] || '', observacion: textoDurantePartido(p) }))
    .filter(f => f.observacion !== '');

  const incidentes = propios
    .map(p => ({ fecha: p['Fecha N°'] || '', observacion: textoIncidentes(p) }))
    .filter(f => f.observacion !== '');

  return { club, estadio, instalaciones, controlHorarios, controlesPrevios, durantePartido, incidentes };
}
