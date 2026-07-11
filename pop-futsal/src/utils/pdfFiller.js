import { PDFDocument } from 'pdf-lib';
import { generarActaTexto } from './acta';

// ── Mapeo datos de la app -> campos del AcroForm oficial (POP_2026_v62.pdf) ──
// Verificado cruzando la posición (x,y) de cada campo con el texto impreso más
// cercano en el PDF real, campo por campo. Dos casos detectados donde el NOMBRE
// del campo en el PDF no coincide con su posición/etiqueta visual real:
//   - el campo llamado "seguridad" está ubicado en la casilla de "Limpieza"
//   - el campo llamado "medico" está ubicado en la casilla de "Camiseta c/Apellido"
// Por eso el mapeo va por posición confirmada, no por el nombre del campo.

const CAMPOS_TEXTO = {
  dia: 'dia', hora: 'hora', nro: 'nro',
  res_local: 'res_local', res_visitante: 'res_visitante',
  deleg_l: 'deleg_l', deleg_v: 'deleg_v',
  plan_cred_dem_l: 'text_90bhax', plan_cred_dem_v: 'text_87qgav',
  form_ini_dem_l: 'text_89gqwf', form_ini_dem_v: 'text_88ctai',
  obs_previo: 'obs_ctrl_previo',
  ingreso: 'ingreso_hora',
  hora_real: 'hora_real', final_1t: 'final_1t', inicio_2t: 'inicio_2t',
  et_min: 'entretiempo_min', final_partido: 'final_partido',
  obs_horarios: 'textarea_232ugis',
  obs_partido: 'textarea_83cdlo.obs_sec4',
};

const CAMPOS_CHOICE = {
  torneo: 'torneo', fecha_nro: 'fecha_nro', cat: 'cat',
  local: 'local', visitante: 'visitante', estadio: 'estadio',
  arbitro: 'arbitro', oficial_afa: 'oficial_afa',
  motivo_inicio: 'dropdown_88qaws', motivo_et: 'dropdown_89ddav',
};

// Checkboxes simples: datos[clave] booleano -> campo PDF
const CAMPOS_CHECK = {
  plan_cred_ok: 'plan_loc', form_ini_ok: 'plan_tv',
  buen_estado: 'buen_estado', ilum: 'ilum', mesa_crono: 'mesa_crono2', tablero: 'tablero2',
  redes_per: 'redes_per', altura: 'checkbox_77llez', pared_prot: 'pared_prot', meta_anclada: 'meta_anclada',
  banios: 'checkbox_79ntrl',
  limpieza: 'seguridad',      // posición real = Limpieza (ver nota arriba)
  camiseta: 'medico',         // posición real = Camiseta c/Apellido (ver nota arriba)
  balon_nuevo: 'checkbox_86dfzc',
  vest_l: 'vest_l', vest_v: 'vest_v', vest_arb: 'vest_arb',
  del_veedor_l: 'checkbox_82xopl', del_veedor_v: 'checkbox_83siyj',
  seguridad: 'checkbox_84hvay',  // seguridad/policía real
  medico: 'checkbox_81vcpl',     // médico real
  protocolo: 'inc_arb',
  excedido: 'checkbox_85olln',
  tablero_fallas: 'crono', sin_balon: 'sin_balon',
  medico_obs: 'checkbox_95spfp', policia: 'checkbox_96ggcf',
  fuera_zona_l: 'checkbox_86hrwc', fuera_zona_v: 'checkbox_87cgmp',
  sin_chalecos_l: 'checkbox_88kpev', sin_chalecos_v: 'checkbox_89bsvg',
  con_balones_l: 'checkbox_93zvwc', con_balones_v: 'checkbox_94tuhy',
  mas5_l: 'checkbox_91jmmm', mas5_v: 'checkbox_90egkz',
  ilum_obs: 'checkbox_85qap.obs_ilum', humedad: 'checkbox_87etwl.obs_humedad',
  goteras: 'checkbox_88szkm.obs_goteras', arcos_obs: 'checkbox_89ksjv.obs_arcos',
  tribunas: 'checkbox_90jodf.obs_trib',
  invasion: 'obs_invcampo', incidentes: 'checkbox_86xgxa.obs_incid',
  agresiones: 'checkbox_94sxeb.obs_agres', gresca: 'checkbox_95hkwp.obs_gresca',
  publico_l: 'checkbox_92wmho.obs_pub_l', publico_v: 'checkbox_91zzuc.obs_pub_v',
};

// Conclusión general: cada id del array datos.conclusiones -> su checkbox
const CAMPOS_CONCLUSION = { normal: 'part_norm', obs: 'con_obs', tdd: 'inf_tdd', susp: 'suspension' };

