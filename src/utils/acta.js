import { textoHorariosCompleto } from './desviosHorarios';

// Ítems de Control Previo (Pantalla2) — campo interno y texto legible para
// el Acta. Mismo criterio que ya usa el bloque de "Campo de juego" más
// abajo: si el oficial destildó el ítem, aparece acá aunque no haya
// escrito ningún texto libre en el panel de Observación por Control.
const ITEMS_CONTROL_PREVIO = [
  ['buen_estado', 'campo de juego'], ['ilum', 'iluminación'], ['mesa_crono', 'mesa de cronometraje'],
  ['tablero', 'tablero'], ['redes_per', 'redes perimetrales'], ['altura', 'altura de protecciones'],
  ['pared_prot', 'pared con protecciones'], ['meta_anclada', 'meta anclada'],
  ['vest_l', 'vestuario local'], ['vest_v', 'vestuario visitante'], ['vest_arb', 'vestuario árbitro'],
  ['banios', 'baños públicos'], ['limpieza', 'limpieza'], ['camiseta', 'camiseta con apellido'],
  ['balon_nuevo', 'balón nuevo'], ['del_veedor_l', 'delegado/veedor local'], ['del_veedor_v', 'delegado/veedor visita'],
  ['seguridad', 'seguridad/policía'], ['medico', 'médico'],
];

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

  if (datos.obs_previo?.trim()) partes.push(`Control previo: ${datos.obs_previo.trim()}`);
  const controlPrevioProbs = ITEMS_CONTROL_PREVIO.filter(([campo]) => !datos[campo]).map(([, label]) => label);
  if (controlPrevioProbs.length > 0) partes.push(`Control previo, ítems sin cumplir: ${controlPrevioProbs.join(', ')}.`);
  const horarios = textoHorariosCompleto(datos);
  if (horarios) partes.push(`Horarios: ${horarios}`);
  if (datos.obs_partido?.trim()) partes.push(datos.obs_partido.trim());

  return partes.join('\n');
}
