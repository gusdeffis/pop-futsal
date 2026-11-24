// POPA Futsal - Recibe partidos finalizados desde la app y los guarda como
// una fila en esta planilla, con (casi) todos los datos cargados en la app.
//
// IMPORTANTE: el partido se identifica por el campo "_id" que manda la app
// (se genera una sola vez, al crear el partido, y NUNCA cambia aunque
// después edites Torneo, Fecha N°, Local o Visitante). Antes se
// recalculaba combinando esos 4 datos, y por eso si corregías la Fecha N°
// de un partido ya enviado, se creaba una fila nueva en vez de actualizar
// la existente. Con el _id fijo esto ya no puede volver a pasar.
//
// CORRECCIÓN (LockService): si dos envíos del mismo partido llegan muy
// seguidos (ej. el oficial reenvía sin esperar la confirmación del
// primero), podían "pisarse" — los dos buscaban si ya existía la fila AL
// MISMO TIEMPO, ninguno la encontraba todavía, y los dos terminaban
// creando una fila nueva cada uno (quedaba duplicado). El bloqueo de acá
// abajo hace que, si llegan dos envíos pegados, el segundo ESPERE a que
// el primero termine del todo antes de arrancar su propia búsqueda — así
// el segundo sí encuentra la fila del primero y actualiza en vez de
// duplicar.
//
// CORRECCIÓN (formato de celda como texto): caso real detectado — el
// oficial carga "20:30" en Hora, se guarda bien VISUALMENTE (la barra de
// fórmulas muestra "20:30"), pero Sheets igual la reinterpreta por dentro
// como su propio tipo de Hora. Como esa celda usa una fecha base de 1899
// (para valores "solo hora", sin fecha), el huso horario HISTÓRICO de esa
// fecha (distinto al huso horario actual de Argentina, por temas de antes
// de que existieran los husos estandarizados) hace que al leerla de
// vuelta aparezca corrida — SIEMPRE el mismo corrimiento, no al azar. La
// solución es la misma que ya se usó en el script de Datos: forzar texto
// plano ANTES de escribir, así Sheets nunca la reinterpreta.
//
// AGREGADO (penales, nov 2026): la app manda pen_local / pen_visitante
// (definición por penales). Se guardan en las columnas "Pen. Local" y
// "Pen. Visita", que se buscan POR NOMBRE en la fila 1. Si no existen, el
// script las crea solo al final, DESPUÉS de "Demora Inicio (min)" (que es
// manual y NO se toca). Las 89 columnas de siempre no cambian de lugar.
//
// AGREGADO (estado, nov 2026): la app ahora manda el partido también
// MIENTRAS se carga (estado_envio = "EN CURSO"), y al tocar Finalizar
// Partido ("FINALIZADO"). Se guarda en la columna "Estado" (se crea sola al
// final, igual que los penales). Las versiones viejas de la app no mandan
// estado: cuenta como "FINALIZADO", que es lo que ya hacían. Un envío
// "EN CURSO" NUNCA pisa una fila que ya está "FINALIZADO".

