import { soloApellido } from './fixture';

const CONCL_LABELS = { normal: 'Partido Normal', obs: 'Con Observaciones', tdd: 'Informe al TDD', susp: 'Suspensión' };

function calcularMin(inicio, fin) {
  if (!inicio || !fin || !inicio.includes(':') || !fin.includes(':')) return null;
  const [h1, m1] = inicio.split(':').map(Number);
  const [h2, m2] = fin.split(':').map(Number);
  if ([h1, m1, h2, m2].some(Number.isNaN)) return null;
  let mins = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (mins < 0) mins += 24 * 60;
  return mins;
}

// El nombre puede estar guardado todo en mayúscula (según cómo haya
// quedado en POP-Datos o en la planilla), pero para el WSP se muestra en
// formato "Nombre Apellido" — solo la primera letra de cada palabra en
// mayúscula — para que no se vea "gritado" al lado de datos que sí son
// importantes del partido. No depende de cómo esté guardado el dato.
function formatoNombre(nombreCompleto) {
  return (nombreCompleto || '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(' ');
}

// El árbitro puede haber quedado guardado como solo el apellido (si se
// tipeó a mano en vez de elegirlo de la lista, o si la lista tenía esa
// entrada incompleta) — eso puede confundir si hay más de un árbitro con
// el mismo apellido. Acá se intenta expandir buscando en la lista maestra
// de Árbitros, manteniendo el mismo orden "Apellido, Nombre" que ya tiene
// POP-Datos (no se invierte). Si hay más de una coincidencia posible
// (ambigüedad real) o ninguna, se deja como estaba guardado — mejor no
// completar de más que arriesgar poner un nombre que no es.
function nombreCompletoArbitro(valorGuardado, listaArbitros) {
  const guardado = (valorGuardado || '').trim();
  if (!guardado || !listaArbitros?.length) return guardado;

  const norm = (s) => s.trim().toUpperCase();
  const apellidoDe = (entrada) => norm(entrada.split(',')[0]);

  // Si ya viene con el formato completo "Apellido, Nombre" tal cual está
  // en la lista, solo hay que reordenarlo a "Nombre Apellido".
  const yaCompleto = listaArbitros.find(a => norm(a) === norm(guardado));
  const candidato = yaCompleto || listaArbitros.find(a => apellidoDe(a) === norm(guardado));
  if (!candidato) return guardado;

  const coincidenciasDeEseApellido = listaArbitros.filter(a => apellidoDe(a) === apellidoDe(candidato));
  if (coincidenciasDeEseApellido.length > 1) return guardado; // ambiguo, no arriesgar

  const [apellido, nombre] = candidato.split(',').map(s => s.trim());
  return nombre ? `${apellido}, ${nombre}` : apellido;
}

// Mismo formato de texto que ya arma "Compartir Datos" en Pantalla5 —
// función única para que no se desalinee si se cambia en un solo lugar.
export function armarTextoWhatsApp(datos, actaTexto, arbitros) {
  const conclusiones = datos.conclusiones || [];
  const resLocal = datos.res_local || '-';
  const resVisita = datos.res_visitante || '-';
  const concl = conclusiones.map(c => CONCL_LABELS[c]).filter(Boolean).join(' / ');
  // La demora que se muestra acá tiene que ser la del INICIO REAL del
  // partido (Hora programada vs Hora Inicio Real) — no la del ingreso al
  // campo de cada equipo. Un equipo puede llegar tarde a la formación y
  // aun así el partido arrancar en horario (el minuto de tolerancia lo
  // absorbe); eso no cuenta como demora acá. Mismo umbral (> 1 min) que
  // usa el resto de la app para decidir si una demora "cuenta".
  const demoraInicio = calcularMin(datos.hora, datos.hora_real);
  const hayDemoraInicio = demoraInicio != null && demoraInicio > 1;
  const division = datos.division === 'M' ? 'Masculino' : datos.division === 'F' ? 'Femenino' : '';
  // Punto: la línea separadora se venía extendiendo un par de caracteres a
  // la línea de abajo en algunos celulares (WhatsApp envuelve el texto
  // según el ancho de pantalla) — se achica un poco para que entre siempre
  // en una sola línea, incluso en pantallas angostas.
  const SEPARADOR = '━━━━━━━━━━━━━━━━━━';
  return (
    `Futsal - Planilla de Partido\n` +
    `${SEPARADOR}\n` +
    `📋 ${datos.torneo}${division ? ` | ${division}` : ''}\n` +
    `Fecha ${datos.fecha_nro}\n` +
    `📅 ${datos.dia} | ${datos.hora} hs\n` +
    `${SEPARADOR}\n` +
    `(L) ${datos.local}  ${resLocal} \n` +
    `(V) ${datos.visitante}  ${resVisita}\n` +
    `Estadio: ${datos.estadio}\n` +
    `Árbitro: ${formatoNombre(nombreCompletoArbitro(datos.arbitro, arbitros))}\n` +
    `Oficial AFA:  ${soloApellido(formatoNombre(datos.oficial_afa))}\n` +
    `${SEPARADOR}\n` +
    `Ingreso:  ${datos.ingreso || '-'} \n` +
    `⏱️ Inicio Real:  ${datos.hora_real || '-'}\n` +
    (hayDemoraInicio ? `Demora: ${demoraInicio} min.\n` : '') +
    `Final 1°T:  ${datos.final_1t || '-'} \n` +
    `Inicio 2°T:  ${datos.inicio_2t || '-'}\n` +
    `ET:  ${datos.et_min || '-'} min.\n` +
    `⏱️ Final : ${datos.final_partido || '-'}\n` +
    `Duración: ${datos.duracion_partido || '-'}\n` +
    `${SEPARADOR}\n` +
    `📝 Conclusión: \n${concl}\n\n` +
    `*ACTA FINAL:*\n${actaTexto}` +
    (datos.acta_extra ? `\n${datos.acta_extra}` : '')
  );
}
