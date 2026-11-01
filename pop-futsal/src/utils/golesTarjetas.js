// Goles y tarjetas del partido (pantalla GOL) — textos para el Acta Final
// (que también va al PDF y a la planilla) y para el WhatsApp de resumen.
//
// Estructura guardada en datos:
//   goles:    [{ id, lado: 'L'|'V', num, min, wsp }]
//   tarjetas: [{ id, lado: 'L'|'V', color: 'A'|'R', quien: 'JUG'|'DT'|'AUX', num, min }]
//
// El PDF oficial usa una fuente que no tiene emojis: por eso el texto del
// Acta va con palabras ("Amarilla"/"Roja") y los emojis solo en WhatsApp.

const texto = (v) => String(v ?? '').trim();

// Ordena por minuto (los que no tienen minuto van al final, en el orden
// en que se cargaron).
function porMinuto(lista) {
  return [...lista]
    .map((x, i) => ({ x, i, m: texto(x.min) === '' ? Infinity : Number(x.min) }))
    .sort((a, b) => (a.m - b.m) || (a.i - b.i))
    .map(({ x }) => x);
}

const minuto = (x) => (texto(x.min) ? ` (${texto(x.min)}')` : '');

export function quienTarjeta(t) {
  if (t.quien === 'DT') return 'DT';
  if (t.quien === 'AUX') return 'Aux.';
  return texto(t.num) ? `N° ${texto(t.num)}` : 'Jugador';
}

function lineaPorEquipo(datos, lista, describir) {
  const partes = ['L', 'V']
    .map(lado => {
      const delLado = porMinuto(lista.filter(x => x.lado === lado));
      if (delLado.length === 0) return '';
      const club = lado === 'L' ? datos.local : datos.visitante;
      return `${club}: ${delLado.map(describir).join(', ')}`;
    })
    .filter(Boolean);
  return partes.join(' — ');
}

export function golesDe(datos) { return Array.isArray(datos.goles) ? datos.goles : []; }
export function tarjetasDe(datos) { return Array.isArray(datos.tarjetas) ? datos.tarjetas : []; }

// Líneas para el Acta Final / PDF (sin emojis).
export function lineasGolesTarjetasActa(datos) {
  const lineas = [];
  const goles = golesDe(datos);
  const tarjetas = tarjetasDe(datos);
  if (goles.length) {
    lineas.push(`Goles: ${lineaPorEquipo(datos, goles, g => `${texto(g.num) ? `N° ${texto(g.num)}` : 's/n'}${minuto(g)}`)}.`);
  }
  if (tarjetas.length) {
    lineas.push(`Tarjetas: ${lineaPorEquipo(datos, tarjetas, t => `${t.color === 'R' ? 'Roja' : 'Amarilla'} ${quienTarjeta(t)}${minuto(t)}`)}.`);
  }
  return lineas;
}

// Bloque para el WhatsApp de resumen (con emojis). Vacío si no hay nada.
export function bloqueGolesTarjetasWSP(datos) {
  const goles = golesDe(datos);
  const tarjetas = tarjetasDe(datos);
  if (!goles.length && !tarjetas.length) return '';
  let out = '';
  if (goles.length) {
    out += `⚽ Goles:\n` + ['L', 'V'].map(lado => {
      const del = porMinuto(goles.filter(g => g.lado === lado));
      if (!del.length) return '';
      const club = lado === 'L' ? datos.local : datos.visitante;
      return `${club}: ${del.map(g => `${texto(g.num) ? `N° ${texto(g.num)}` : 's/n'}${minuto(g)}`).join(', ')}\n`;
    }).join('');
  }
  if (tarjetas.length) {
    out += `Tarjetas:\n` + ['L', 'V'].map(lado => {
      const del = porMinuto(tarjetas.filter(t => t.lado === lado));
      if (!del.length) return '';
      const club = lado === 'L' ? datos.local : datos.visitante;
      return `${club}: ${del.map(t => `${t.color === 'R' ? '🟥' : '🟨'} ${quienTarjeta(t)}${minuto(t)}`).join(', ')}\n`;
    }).join('');
  }
  return out;
}

// Mensaje del botón de WhatsApp de cada gol, con el parcial a ese minuto.
export function textoAvisoGol(datos, gol) {
  const goles = golesDe(datos);
  const m = texto(gol.min) === '' ? null : Number(gol.min);
  const hasta = m == null ? goles : goles.filter(g => texto(g.min) === '' || Number(g.min) <= m);
  const pl = hasta.filter(g => g.lado === 'L').length;
  const pv = hasta.filter(g => g.lado === 'V').length;
  const club = gol.lado === 'L' ? datos.local : datos.visitante;
  return `⚽ GOL de ${club}` +
    (texto(gol.num) ? ` — Jugador N° ${texto(gol.num)}` : '') +
    (texto(gol.min) ? `, min ${texto(gol.min)}'` : '') +
    `\nParcial: ${datos.local} ${pl} - ${pv} ${datos.visitante}`;
}