var COLUMNAS = [
  'Guardado', 'Oficial AFA', 'Torneo', 'Fecha N°', 'División', 'Categoría',
  'Día', 'Hora', 'Partido N°', 'Local', 'Visitante', 'Estadio',
  'Res. Local', 'Res. Visitante', 'Árbitro', 'Delegado Local', 'Delegado Visita',
  'Planillas OK', 'Demora Planillas L', 'Demora Planillas V',
  'Formación Inicial OK', 'Demora Form. Inicial L', 'Demora Form. Inicial V',
  'Campo Buen Estado', 'Iluminación OK', 'Mesa Crono OK', 'Tablero OK',
  'Redes Perimetrales OK', 'Altura OK', 'Pared Protecciones OK', 'Meta Anclada OK',
  'Vestuario Local OK', 'Vestuario Visita OK', 'Vestuario Árbitro OK',
  'Baños OK', 'Limpieza OK', 'Camiseta c/Apellido OK', 'Balón Nuevo OK',
  'Del. Veedor Local OK', 'Del. Veedor Visita OK', 'Seguridad OK', 'Médico OK',
  'Obs. Control Previo',
  'Ingreso Campo', 'Ingreso Local', 'Ingreso Visita', 'Protocolo Inicio OK',
  'Comenzó en Hora', 'Motivo Demora Inicio', 'Hora Inicio Real',
  'Final 1°T', 'Inicio 2°T', 'ET min.', 'ET Excedido', 'Motivo Demora ET',
  'Final Partido', 'Obs. Horarios',
  'Tablero con Fallas', 'Sin Balón Backup', 'Sin Médico', 'Sin Policía',
  'Calent. Suplentes - Hubo Incumpl.',
  'Fuera de Zona L', 'Fuera de Zona V', 'Sin Chalecos L', 'Sin Chalecos V',
  'Con Balones L', 'Con Balones V', 'Más de 5 L', 'Más de 5 V',
  'Iluminación Obs.', 'Humedad', 'Goteras', 'Arcos/Redes', 'Tribunas',
  'Invasión de Campo', 'Incidentes', 'Agresiones', 'Gresca Generalizada',
  'Público Local', 'Público Visita', 'Obs. Partido',
  'Partido Normal', 'Con Observaciones', 'Informe al TDD', 'Suspensión',
  'Acta Final', 'Acta - Texto Adicional',
  'ID App',
];

var FORMATO_TEXTO_PLANO = '@';

function siNo(v) { return v ? 'SI' : ''; }

