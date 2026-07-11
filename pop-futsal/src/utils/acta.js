export function generarActaTexto(datos) {
  const conclusiones = datos.conclusiones || [];

  if (conclusiones.length === 0) {
    return 'Seleccioná la conclusión del partido para generar el acta.';
  }

  const textos = {
    normal: 'El partido se desarrolló con normalidad, sin incidentes que destacar.',
    obs: 'El partido finalizó con observaciones.',
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
  if (datos.obs_previo?.trim()) partes.push(`Control previo: ${datos.obs_previo.trim()}`);
  if (datos.obs_horarios?.trim()) partes.push(`Horarios: ${datos.obs_horarios.trim()}`);
  if (datos.obs_partido?.trim()) partes.push(datos.obs_partido.trim());

  return partes.join(' ');
}
