// Arma la lista de líneas de desvío: demoras de planillas/formación/ingreso/
// regreso (mayores a 1 minuto) y el motivo de entretiempo excedido. Es una
// función pura: no lee ni escribe el campo de Observaciones, solo mira los
// horarios ya cargados. Se recalcula siempre a partir de esos datos, nunca
// se guarda "pisando" nada que haya escrito el Oficial.
export function generarBloqueDesvios(datos) {
  const demoras = [
    ['Entrega de planillas', datos.plan_cred_dem_l, datos.plan_cred_dem_v],
    ['Formación inicial', datos.form_ini_dem_l, datos.form_ini_dem_v],
    ['Formación de ingreso al campo', datos.ingreso_local_dem, datos.ingreso_visita_dem],
    ['Regreso post-entretiempo', datos.regreso_local_dem, datos.regreso_visita_dem],
  ];
  const lineas = demoras
    .filter(([, l, v]) => Number(l) > 1 || Number(v) > 1)
    .map(([label, l, v]) => {
      const partes = [];
      if (Number(l) > 1) partes.push(`${datos.local || 'Local'} demoró ${l} min.`);
      if (Number(v) > 1) partes.push(`${datos.visitante || 'Visita'} demoró ${v} min.`);
      return `${label}: ${partes.join(' / ')}`;
    });
  if (datos.excedido && datos.motivo_et) {
    lineas.push(`Entretiempo excedido. Motivo: ${datos.motivo_et}`);
  }
  return lineas;
}

// Texto final para el Acta y el PDF: junta los desvíos automáticos (si hay)
// con lo que el Oficial haya escrito a mano en Observaciones de Horarios.
// Es la ÚNICA función que arma esta combinación — la usan tanto el Acta
// (acta.js) como el PDF (pdfFiller.js), así nunca se puede desincronizar
// una de la otra.
export function textoHorariosCompleto(datos) {
  const desvios = generarBloqueDesvios(datos);
  const manual = (datos.obs_horarios || '').trim();
  const bloqueDesvios = desvios.length > 0 ? `Demoras registradas:\n${desvios.join('\n')}` : '';
  return [bloqueDesvios, manual].filter(Boolean).join('\n');
}
