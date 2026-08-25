import { esSi } from './indicadoresClub';
import { formatearDia, formatearHora } from './fechasSheet';

// Reconstruye el objeto "datos" (igual forma que usa Pantalla1-5) a partir
// de una fila de la hoja "Partidos" de la planilla compartida — así el
// Panel Administrador puede generar el mismo PDF/WhatsApp que ya arma el
// oficial que cargó el partido, sin tener que volver a cargarlo a mano.
//
// OJO: el mapeo real vive en el Apps Script (que traduce datos.* -> columnas
// de la planilla al guardar), y no es visible desde acá. Este mapeo es una
// reconstrucción por nombre de columna — se usa solo para generar
// PDF/WhatsApp (no pisa nada en la planilla), así que un desajuste puntual
// se corrige simplemente regenerando el archivo, no corrompe datos reales.
//
// CORRECCIÓN (bug real, con oficiales ya usando la app): Google Sheets
// reinterpreta texto como "20:00" o una fecha como su propio tipo interno
// de Hora/Fecha (mismo problema que tuvimos con Fixture) — al leer la
// planilla de vuelta, esas celdas vienen como fechas serializadas
// ("1899-12-31T20:00:00.000Z" para una hora, por ejemplo), no como texto
// legible. Por eso Día y todos los horarios pasan por formatearDia/
// formatearHora (ya usadas en PantallaAdmin/PantallaInformes) antes de
// mostrarse acá — el dato en sí no se pierde (el PDF que ya mandó el
// oficial, generado ANTES de este viaje por Sheets, sigue bien), pero al
// re-leerlo para editar hay que traducirlo de vuelta.
//
// Campos que NO se pueden reconstruir porque la planilla no los guarda
// (solo quedan los horarios crudos, no los minutos de demora ya calculados):
// regreso_local_dem, regreso_visita_dem. Se recalculan cuando se puede
// (ingreso_local_dem/ingreso_visita_dem, a partir de Hora e Ingreso Local/Visita).
export function sheetRowToDatos(p) {
  const g = (col) => p[col] ?? '';
  const gDia = (col) => formatearDia(g(col));
  const gHora = (col) => formatearHora(g(col));
  const check = (col) => esSi(p[col]);

  // Demora de ingreso al campo = diferencia contra la referencia (Hora - 5
  // min), igual fórmula que ya usa la app al cargar un partido nuevo.
  const demoraIngreso = (horaIngreso) => {
    const horaPartido = gHora('Hora');
    if (!horaPartido || !horaIngreso) return '';
    const [h1, m1] = String(horaPartido).split(':').map(Number);
    const [h2, m2] = String(horaIngreso).split(':').map(Number);
    if ([h1, m1, h2, m2].some(Number.isNaN)) return '';
    const refMin = (h1 * 60 + m1) - 5;
    const realMin = h2 * 60 + m2;
    const dif = realMin - refMin;
    return dif > 0 ? String(dif) : '0';
  };

  const conclusiones = [];
  if (check('Partido Normal')) conclusiones.push('normal');
  if (check('Con Observaciones')) conclusiones.push('obs');
  if (check('Informe al TDD')) conclusiones.push('tdd');
  if (check('Suspensión')) conclusiones.push('susp');

  return {
    _id: g('ID'),
    torneo: g('Torneo'), fecha_nro: g('Fecha N°'), division: g('División') || 'M',
    cat: g('Categoría'), dia: gDia('Día'), hora: gHora('Hora'), nro: g('Partido N°'),
    local: g('Local'), visitante: g('Visitante'), estadio: g('Estadio'),
    res_local: g('Res. Local'), res_visitante: g('Res. Visitante'), arbitro: g('Árbitro'),
    deleg_l: g('Delegado Local'), deleg_v: g('Delegado Visita'), oficial_afa: g('Oficial AFA'),

    plan_cred_ok: check('Planillas OK'), plan_cred_dem_l: g('Demora Planillas L'), plan_cred_dem_v: g('Demora Planillas V'),
    form_ini_ok: check('Formación Inicial OK'), form_ini_dem_l: g('Demora Form. Inicial L'), form_ini_dem_v: g('Demora Form. Inicial V'),
    buen_estado: check('Campo Buen Estado'), ilum: check('Iluminación OK'), mesa_crono: check('Mesa Crono OK'),
    tablero: check('Tablero OK'), redes_per: check('Redes Perimetrales OK'), altura: check('Altura OK'),
    pared_prot: check('Pared Protecciones OK'), meta_anclada: check('Meta Anclada OK'),
    banios: check('Baños OK'), limpieza: check('Limpieza OK'), camiseta: check('Camiseta c/Apellido OK'),
    balon_nuevo: check('Balón Nuevo OK'),
    vest_l: check('Vestuario Local OK'), vest_v: check('Vestuario Visita OK'), vest_arb: check('Vestuario Árbitro OK'),
    del_veedor_l: check('Del. Veedor Local OK'), del_veedor_v: check('Del. Veedor Visita OK'),
    seguridad: check('Seguridad OK'), medico: check('Médico OK'),
    obs_previo: g('Obs. Control Previo'),

    ingreso: gHora('Ingreso Campo'), protocolo: check('Protocolo Inicio OK'),
    comenzo_si: g('Comenzó en Hora') ? check('Comenzó en Hora') : null,
    motivo_inicio: g('Motivo Demora Inicio'), motivo_inicio_pdf: g('Motivo Demora Inicio'),
    hora_real: gHora('Hora Inicio Real'), final_1t: gHora('Final 1°T'), inicio_2t: gHora('Inicio 2°T'),
    et_min: g('ET min.'), excedido: check('ET Excedido'), desvio_inicio: '',
    motivo_et: g('Motivo Demora ET'), motivo_et_pdf: g('Motivo Demora ET'),
    final_partido: gHora('Final Partido'), duracion_partido: '',
    obs_horarios: g('Obs. Horarios'),
    ingreso_local: gHora('Ingreso Local'), ingreso_visita: gHora('Ingreso Visita'),
    ingreso_local_dem: demoraIngreso(gHora('Ingreso Local')), ingreso_visita_dem: demoraIngreso(gHora('Ingreso Visita')),
    regreso_local: '', regreso_visita: '', regreso_local_dem: '', regreso_visita_dem: '',

    tablero_fallas: check('Tablero con Fallas'), sin_balon: check('Sin Balón Backup'),
    medico_obs: check('Sin Médico'), policia: check('Sin Policía'),
    calent_supl: check('Calent. Suplentes - Hubo Incumpl.'),
    fuera_zona_l: check('Fuera de Zona L'), fuera_zona_v: check('Fuera de Zona V'),
    sin_chalecos_l: check('Sin Chalecos L'), sin_chalecos_v: check('Sin Chalecos V'),
    con_balones_l: check('Con Balones L'), con_balones_v: check('Con Balones V'),
    mas5_l: check('Más de 5 L'), mas5_v: check('Más de 5 V'),
    ilum_obs: check('Iluminación Obs.'), humedad: check('Humedad'), goteras: check('Goteras'),
    arcos_obs: check('Arcos/Redes'), tribunas: check('Tribunas'),
    invasion: check('Invasión de Campo'), incidentes: check('Incidentes'),
    agresiones: check('Agresiones'), gresca: check('Gresca Generalizada'),
    publico_l: check('Público Local'), publico_v: check('Público Visita'),
    obs_partido: g('Obs. Partido'),

    conclusiones,
    acta_extra: g('Acta - Texto Adicional'),
  };
}
