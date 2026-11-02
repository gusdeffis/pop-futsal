import { generarBloqueDesvios, capitalizarFrase } from './desviosHorarios';
import { gruposGolesTarjetas } from './golesTarjetas';

// Ítems de Control Previo (Pantalla2) — campo interno, texto legible para
// el resumen del Acta, y la ETIQUETA exacta (mayúscula) que guarda el panel
// "Observación por Control" delante de cada observación puntual (formato
// "ETIQUETA: texto"). La etiqueta tiene que ser IGUAL al nombre del ítem
// en Pantalla2 (se compara sin tildes ni signos). Con la etiqueta se puede saber si el oficial ya
// escribió algo específico para ese ítem — si ya lo hizo, no hace falta
// repetirlo en el resumen genérico de "ítems sin cumplir".
const ITEMS_CONTROL_PREVIO = [
  ['buen_estado', 'campo de juego', 'CAMPO EN BUEN EST.'], ['ilum', 'iluminación', 'ILUMINACIÓN'],
  ['mesa_crono', 'mesa de cronometraje', 'MESA CRONO'], ['tablero', 'tablero', 'TABLERO'],
  ['redes_per', 'redes perimetrales', 'REDES PERIMETR.'], ['altura', 'altura de protecciones', 'ALTURA MIN. 5 MTS'],
  ['pared_prot', 'pared con protecciones', 'PARED CON PROTECCIÓN'], ['meta_anclada', 'meta anclada', 'META SIN ANCLAR'],
  ['vest_l', 'vestuario local', 'VESTUARIO LOCAL'], ['vest_v', 'vestuario visitante', 'VESTUARIO VISITA'],
  ['vest_arb', 'vestuario árbitro', 'VESTUARIO ARBITRO'], ['banios', 'baños públicos', 'BAÑOS PÚBLICOS'],
  ['limpieza', 'limpieza', 'LIMPIEZA'], ['camiseta', 'camiseta con apellido', 'CAMISETAS C/APELLIDO'],
  ['balon_nuevo', 'balón nuevo', 'BALÓN NUEVO'], ['del_veedor_l', 'delegado/veedor local', 'VEEDOR LOCAL'],
  ['del_veedor_v', 'delegado/veedor visita', 'VEEDOR VISITA'], ['seguridad', 'seguridad/policía', 'SEGURIDAD POLICÍA'],
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

// ── Normalización para comparar etiquetas sin importar tildes, signos ni
// espacios ("Vestuario Árbitro" = "VESTUARIO ARBITRO").
const normal = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// Texto escrito en MAYÚSCULAS (la app fuerza mayúsculas) → minúscula con
// mayúscula al inicio de cada oración. Los nombres de los clubes del
// partido se dejan como están, para que se reconozcan.
export function aOracion(texto, datos = {}) {
  const t = String(texto || '').trim();
  if (!t) return t;
  const letras = t.replace(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü]/g, '');
  const mayus = letras.replace(/[^A-ZÁÉÍÓÚÑÜ]/g, '').length;
  if (!letras || mayus / letras.length < 0.7) return t; // ya viene en minúscula/mixto: no se toca
  let r = t.toLowerCase().replace(/(^|[.!?]\s+)([a-záéíóúñü])/g, (_, a, b) => a + b.toUpperCase());
  [datos.local, datos.visitante].filter(Boolean).forEach(club => {
    const esc = String(club).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    r = r.replace(new RegExp(esc, 'gi'), String(club).toUpperCase());
  });
  return r;
}

// Separa las líneas "ETIQUETA: texto" que arma el panel de observaciones.
// Una línea sin ":" (texto libre) queda como ítem sin etiqueta.
function itemsDeObservacion(texto) {
  return String(texto || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const m = l.match(/^([^:]{2,40}):\s*(.+)$/);
    // "21:08" no es una etiqueta: si lo de antes de ":" termina en número, es texto libre.
    return m && !/\d$/.test(m[1].trim()) ? { label: m[1].trim(), texto: m[2].trim() } : { label: '', texto: l };
  });
}

const TEXTOS_CONCLUSION = {
  normal: 'El partido se desarrolló con normalidad, sin incidentes que destacar.',
  obs: 'Con Observaciones.',
  tdd: 'Se eleva informe al Tribunal de Disciplina Deportiva por los hechos ocurridos durante el partido.',
  susp: 'El partido fue SUSPENDIDO. Se eleva informe al Tribunal de Disciplina Deportiva.',
};