function salida(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    return salida({ ok: false, error: 'Ocupado por otro envío, intentá de nuevo en unos segundos: ' + String(lockErr) });
  }

  try {
    var d = JSON.parse(e.postData.contents);
    var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Partidos')
      || crearHojaPartidos();

    var id = d._id || [d.torneo, d.fecha_nro, d.local, d.visitante].join('||');
    var estado = String(d.estado_envio || 'FINALIZADO').toUpperCase() === 'EN CURSO' ? 'EN CURSO' : 'FINALIZADO';

    var fila = [
      new Date(), d.oficial_logueado || '', d.torneo || '', d.fecha_nro || '', d.division || '', d.cat || '',
      d.dia || '', d.hora || '', d.nro || '', d.local || '', d.visitante || '', d.estadio || '',
      d.res_local || '', d.res_visitante || '', d.arbitro || '', d.deleg_l || '', d.deleg_v || '',
      siNo(d.plan_cred_ok), d.plan_cred_dem_l || '', d.plan_cred_dem_v || '',
      siNo(d.form_ini_ok), d.form_ini_dem_l || '', d.form_ini_dem_v || '',
      siNo(d.buen_estado), siNo(d.ilum), siNo(d.mesa_crono), siNo(d.tablero),
      siNo(d.redes_per), siNo(d.altura), siNo(d.pared_prot), siNo(d.meta_anclada),
      siNo(d.vest_l), siNo(d.vest_v), siNo(d.vest_arb),
      siNo(d.banios), siNo(d.limpieza), siNo(d.camiseta), siNo(d.balon_nuevo),
      siNo(d.del_veedor_l), siNo(d.del_veedor_v), siNo(d.seguridad), siNo(d.medico),
      d.obs_previo || '',
      d.ingreso || '', d.ingreso_local || '', d.ingreso_visita || '', siNo(d.protocolo),
      d.comenzo_si === 'si' ? 'SI' : (d.comenzo_si === 'no' ? 'NO' : ''), d.motivo_inicio || '', d.hora_real || '',
      d.final_1t || '', d.inicio_2t || '', d.et_min || '', siNo(d.excedido), d.motivo_et || '',
      d.final_partido || '', d.obs_horarios || '',
      siNo(d.tablero_fallas), siNo(d.sin_balon), siNo(d.medico_obs), siNo(d.policia),
      siNo(d.calent_supl),
      siNo(d.fuera_zona_l), siNo(d.fuera_zona_v), siNo(d.sin_chalecos_l), siNo(d.sin_chalecos_v),
      siNo(d.con_balones_l), siNo(d.con_balones_v), siNo(d.mas5_l), siNo(d.mas5_v),
      siNo(d.ilum_obs), siNo(d.humedad), siNo(d.goteras), siNo(d.arcos_obs), siNo(d.tribunas),
      siNo(d.invasion), siNo(d.incidentes), siNo(d.agresiones), siNo(d.gresca),
      siNo(d.publico_l), siNo(d.publico_v), d.obs_partido || '',
      siNo((d.conclusiones || []).indexOf('normal') > -1),
      siNo((d.conclusiones || []).indexOf('obs') > -1),
      siNo((d.conclusiones || []).indexOf('tdd') > -1),
      siNo((d.conclusiones || []).indexOf('susp') > -1),
      d.acta_texto || '', d.acta_extra || '',
      id,
    ];

    var idCol = COLUMNAS.length;
    var datosHoja = hoja.getDataRange().getValues();
    var filaExistente = -1;
    for (var i = 1; i < datosHoja.length; i++) {
      if (datosHoja[i][idCol - 1] === id) { filaExistente = i + 1; break; }
    }

    // Un envío automático "EN CURSO" que llega tarde no puede pisar un
    // partido que ya se finalizó.
    if (filaExistente > 0 && estado === 'EN CURSO') {
      var colEstado = columnaPorNombre(hoja, 'Estado');
      if (colEstado > 0 && String(hoja.getRange(filaExistente, colEstado).getValue()).toUpperCase() === 'FINALIZADO') {
        return salida({ ok: true, actualizado: false, ignorado: 'ya finalizado' });
      }
    }

    var rangoDestino = filaExistente > 0
      ? hoja.getRange(filaExistente, 1, 1, fila.length)
      : hoja.getRange(hoja.getLastRow() + 1, 1, 1, fila.length);
    rangoDestino.setNumberFormat(FORMATO_TEXTO_PLANO);
    rangoDestino.setValues([fila]);

    // Penales: columnas extra buscadas por nombre (se crean si faltan).
    var filaDestino = rangoDestino.getRow();
    escribirColumnaExtra(hoja, 'Pen. Local', filaDestino, d.pen_local);
    escribirColumnaExtra(hoja, 'Pen. Visita', filaDestino, d.pen_visitante);
    escribirColumnaExtra(hoja, 'Estado', filaDestino, estado);

    return salida({ ok: true, actualizado: filaExistente > 0 });
  } catch (err) {
    return salida({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {
    var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Partidos');
    if (!hoja) return salida({ ok: true, partidos: [] });
    var datos = hoja.getDataRange().getValues();
    if (datos.length < 2) return salida({ ok: true, partidos: [] });
    var encabezados = datos[0];
    var partidos = [];
    for (var i = 1; i < datos.length; i++) {
      var obj = {};
      for (var j = 0; j < encabezados.length; j++) {
        obj[encabezados[j]] = datos[i][j];
      }
      partidos.push(obj);
    }
    return salida({ ok: true, partidos: partidos });
  } catch (err) {
    return salida({ ok: false, error: String(err) });
  }
}

// Número de columna (1, 2, ...) cuyo encabezado en la fila 1 es `nombre`; 0 si no existe.
function columnaPorNombre(hoja, nombre) {
  var ultimaCol = Math.max(hoja.getLastColumn(), 1);
  return hoja.getRange(1, 1, 1, ultimaCol).getValues()[0].indexOf(nombre) + 1;
}

// Escribe un valor en la columna cuyo encabezado (fila 1) es `nombre`. Si
// esa columna no existe, la agrega al final de la hoja (nunca encima de
// una columna que ya tenga encabezado).
function escribirColumnaExtra(hoja, nombre, fila, valor) {
  var ultimaCol = Math.max(hoja.getLastColumn(), 1);
  var encabezados = hoja.getRange(1, 1, 1, ultimaCol).getValues()[0];
  var col = encabezados.indexOf(nombre) + 1;
  if (col === 0) {
    col = ultimaCol + 1;
    if (col > hoja.getMaxColumns()) {
      hoja.insertColumnsAfter(hoja.getMaxColumns(), col - hoja.getMaxColumns());
    }
    hoja.getRange(1, col).setValue(nombre).setFontWeight('bold');
  }
  var celda = hoja.getRange(fila, col);
  celda.setNumberFormat(FORMATO_TEXTO_PLANO);
  celda.setValue(valor === undefined || valor === null ? '' : String(valor));
}

function crearHojaPartidos() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.insertSheet('Partidos');
  hoja.appendRow(COLUMNAS);
  hoja.getRange(1, 1, 1, COLUMNAS.length).setFontWeight('bold');
  hoja.setFrozenRows(1);
  return hoja;
}

// ============================================================
// HERRAMIENTA DE UN SOLO USO — corrige Día/Hora guardados de
// cualquiera de las 2 formas problemáticas: como número serial
// de Sheets/Excel (celda "#########"), o como Fecha/Date nativa
// de Sheets. Cubre los 2 casos en un solo pase. Incluye un
// diagnóstico: si alguna celda no matchea ninguno de los 2
// casos, lo anota en el log para saber qué es de verdad.
// ============================================================
//
// CÓMO USARLA:
// 1. Guardá el script (ícono de guardar, o Ctrl+S).
// 2. En la barra de arriba del editor, elegí "corregirHorariosViejos"
//    en el desplegable (al lado del botón ▶ Ejecutar).
// 3. Tocá "Ejecutar". Si pide autorización, es normal (tu propio script).
// 4. Cuando termine, mirá el log: Ver → Registros (o Ctrl+Enter).

function corregirHorariosViejos() {
  var COLUMNAS_FECHA = ['Día'];
  var COLUMNAS_HORA = [
    'Hora', 'Ingreso Campo', 'Ingreso Local', 'Ingreso Visita',
    'Hora Inicio Real', 'Final 1°T', 'Inicio 2°T', 'Final Partido',
  ];
  var EPOCH_SHEETS_MS = Date.UTC(1899, 11, 30);

  function pad(n) { return String(n).length < 2 ? '0' + n : String(n); }

  function textoDesdeFecha(d) {
    return { dia: pad(d.getUTCDate()) + '/' + pad(d.getUTCMonth() + 1) + '/' + d.getUTCFullYear(),
             hora: pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) };
  }

  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Partidos');
  if (!hoja) { Logger.log('No existe la hoja Partidos.'); return; }

  var ultimaFila = hoja.getLastRow();
  var ultimaCol = hoja.getLastColumn();
  if (ultimaFila < 2) { Logger.log('No hay filas de datos.'); return; }

  var encabezados = hoja.getRange(1, 1, 1, ultimaCol).getValues()[0];
  var corregidas = 0;
  var revisadas = 0;
  var diagnosticoImpreso = 0;

  function corregirColumna(nombreCol, esDia) {
    var col = encabezados.indexOf(nombreCol) + 1;
    if (col === 0) { Logger.log('No se encontró la columna "' + nombreCol + '".'); return; }
    var rango = hoja.getRange(2, col, ultimaFila - 1, 1);
    var valores = rango.getValues();
    for (var i = 0; i < valores.length; i++) {
      revisadas++;
      var v = valores[i][0];
      var partes = null;

      if (typeof v === 'number') {
        partes = textoDesdeFecha(new Date(EPOCH_SHEETS_MS + v * 86400000));
      } else if (Object.prototype.toString.call(v) === '[object Date]') {
        partes = textoDesdeFecha(v);
      } else {
        if (diagnosticoImpreso < 5 && v !== '' && v !== null) {
          Logger.log('DIAGNÓSTICO - Columna "' + nombreCol + '", fila ' + (2 + i) + ': tipo=' + (typeof v) + ', valor=' + JSON.stringify(v));
          diagnosticoImpreso++;
        }
        continue;
      }

      var celda = hoja.getRange(2 + i, col);
      celda.setNumberFormat('@');
      celda.setValue(esDia ? partes.dia : partes.hora);
      corregidas++;
    }
  }

  COLUMNAS_FECHA.forEach(function (c) { corregirColumna(c, true); });
  COLUMNAS_HORA.forEach(function (c) { corregirColumna(c, false); });

  Logger.log('Revisadas ' + revisadas + ' celdas en total. Se corrigieron ' + corregidas + ' celdas de fecha/hora.');
}