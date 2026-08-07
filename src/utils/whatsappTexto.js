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

function soloApellido(nombreCompleto) {
  const partes = (nombreCompleto || '').trim().split(/\s+/);
  return partes[partes.length - 1] || '';
}

// Mismo formato de texto que ya arma "Compartir Datos" en Pantalla5 —
// función única para que no se desalinee si se cambia en un solo lugar.
export function armarTextoWhatsApp(datos, actaTexto) {
  const conclusiones = datos.conclusiones || [];
  const resLocal = datos.res_local || '-';
  const resVisita = datos.res_visitante || '-';
  const concl = conclusiones.map(c => CONCL_LABELS[c]).filter(Boolean).join(' / ');
  const demoraIngreso = calcularMin(datos.ingreso, datos.hora_real);
  const division = datos.division === 'M' ? 'Masculino' : datos.division === 'F' ? 'Femenino' : '';
  return (
    `Futsal - Planilla de Partido\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📋 ${datos.torneo}${division ? ` | ${division}` : ''}\n` +
    `Fecha ${datos.fecha_nro}\n` +
    `📅 ${datos.dia} | ${datos.hora} hs\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `(L) ${datos.local}  ${resLocal} \n` +
    `(V) ${datos.visitante}  ${resVisita}\n` +
    `🏟️ ${datos.estadio}\n` +
    `Árbitro: ${datos.arbitro}\n` +
    `Oficial AFA:  ${soloApellido(datos.oficial_afa)}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `Ingreso:  ${datos.ingreso || '-'} \n` +
    `⏱️ Inicio Real:  ${datos.hora_real || '-'}\n` +
    (demoraIngreso != null ? `Demora: ${demoraIngreso} min.\n` : '') +
    `Final 1°T:  ${datos.final_1t || '-'} \n` +
    `Inicio 2°T:  ${datos.inicio_2t || '-'}\n` +
    `ET:  ${datos.et_min || '-'} min.\n` +
    `⏱️ Final : ${datos.final_partido || '-'}\n` +
    `Duración: ${datos.duracion_partido || '-'}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📝 Conclusión: \n${concl}\n\n` +
    `*ACTA FINAL:*\n${actaTexto}` +
    (datos.acta_extra ? `\n${datos.acta_extra}` : '')
  );
}