// Campos internos del PDF que NUNCA se tocan: son parte del mecanismo interno
// de auto-reconstrucción del ACTA FINAL (solo funciona dentro de Adobe). El
// texto visible del acta (textarea_82wqkf.acta_final_tx) SÍ se completa acá
// abajo, con el mismo texto que ya arma la app — así se ve igual en cualquier
// lector, no solo en Adobe.
// -> acta_manual, auto_acta, radio_group_89vbsz

function nombreArchivo(datos) {
  const partes = [datos.torneo, datos.fecha_nro, datos.local, 'vs', datos.visitante]
    .filter(Boolean)
    .map(s => String(s).replace(/[^a-zA-Z0-9]+/g, '_'));
  return partes.length ? partes.join('_') : 'POPA_partido';
}

export async function generarPDFOficial(datos, opciones = {}) {
  const { editable = false } = opciones;
  const bytesPlantilla = await fetch('/plantilla_popa.pdf').then(r => {
    if (!r.ok) throw new Error('No se pudo cargar la plantilla del PDF oficial');
    return r.arrayBuffer();
  });

  const pdfDoc = await PDFDocument.load(bytesPlantilla);
  const form = pdfDoc.getForm();

  const setTexto = (nombreCampo, valor) => {
    try { form.getTextField(nombreCampo).setText(valor != null ? String(valor) : ''); }
    catch { /* el campo no existe en esta versión de la plantilla: se ignora */ }
  };
  const setChoice = (nombreCampo, valor) => {
    if (!valor) return;
    try {
      const c = form.getField(nombreCampo);
      if (c.select) c.select(String(valor));
      else if (c.setText) c.setText(String(valor));
    } catch { /* opción no encontrada en la lista: se ignora, queda vacío */ }
  };
  const setCheck = (nombreCampo, marcado) => {
    try {
      const campo = form.getCheckBox(nombreCampo);
      if (marcado) campo.check(); else campo.uncheck();
    } catch { /* el campo no existe: se ignora */ }
  };

  // 1. Texto
  for (const [claveApp, campoPdf] of Object.entries(CAMPOS_TEXTO)) {
    setTexto(campoPdf, datos[claveApp]);
  }

  // 2. Desplegables (torneo, clubes, estadio, árbitro, oficial, motivos)
  for (const [claveApp, campoPdf] of Object.entries(CAMPOS_CHOICE)) {
    setChoice(campoPdf, datos[claveApp]);
  }

  // 3. División M/F
  setCheck('masc', datos.division === 'M');
  setCheck('fem', datos.division === 'F');

  // 4. Checkboxes
  for (const [claveApp, campoPdf] of Object.entries(CAMPOS_CHECK)) {
    setCheck(campoPdf, !!datos[claveApp]);
  }

  // 5. ¿Comenzó en hora?
  setCheck('comenzo_si', datos.comenzo_si === 'si');
  setCheck('comenzo_no', datos.comenzo_si === 'no');

  // 6. Conclusión general
  const conclusiones = datos.conclusiones || [];
  for (const [id, campoPdf] of Object.entries(CAMPOS_CONCLUSION)) {
    setCheck(campoPdf, conclusiones.includes(id));
  }

  // 7. Nombre de archivo sugerido (campo de ayuda, no forma parte del acta)
  setTexto('nombre_archivo', nombreArchivo(datos));

  // 8. Acta Final: mismo texto que ya arma la app (observaciones + lo que
  // haya escrito el Oficial AFA a mano), para que se vea igual en cualquier lector.
  const textoActa = [generarActaTexto(datos), datos.acta_extra?.trim()].filter(Boolean).join(' ');
  setTexto('textarea_82wqkf.acta_final_tx', textoActa);

  // Adobe/algunos lectores necesitan esto para repintar los campos de texto
  // con el valor recién puesto sin que el usuario tenga que hacer click.
  try { form.updateFieldAppearances(); } catch { /* no crítico */ }

  // 9. Bloquear el PDF (por defecto): marca cada campo como solo-lectura, para
  // que no se pueda editar. Aplanar (form.flatten()) generaba un PDF con
  // errores en algunos lectores (probado), así que se descartó esa opción:
  // esto logra el mismo resultado — no editable — de forma más compatible.
  // Si se pide "editable", se salta este paso y el PDF queda con el
  // formulario abierto, como cualquier PDF con campos rellenables.
  if (!editable) {
    for (const campo of form.getFields()) {
      try { campo.enableReadOnly(); } catch { /* no crítico */ }
    }
  }

  const bytesFinal = await pdfDoc.save();
  return { bytes: bytesFinal, nombreSugerido: `${nombreArchivo(datos)}.pdf` };
}

export function descargarPDF(bytes, nombreArchivo) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
