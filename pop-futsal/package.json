import { textoHorariosCompleto } from './desviosHorarios';

// Ítems de Control Previo (Pantalla2) — campo interno, texto legible para
// el resumen del Acta, y la ETIQUETA exacta (mayúscula) que guarda el panel
// "Observación por Control" delante de cada observación puntual (formato
// "ETIQUETA: texto"). Con la etiqueta se puede saber si el oficial ya
// escribió algo específico para ese ítem — si ya lo hizo, no hace falta
// repetirlo en el resumen genérico de "ítems sin cumplir".
const ITEMS_CONTROL_PREVIO = [
  ['buen_estado', 'campo de juego', 'CAMPO DE JUEGO'], ['ilum', 'iluminación', 'ILUMINACIÓN'],
  ['mesa_crono', 'mesa de cronometraje', 'MESA CRONO'], ['tablero', 'tablero', 'TABLERO'],
  ['redes_per', 'redes perimetrales', 'REDES PERIMETRALES'], ['altura', 'altura de protecciones', 'ALTURA MIN. 5 MTS'],
  ['pared_prot', 'pared con protecciones', 'PARED CON PROTECCIONES'], ['meta_anclada', 'meta anclada', 'META SIN ANCLAR'],
  ['vest_l', 'vestuario local', 'VESTUARIO LOCAL'], ['vest_v', 'vestuario visitante', 'VESTUARIO VISITA'],
  ['vest_arb', 'vestuario árbitro', 'VESTUARIO ÁRBITRO'], ['banios', 'baños públicos', 'BAÑOS PÚBLICOS'],
  ['limpieza', 'limpieza', 'LIMPIEZA'], ['camiseta', 'camiseta con apellido', 'CAMISETA C/APELLIDO'],
  ['balon_nuevo', 'balón nuevo', 'BALÓN NUEVO'], ['del_veedor_l', 'delegado/veedor local', 'VEEDOR LOCAL'],
  ['del_veedor_v', 'delegado/veedor visita', 'VEEDOR VISITA'], ['seguridad', 'seguridad/policía', 'SEGURIDAD / POLICÍA'],
  ['medico', 'médico', 'MÉDICO'],
];

// Ítems de "durante el partido" (Pantalla4) — mismo criterio que Control
// Previo: campo interno, texto legible para el resumen, y la ETIQUETA
// exacta que guarda el panel "Obs. por Inconveniente" delante de cada
// observación puntual. Si el oficial ya escribió algo específico para un
// ítem, no hace falta repetirlo en el resumen genérico.
const ITEMS_DURANTE_PARTIDO = [
  ['tablero_fallas', 'tablero con fallas', 'TABLERO CON FALLAS'], ['sin_balon', 'sin balón de back-up', 'SIN BALÓN DE BACK-UP'],
  ['medico_obs', 'sin médico', 'SIN MÉDICO'], ['policia', 'sin policía', 'SIN POLICÍA'],
  ['ilum_obs', 'problemas de iluminación', 'ILUMINACIÓN'], ['humedad', 'humedad en el campo', 'HUMEDAD'],
  ['goteras', 'goteras', 'GOTERAS'], ['arcos_obs', 'problemas en arcos/redes', 'ARCOS/REDES'],
  ['tribunas', 'inconvenientes en tribunas', 'TRIBUNAS'], ['invasion', 'invasión de campo', 'INVASIÓN DE CAMPO'],
  ['incidentes', 'incidentes', 'INCIDENTES'], ['agresiones', 'agresiones', 'AGRESIONES'],
  ['gresca', 'gresca generalizada', 'GRESCA GENERALIZADA'], ['publico_l', 'incidentes de público local', 'PÚBLICO LOCAL'],
  ['publico_v', 'incidentes de público visitante', 'PÚBLICO VISITA'],
];

export function generarActaTexto(datos, opciones = {}) {
  const { paraWSP = false } = opciones;
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

  // En el WSP, la conclusión ya se muestra arriba en su propia sección
  // ("📝 Conclusión:") — repetirla acá adentro del Acta queda redundante y
  // alarga el mensaje sin necesidad.
  let partes = paraWSP ? [] : conclusiones.map(c => textos[c]).filter(Boolean);

  if (datos.comenzo_si === 'no' && datos.motivo_inicio) {
    partes.push(`El partido no comenzó en horario. Motivo: ${datos.motivo_inicio}.`);
  }

  // Control Previo: primero las observaciones puntuales de cada ítem (lo
  // que el oficial escribió a mano en el panel), y recién después el
  // resumen general de ítems sin cumplir — y de ese resumen general se
  // sacan los ítems que ya quedaron cubiertos arriba con su propia
  // observación, para no repetir el mismo dato dos veces.
  const obsPrevio = (datos.obs_previo || '').trim();
  if (obsPrevio) partes.push(`Control previo: ${obsPrevio}`);
  const obsPrevioMayus = obsPrevio.toUpperCase();
  const controlPrevioProbs = ITEMS_CONTROL_PREVIO
    .filter(([campo]) => !datos[campo])
    .filter(([, , etiqueta]) => !obsPrevioMayus.includes(`${etiqueta}:`))
    .map(([, label]) => label);
  if (controlPrevioProbs.length > 0) partes.push(`Control previo, ítems sin cumplir: ${controlPrevioProbs.join(', ')}.`);

  const horarios = textoHorariosCompleto(datos);
  if (horarios) partes.push(`Horarios: ${horarios}`);

  // Durante el partido: mismo criterio — primero el texto puntual que
  // escribió el oficial (obs_partido), y recién después el resumen
  // general de los ítems marcados que todavía no quedaron cubiertos.
  const obsPartido = (datos.obs_partido || '').trim();
  if (obsPartido) partes.push(obsPartido);
  const obsPartidoMayus = obsPartido.toUpperCase();
  const duranteProbs = ITEMS_DURANTE_PARTIDO
    .filter(([campo]) => datos[campo])
    .filter(([, , etiqueta]) => !obsPartidoMayus.includes(`${etiqueta}:`))
    .map(([, label]) => label);
  if (duranteProbs.length > 0) partes.push(`Durante el partido: ${duranteProbs.join(', ')}.`);

  return partes.join('\n');
}