// Estructura única del Acta: encabezado (conclusión) + secciones con ítems
// { label, texto, crudo }. De acá salen los 3 formatos (texto plano para el
// PDF y la planilla, pantalla con negrita, y WhatsApp), así nunca se
// desincronizan entre sí.
export function generarActaSecciones(datos) {
  const conclusiones = datos.conclusiones || [];
  const encabezado = conclusiones.map(c => TEXTOS_CONCLUSION[c]).filter(Boolean);
  const secciones = [];
  const agregar = (id, titulo, emoji, items) => { if (items.length) secciones.push({ id, titulo, emoji, items }); };

  // Inicio del partido
  const inicio = [];
  if (datos.comenzo_si === 'no') {
    inicio.push({ label: 'No comenzó en horario', texto: datos.motivo_inicio ? `Motivo: ${capitalizarFrase(datos.motivo_inicio)}.` : '' });
  }
  if (datos.protocolo === false) {
    inicio.push({ label: 'Protocolo de inicio no realizado', texto: (datos.protocolo_obs || '').trim() });
  }
  agregar('inicio', 'Inicio', '⚠️', inicio);

  // Control previo: primero lo que escribió el oficial ítem por ítem, y
  // después el resumen de ítems sin cumplir que NO tienen observación propia.
  const obsPrevio = itemsDeObservacion(datos.obs_previo);
  const cubiertosPrevio = new Set(obsPrevio.map(i => normal(i.label)));
  const sinCumplir = ITEMS_CONTROL_PREVIO
    .filter(([campo]) => !datos[campo])
    .filter(([, , etiqueta]) => !cubiertosPrevio.has(normal(etiqueta)))
    .map(([, label]) => label);
  agregar('previo', 'Control previo', '🔎', [
    ...obsPrevio,
    ...(sinCumplir.length ? [{ label: 'Ítems sin cumplir', texto: `${capitalizarFrase(sinCumplir.join(', '))}.` }] : []),
  ]);

  // Demoras (automáticas) y observaciones de horarios (manuales)
  const demoras = generarBloqueDesvios(datos).map(l => {
    if (l.startsWith('Entretiempo excedido')) {
      return { label: 'Entretiempo excedido', texto: `${datos.et_min ? `${datos.et_min} min. ` : ''}${l.replace(/^Entretiempo excedido\.\s*/, '')}`, crudo: true };
    }
    const i = l.indexOf(': ');
    return i > 0 ? { label: l.slice(0, i), texto: l.slice(i + 2), crudo: true } : { label: '', texto: l, crudo: true };
  });
  agregar('demoras', 'Demoras', '⏱️', demoras);
  agregar('horarios', 'Obs. de horarios', '📝', itemsDeObservacion(datos.obs_horarios));

  // Incumplimientos durante el partido
  const obsPartido = itemsDeObservacion(datos.obs_partido);
  const cubiertosPartido = new Set(obsPartido.map(i => normal(i.label)));
  const durante = ITEMS_DURANTE_PARTIDO
    .filter(([campo]) => datos[campo])
    .filter(([, , etiqueta]) => !cubiertosPartido.has(normal(etiqueta)))
    .map(([, label]) => label);
  agregar('incumplimientos', 'Incumplimientos', '🚨', [
    ...obsPartido,
    ...(durante.length ? [{ label: 'Durante el partido', texto: `${capitalizarFrase(durante.join(', '))}.` }] : []),
  ]);

  // Goles, tarjetas y cuerpo técnico: agrupados por club, un ítem por
  // renglón (en el WhatsApp van en su propia sección, arriba).
  const grupos = gruposGolesTarjetas(datos);
  if (grupos.length) secciones.push({ id: 'goles', titulo: 'Goles y tarjetas', emoji: '⚽', items: [], grupos });

  return { encabezado, secciones };
}

const textoItem = (it, datos) => (it.crudo ? it.texto : aOracion(it.texto, datos));

// Formato plano (PDF y planilla): cada ítem en su renglón con viñeta, la
// etiqueta en MAYÚSCULA (el PDF no admite negrita) y la explicación en
// minúscula.
function actaPlana(datos, { encabezado, secciones }) {
  const lineas = [...encabezado];
  secciones.forEach(sec => {
    sec.items.forEach(it => {
      const txt = textoItem(it, datos);
      lineas.push(it.label ? `• ${it.label.toUpperCase()}: ${txt}`.trim() : `• ${txt}`);
    });
    (sec.grupos || []).forEach(g => {
      lineas.push(g.titulo.toUpperCase());
      g.equipos.forEach(e => { lineas.push(e.club); e.items.forEach(i => lineas.push(`• ${i}`)); });
    });
  });
  return lineas.join('\n');
}

// Formato WhatsApp: secciones con título y línea en blanco entre ellas,
// etiqueta en *negrita*. La conclusión y los goles ya van en el resumen.
function actaWhatsApp(datos, { secciones }) {
  return secciones
    .filter(sec => sec.id !== 'goles')
    .map(sec => `${sec.emoji} *${sec.titulo}*\n` + sec.items.map(it => {
      const txt = textoItem(it, datos);
      return it.label ? `• *${capitalizarFrase(it.label)}:* ${txt}`.trim() : `• ${txt}`;
    }).join('\n'))
    .join('\n\n');
}

export function generarActaTexto(datos, opciones = {}) {
  const { paraWSP = false } = opciones;
  if ((datos.conclusiones || []).length === 0) {
    return 'Seleccioná la conclusión del partido para generar el acta.';
  }
  const estructura = generarActaSecciones(datos);
  return paraWSP ? actaWhatsApp(datos, estructura) : actaPlana(datos, estructura);
}
