// La hoja "Fixture" de POP-Datos tiene 12 columnas (A-L), en este orden
// exacto — cualquier cambio acá tiene que reflejar un cambio real en la
// hoja, si no se desalinea todo.
import { formatearDia, formatearHora, esISO } from './fechasSheet';

const COLUMNAS_FIXTURE = [
  'torneo', 'division', 'fecha_nro', 'local', 'visitante', 'estadio',
  'dia', 'hora', 'partido_nro', 'oficial_asignado', 'se_cubre', 'motivo',
];

// Convierte las filas crudas que devuelve el Apps Script (array de arrays)
// en objetos con nombre de campo, más un índice de fila original (para
// poder guardar de vuelta sin perder el orden). Fecha N° y Partido N° se
// fuerzan siempre a texto: Google Sheets puede devolverlos como número si
// la celda está formateada así, y comparar un número contra el texto que
// sale de un <select> (siempre texto) nunca da igual aunque "parezcan" lo
// mismo — mismo tipo de bug que ya se corrigió antes con Fecha N° en Panel
// Administrador.
export function parsearFixture(filasCrudas) {
  return (filasCrudas || []).map((fila, i) => {
    const obj = { _filaIndex: i };
    COLUMNAS_FIXTURE.forEach((campo, j) => { obj[campo] = fila[j] ?? ''; });
    obj.fecha_nro = obj.fecha_nro === '' ? '' : String(obj.fecha_nro).trim();
    obj.partido_nro = obj.partido_nro === '' ? '' : String(obj.partido_nro).trim();
    // Día y Hora pueden venir de Sheets como Date serializado a ISO (ej.
    // "2026-08-15T03:00:00.000Z" para el día, o "1899-12-31T00:16:48.000Z"
    // para la hora — Sheets ancla los valores de solo-hora en su propia
    // fecha "cero", 30/31 de diciembre de 1899, algo del todo normal y
    // consistente, no un dato roto). Mismo mecanismo que ya se usa en
    // POP-Partidos: se convierte a DD/MM/AAAA y HH:MM antes de usarlo en
    // cualquier lado — sin esto, esos objetos de fecha se filtraban crudos
    // hasta el WSP, el PDF, y todo lo que mostrara el partido.
    obj.dia = formatearDia(obj.dia);
    obj.hora = formatearHora(obj.hora);
    // Cualquier campo de texto libre puede sufrir lo mismo que Estadio: si
    // en algún momento Sheets lo interpretó como fecha (pasa con nombres
    // tipo "17 de Agosto", sea como club o como estadio), Apps Script lo
    // devuelve serializado igual que Día/Hora — acá no hay forma de
    // "traducirlo" de vuelta al texto original (esa información ya se
    // perdió), así que se trata como vacío en vez de mostrar la fecha rota.
    ['torneo', 'local', 'visitante', 'estadio', 'oficial_asignado', 'motivo'].forEach(campo => {
      if (esISO(obj[campo])) obj[campo] = '';
    });
    return obj;
  });
}

// Inverso de parsearFixture: arma de nuevo el array de arrays en el mismo
// orden de columnas, para mandarlo a guardarListaAdmin('Fixture', filas).
export function serializarFixture(partidos) {
  return partidos.map(p => COLUMNAS_FIXTURE.map(campo => p[campo] ?? ''));
}

// Clave única de un partido del fixture: Torneo + Fecha N° + Local +
// Visitante — con esto (y no menos, ver el caso de ida/vuelta) se puede
// encontrar el partido correcto sin confundirlo con otro entre los mismos
// dos equipos en otra fecha.
export function claveFixture(torneo, fechaNro, local, visitante) {
  const norm = (s) => String(s || '').trim().toUpperCase();
  return `${norm(torneo)}||${norm(fechaNro)}||${norm(local)}||${norm(visitante)}`;
}

// Busca en Clubes (filas crudas de POP-Datos, columnas Nombre/Categoria/
// Estadio/Estadio2/Estadio3) los 3 estadios posibles de un club.
export function estadiosDelClub(nombreClub, filasClubes) {
  const norm = (s) => String(s || '').trim().toUpperCase();
  const fila = (filasClubes || []).find(f => norm(f[0]) === norm(nombreClub));
  if (!fila) return { principal: '', alt2: '', alt3: '' };
  return { principal: fila[2] || '', alt2: fila[3] || '', alt3: fila[4] || '' };
}

// Prioridad para precargar el Estadio (usada tanto en Pantalla1 como en
// Asignar Partidos): 1) el que ya asignó el coordinador para ESE partido
// puntual, 2) el estadio por defecto del club Local, 3) sin default —
// queda vacío para que se elija de la lista general o se escriba a mano.
export function estadioPorDefecto({ torneo, fechaNro, local, visitante, fixture, clubes }) {
  const clave = claveFixture(torneo, fechaNro, local, visitante);
  const partidosFixture = parsearFixture(fixture);
  const asignado = partidosFixture.find(p => claveFixture(p.torneo, p.fecha_nro, p.local, p.visitante) === clave);
  if (asignado?.estadio) return asignado.estadio;

  const { principal } = estadiosDelClub(local, clubes);
  return principal || '';
}

// Un partido del fixture está "pendiente" para un oficial si: está
// asignado a su nombre, se cubre (no es SI->NO), y todavía no aparece
// cargado en POP-Partidos (mismo cruce de 4 campos: Torneo+Fecha+Local+
// Visitante). No hace falta ninguna columna extra de "ya cargado": alcanza
// con mirar si ya está en la planilla real.
//
// El nombre se compara por APELLIDO, no por nombre completo: en la
// pantalla de Asignar Partidos el campo "Oficial" guarda solo el
// apellido (por espacio en la tarjeta compacta), pero el que se loguea
// lo hace con su nombre completo — comparando texto exacto nunca iban a
// coincidir. Esto era un bug real: los partidos asignados quedaban
// guardados bien, pero nunca aparecían en el aviso de "partidos
// pendientes" del oficial correspondiente.
function soloApellido(nombreCompleto) {
  const partes = String(nombreCompleto || '').trim().split(/\s+/);
  return partes[partes.length - 1] || '';
}

export function partidosPendientes(nombreOficial, fixtureFilas, partidosYaCargados) {
  const norm = (s) => String(s || '').trim().toUpperCase();
  const apellidoOficial = norm(soloApellido(nombreOficial));
  const clavesCargadas = new Set(
    (partidosYaCargados || []).map(p => claveFixture(p['Torneo'], p['Fecha N°'], p['Local'], p['Visitante']))
  );
  return parsearFixture(fixtureFilas).filter(p => {
    if (norm(soloApellido(p.oficial_asignado)) !== apellidoOficial) return false;
    if (norm(p.se_cubre) === 'NO') return false;
    const clave = claveFixture(p.torneo, p.fecha_nro, p.local, p.visitante);
    return !clavesCargadas.has(clave);
  });
}
