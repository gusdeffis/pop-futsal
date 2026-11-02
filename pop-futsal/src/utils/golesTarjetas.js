// Goles y tarjetas del partido (pantalla GOLES) — textos para el Acta Final
// (que también va al PDF y a la planilla), para el WhatsApp de resumen y
// para el aviso por WhatsApp de lo que todavía no se envió.
//
// Estructura guardada en datos:
//   goles:    [{ id, lado: 'L'|'V', tiempo: 1|2, min, num, wsp }]
//   tarjetas: [{ id, lado: 'L'|'V', tiempo: 1|2, color: 'A'|'R', quien: 'JUG'|'DT'|'AUX', min, num, wsp }]
// `wsp` = ya avisado por WhatsApp. `min` es el minuto DENTRO de ese tiempo.
//
// El PDF oficial usa una fuente que no tiene emojis: por eso el texto del
// Acta va con palabras ("Amarilla"/"Roja") y los emojis solo en WhatsApp.

const texto = (v) => String(v ?? '').trim();
const tiempoDe = (x) => (Number(x.tiempo) === 2 ? 2 : 1); // registros sin tiempo (v117) cuentan como 1T

// Orden cronológico: 1T antes que 2T, y dentro de cada tiempo por minuto
// (los que no tienen minuto van al final de su tiempo, en orden de carga).
export function ordenCronologico(lista) {
  return [...lista]
    .map((x, i) => ({ x, i, t: tiempoDe(x), m: texto(x.min) === '' ? Infinity : Number(x.min) }))
    .sort((a, b) => (a.t - b.t) || (a.m - b.m) || (a.i - b.i))
    .map(({ x }) => x);
}

// "5' 1T", o solo "1T" si no tiene minuto.
const momento = (x) => `${texto(x.min) ? `${texto(x.min)}' ` : ''}${tiempoDe(x)}T`;
const jugador = (x) => (texto(x.num) ? `N° ${texto(x.num)}` : 's/n');

export const esCuerpoTecnico = (t) => t.quien === 'DT' || t.quien === 'AUX';

export function quienTarjeta(t) {
  if (t.quien === 'DT') return 'DT';
  if (t.quien === 'AUX') return 'Aux.';
  return texto(t.num) ? `N° ${texto(t.num)}` : 'Jugador';
}

export function penalesDe(datos) { return Array.isArray(datos.penales) ? datos.penales : []; }

export function golesDe(datos) { return Array.isArray(datos.goles) ? datos.goles : []; }
export function tarjetasDe(datos) { return Array.isArray(datos.tarjetas) ? datos.tarjetas : []; }

const club = (datos, lado) => (lado === 'L' ? datos.local : datos.visitante);

function porEquipo(datos, lista, describir, separador) {
  return ['L', 'V']
    .map(lado => {
      const del = ordenCronologico(lista.filter(x => x.lado === lado));
      return del.length ? `${club(datos, lado)}: ${del.map(describir).join(', ')}` : '';
    })
    .filter(Boolean)
    .join(separador);
}

const descGol = (g) => `${jugador(g)} (${momento(g)})`;
const descTarjetaActa = (t) => `${t.color === 'R' ? 'Roja' : 'Amarilla'} ${quienTarjeta(t)} (${momento(t)})`;
const descTarjetaWsp = (t) => `${t.color === 'R' ? '🟥' : '🟨'} ${quienTarjeta(t)} (${momento(t)})`;

// Goles, tarjetas y cuerpo técnico agrupados por tipo y por club, un ítem
// por renglón. `emojis` = formato WhatsApp (🟨/🟥); sin emojis = Acta/PDF
// ("Amarilla"/"Roja"). Los penales NO van acá: ya salen entre paréntesis
// en el resultado del partido.
export function gruposGolesTarjetas(datos, { emojis = false } = {}) {
  const tarjetas = tarjetasDe(datos);
  const descT = emojis ? descTarjetaWsp : descTarjetaActa;
  return [
    { id: 'goles', titulo: 'Goles', emoji: '⚽', lista: golesDe(datos), desc: descGol },
    { id: 'tarjetas', titulo: 'Tarjetas', emoji: '🟨🟥', lista: tarjetas.filter(t => !esCuerpoTecnico(t)), desc: descT },
    { id: 'ct', titulo: 'Cuerpo técnico', emoji: '🟨🟥', lista: tarjetas.filter(esCuerpoTecnico), desc: descT },
  ].filter(g => g.lista.length).map(g => ({
    id: g.id, titulo: g.titulo, emoji: g.emoji,
    equipos: ['L', 'V']
      .map(lado => ({ club: club(datos, lado), items: ordenCronologico(g.lista.filter(x => x.lado === lado)).map(g.desc) }))
      .filter(e => e.items.length),
  }));
}

// Renglones para el Acta Final / PDF (sin emojis):
//   GOLES / RACING / • N° 9 (5' 1T) / ...
export function lineasGolesTarjetasActa(datos) {
  const lineas = [];
  gruposGolesTarjetas(datos).forEach(g => {
    lineas.push(g.titulo.toUpperCase());
    g.equipos.forEach(e => { lineas.push(e.club); e.items.forEach(i => lineas.push(`• ${i}`)); });
  });
  return lineas;
}

// Bloque para el WhatsApp de resumen del partido. Vacío si no hay nada.
export function bloqueGolesTarjetasWSP(datos) {
  const grupos = gruposGolesTarjetas(datos, { emojis: true });
  if (!grupos.length) return '';
  return grupos.map(g => `${g.emoji} *${g.titulo}*\n` +
    g.equipos.map(e => `${e.club}\n${e.items.map(i => `• ${i}`).join('\n')}`).join('\n')).join('\n\n') + '\n';
}

// Lo que todavía no se avisó por WhatsApp (goles y tarjetas).
export function pendientesWsp(datos) {
  return {
    goles: golesDe(datos).filter(g => !g.wsp),
    tarjetas: tarjetasDe(datos).filter(t => !t.wsp),
  };
}

// Mensaje del botón de WhatsApp: todo lo pendiente, en orden cronológico,
// y el parcial actual al final. '' si no hay nada pendiente.
export function textoAvisoPendientes(datos) {
  const { goles, tarjetas } = pendientesWsp(datos);
  const items = ordenCronologico([
    ...goles.map(g => ({ ...g, _tipo: 'gol' })),
    ...tarjetas.map(t => ({ ...t, _tipo: 'tarjeta' })),
  ]);
  if (!items.length) return '';
  const lineas = items.map(x => x._tipo === 'gol'
    ? `⚽ GOL ${club(datos, x.lado)} — ${jugador(x)}, ${momento(x)}`
    : `${x.color === 'R' ? '🟥' : '🟨'} ${club(datos, x.lado)} — ${quienTarjeta(x)}, ${momento(x)}`);
  const todos = golesDe(datos);
  const pl = todos.filter(g => g.lado === 'L').length;
  const pv = todos.filter(g => g.lado === 'V').length;
  return `${lineas.join('\n')}\nParcial: ${datos.local} ${pl} - ${pv} ${datos.visitante}`;
}
