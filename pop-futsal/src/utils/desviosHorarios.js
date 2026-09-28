// El motivo puede venir tal cual está escrito en la hoja "Motivos_Inicio"/
// "Motivos_ET" de Google Sheets (que suele estar en MAYÚSCULA, ej. "OTRO
// MOTIVO") — para el Acta se ve mejor con solo la primera letra en
// mayúscula, sin importar cómo esté guardado el dato original.
export function capitalizarFrase(texto) {
  const t = (texto || '').trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

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
    lineas.push(`Entretiempo excedido. Motivo: ${capitalizarFrase(datos.motivo_et)}`);
  }
  return lineas;
}

// Texto final para el Acta y el PDF: junta los desvíos automáticos (si hay)
// con lo que el Oficial haya escrito a mano en Observaciones de Horarios.
// Es la ÚNICA función que arma esta combinación — la usan tanto el Acta
// (acta.js) como el PDF (pdfFiller.js), así nunca se puede desincronizar
// una de la otra.
//
// Punto real: el campo del PDF ("3. Control de Horarios") es una caja de
// texto de un tamaño fijo — con varias líneas separadas (una por cada
// desvío) se quedaba sin espacio y el visor de PDF (compu o celular) lo
// cortaba, sin poder verse completo. El Acta SÍ tiene lugar de sobra y se
// ve bien como está, no se toca. Por eso acá hay 2 formatos posibles: el
// de siempre (con saltos de línea, para el Acta) y uno "seguido" (todo en
// una sola línea, con punto entre cada dato, para el PDF) — mismo
// contenido, mismos datos, solo cambia cómo se unen.
export function textoHorariosCompleto(datos, { seguido = false } = {}) {
  const desvios = generarBloqueDesvios(datos);
  const manual = (datos.obs_horarios || '').trim();
  if (seguido) {
    const puntoFinal = (s) => (/[.!?]$/.test(s) ? s : `${s}.`);
    const bloqueDesvios = desvios.length > 0
      ? `Demoras registradas: ${desvios.map(puntoFinal).join(' ')}`
      : '';
    return [bloqueDesvios, manual ? puntoFinal(manual) : ''].filter(Boolean).join(' ');
  }
  const bloqueDesvios = desvios.length > 0 ? `Demoras registradas:\n${desvios.join('\n')}` : '';
  return [bloqueDesvios, manual].filter(Boolean).join('\n');
}
