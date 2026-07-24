export function generarActaTexto(datos) {
  const conclusiones = datos.conclusiones || [];

  if (conclusiones.length === 0) {
    return 'Seleccioná la conclusión del partido para generar el acta.';
  }

  const textos = {
    normal: 'El partido se desarrolló con normalidad, sin incidentes que destacar.',
    obs: 'Con Observaciones.',
    tdd: 'Se eleva informe al Tribunal de Disciplina Deportiva por los hechos ocurridos durante el partido.',
    susp: 'El partido fue SUSPENDIDO. Se eleva informe al Tribunal de Disciplina Deportiva.',
  };

  let partes = conclusiones.map(c => textos[c]).filter(Boolean);

  const incidentes = [];
  if (datos.invasion) incidentes.push('invasión de campo');
  if (datos.incidentes) incidentes.push('incidentes');
  if (datos.agresiones) incidentes.push('agresiones');
  if (datos.gresca) incidentes.push('gresca generalizada');
  if (datos.publico_l) incidentes.push('incidentes de público local');
  if (datos.publico_v) incidentes.push('incidentes de público visitante');
  if (incidentes.length > 0) partes.push(`Se registraron: ${incidentes.join(', ')}.`);

  const campoProbs = [];
  if (datos.ilum_obs) campoProbs.push('problemas de iluminación');
  if (datos.humedad) campoProbs.push('humedad en el campo');
  if (datos.goteras) campoProbs.push('goteras');
  if (datos.arcos_obs) campoProbs.push('problemas en arcos/redes');
  if (datos.tribunas) campoProbs.push('inconvenientes en tribunas');
  if (campoProbs.length > 0) partes.push(`Campo de juego: ${campoProbs.join(', ')}.`);

  if (datos.comenzo_si === 'no' && datos.motivo_inicio) {
    partes.push(`El partido no comenzó en horario. Motivo: ${datos.motivo_inicio}.`);
  }
  if (datos.excedido && datos.motivo_et) {
    partes.push(`El entretiempo fue excedido. Motivo: ${datos.motivo_et}.`);
  }

  // Demoras en entrega de planillas, formación inicial, formación de ingreso
  // al campo y regreso post-entretiempo (cualquiera de los 2 equipos).
  const demoras = [
    ['Entrega de planillas', datos.plan_cred_dem_l, datos.plan_cred_dem_v],
    ['Formación inicial', datos.form_ini_dem_l, datos.form_ini_dem_v],
    ['Formación de ingreso al campo', datos.ingreso_local_dem, datos.ingreso_visita_dem],
    ['Regreso post-entretiempo', datos.regreso_local_dem, datos.regreso_visita_dem],
  ];
  const demorasTexto = demoras
    .filter(([, l, v]) => Number(l) > 1 || Number(v) > 1)
    .map(([label, l, v]) => {
      const partesEquipo = [];
      if (Number(l) > 1) partesEquipo.push(`${datos.local || 'Local'} ${l} min.`);
      if (Number(v) > 1) partesEquipo.push(`${datos.visitante || 'Visita'} ${v} min.`);
      return `${label}: ${partesEquipo.join(' / ')}`;
    });
  if (demorasTexto.length > 0) partes.push(`Demoras registradas:\n${demorasTexto.join('\n')}`);

  if (datos.obs_previo?.trim()) partes.push(`Control previo: ${datos.obs_previo.trim()}`);
  if (datos.obs_horarios?.trim()) partes.push(`Horarios: ${datos.obs_horarios.trim()}`);
  if (datos.obs_partido?.trim()) partes.push(datos.obs_partido.trim());

  return partes.join(' ');
}
