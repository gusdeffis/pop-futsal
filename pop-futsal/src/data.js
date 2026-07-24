// POP Futsal - Datos base
// Las listas DEFAULT_* son el respaldo (fallback) para cuando no hay conexión
// o falla la carga desde Google Sheets. Salen del AcroForm oficial POP_2026_v62.pdf.
// La fuente "viva" son las hojas de Google Sheets listadas en SHEET_URLS (ver useListas.js).

export const DEFAULT_TORNEOS = [
  'Camp. de 1° A', 'Camp. de 1° B', 'Camp. de 1° C', 'Camp. de 1° D',
  'Copa Argentina', 'Copa de Oro', 'Copa de Plata',
  'Copa Futuro Oro', 'Copa Futuro Plata', 'Final Four',
  'Inferiores', 'Inferiores A', 'Inferiores B', 'Inferiores C', 'Inferiores D',
  'Liga Nacional', 'Supercopa', 'Torneo Integración',
];

export const DEFAULT_FECHAS = [
  ...Array.from({ length: 40 }, (_, i) => String(i + 1)),
  'PO', '32°', '16°', '8°', '4°', 'Semi', 'Final',
];

export const DEFAULT_CATEGORIAS = ['1a', '3a', '4a', '5a', '6a', '7a', '8a'];

export const DEFAULT_CLUBES = [
  '17 DE AGOSTO', 'AMERICA DEL SUD', 'BARRACAS CENTRAL', 'BOCA',
  'CAMIONEROS', 'EST. PORTEÑO', 'ESTRELLA DE BOEDO', 'FERRO',
  'GLORIAS DE TIGRE', 'HEBRAICA', 'INDEPENDIENTE', 'JORGE NEWBERY',
  'KIMBERLEY', 'NEWELLS', 'PINOCHO', 'RACING', 'RIVER', 'SAN LORENZO',
];

export const DEFAULT_ESTADIOS = [
  '17 DE AGOSTO', 'ALVEAR', 'AMERICA', 'BOCA', 'DON BOSCO',
  'ESTRELLA DE BOEDO', 'FERRO', 'GB SPORT', 'GLORIAS', 'HEBRAICA',
  'NEWBERY', 'NEWELLS', 'PINOCHO', 'RACING', 'SAN LORENZO', 'VILLA MODELO',
];

export const DEFAULT_ARBITROS = [
  'ABELARDO, Micaela', 'ALBERTI, Agustín', 'ALEGRE, Daniel',
  'ALIANELLI, Ramiro', 'ALCARAZ, Gustavo', 'ALVAREZ, Julieta',
  'ARRIETA, Aldana', 'AVALOS, Ian', 'AVARO, Berenice',
  'AVILA, Daniel', 'AYBAR, Tomas', 'BAIS',
  'BALEMAN, Agustina', 'BALINER, Patricio', 'BARAN, Adrian',
  'BONDARCZUK', 'BOETTI, Franco', 'BOVERI, Federico',
  'BRITEZ, Leandro', 'CAPARROZ, Leonardo', 'CAPELLI, Ludmila',
  'CAVAGNARO, Nicolas', 'CHAVEZ, Emanuel', 'COLOMBO, Lucas',
  'COLMAN, Alan', 'CUELLA, Juan Antonio', 'CURTO, Sofia',
  'DE SETA, Francisco', 'DEFELLIPI, Pablo', 'DEL PUERTO',
  'DEVIA SANZI', 'DI MARCO, Lautaro', 'DIAZ, Pablo',
  'DIAZ, Rodrigo', 'DOMINGUEZ, Hector', 'DUARTE, Martín',
  'ERBA, Alex', 'ESCUDERO, Santiago', 'FABIANI, Julián',
  'FALVO, Facundo', 'FERNANDEZ, Julieta', 'FISCHETTI, Agustín',
  'FREITAS, Gonzalo', 'GAILLARD, Valentino', 'GALARZA, Gastón',
  'GALLEGO, Juan Pablo', 'GARCIA, Lucas', 'GETTE, Camila',
  'GONZALEZ, Diego', 'GONZALEZ, Sebastian', 'GUTIERREZ, Lautaro',
  'IBAÑEZ, Facundo', 'IGLESIAS, Jose', 'IRVINI, Ignacio',
  'KAISER, Axel', 'LABORDA PAREDES, Angel', 'LABORDA, Simon',
  'LEGUIZAMON, Alexis', 'LEGUIZAMON, Santiago', 'LOPEZ, Ariel',
  'LOPEZ, Juan', 'LOPEZ BRITEZ, Daniel', 'LOPEZ DI BENEDETO, Manuel',
  'MAIDANA, Gabriel', 'MAROT, Damian', 'MARTIN, Nahuel',
  'MATIAS, Jano', 'MENDIOLAR, Facundo', 'MOLLARD',
  'MORENO, Alejo', 'MOREYRA, Jose', 'NUÑEZ, Franco',
  'NUREMBERG, Gonzalo', 'OLDANI, Valentino', 'ORTIZ, Guadalupe',
  'OTEGUI, Ignacio', 'OTERO, Tomas', 'PALMIERI, Santiago',
  'PENA GARCIA, Andres', 'PENEL, Nicolas', 'PEREZ GOMEZ, Thiago',
  'PEREZ, Milena', 'PETERSEN, Brandon', 'PETRELLA',
  'PINTO, Estefanía', 'POGGE, Axel', 'RAFFO, Martin',
  'REBUSCINI, Angel', 'RICCIO', 'ROCHA, Fernando',
  'ROCHE', 'RODRIGUEZ, Fernando', 'RODRIGUEZ, Rodolfo',
  'ROMERO, Lautaro', 'ROMO, Mariano', 'ROVAGLIO, Jose',
  'ROVIRA, Nicolas', 'RULL, Lisandro', 'SANCHEZ, Brian',
  'SANCHEZ, Lorena', 'SANCHEZ, Luciana', 'SANTAMARIA',
  'SCHULZ, Lucas', 'SILVA, Eduardo', 'SOTELO, Gabriel',
  'TAKAHASHI', 'TEBES', 'TRINIDAD, Mauro',
  'URTIAGA, Juan', 'VALDEON, Nicolas', 'VARGAS, Mario',
  'VAZQUEZ, Violeta', 'VIGANO, Fausto', 'VILLARREAL, Daniel',
  'YASINSKYJ, Ignacio',
];

export const DEFAULT_OFICIALES_AFA = [
  'Agustín Andrenacci', 'Andres Lobo', 'Ángel Sabio',
  'Fabián Teplitzky', 'Fernando Depirro', 'Gustavo Deffis',
  'Hernan Lomba', 'Juan Chamorro', 'Juan Meles',
  'Marcelo Maradei', 'Pablo Diaz', 'Sebastián Sgarra',
];

export const DEFAULT_MOTIVOS_INICIO = [
  '', 'Partido de 3ra Div.', 'Cancha Ocupada',
  'Local en Vestuario', 'Visita en Vestuario', 'Ambos en Vestuario',
  'Limpieza de Cancha', 'Falla en Tablero', 'Arcos y Redes',
  'Cuerpo Técnico', 'Otro motivo',
];

export const DEFAULT_MOTIVOS_ET = [
  '', 'Local en Vestuario', 'Visita en Vestuario', 'Ambos en Vestuario',
  'Limpieza de Cancha', 'Falla en Tablero', 'Arcos y Redes',
  'Cuerpo Técnico', 'Otro motivo',
];

// Links CSV publicados de la planilla "POPA-2026-Datos". Cada uno corresponde
// a una pestaña publicada como Archivo > Compartir > Publicar en la web > csv.
// Si una queda en null, la app usa el DEFAULT_* de arriba hasta que se publique.
export const SHEET_URLS = {
  torneos: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSVNC49afGMrgq6wBdjdiY-g7YQPHdmonQPIw1BjO9-Ianl4kfgtGE3gQws5BmTfkJKvYMMq9FOiW17/pub?gid=471220477&single=true&output=csv',
  clubes: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSVNC49afGMrgq6wBdjdiY-g7YQPHdmonQPIw1BjO9-Ianl4kfgtGE3gQws5BmTfkJKvYMMq9FOiW17/pub?gid=0&single=true&output=csv',
  estadios: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSVNC49afGMrgq6wBdjdiY-g7YQPHdmonQPIw1BjO9-Ianl4kfgtGE3gQws5BmTfkJKvYMMq9FOiW17/pub?gid=291075130&single=true&output=csv',
  arbitros: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSVNC49afGMrgq6wBdjdiY-g7YQPHdmonQPIw1BjO9-Ianl4kfgtGE3gQws5BmTfkJKvYMMq9FOiW17/pub?gid=925457710&single=true&output=csv',
  oficiales: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSVNC49afGMrgq6wBdjdiY-g7YQPHdmonQPIw1BjO9-Ianl4kfgtGE3gQws5BmTfkJKvYMMq9FOiW17/pub?gid=1380718279&single=true&output=csv',
  categorias: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSVNC49afGMrgq6wBdjdiY-g7YQPHdmonQPIw1BjO9-Ianl4kfgtGE3gQws5BmTfkJKvYMMq9FOiW17/pub?gid=1519839119&single=true&output=csv', // categorias
  partidos: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSVNC49afGMrgq6wBdjdiY-g7YQPHdmonQPIw1BjO9-Ianl4kfgtGE3gQws5BmTfkJKvYMMq9FOiW17/pub?gid=734516177&single=true&output=csv', // fechas
  motivosInicio: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSVNC49afGMrgq6wBdjdiY-g7YQPHdmonQPIw1BjO9-Ianl4kfgtGE3gQws5BmTfkJKvYMMq9FOiW17/pub?gid=718313407&single=true&output=csv',
  motivosET: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSVNC49afGMrgq6wBdjdiY-g7YQPHdmonQPIw1BjO9-Ianl4kfgtGE3gQws5BmTfkJKvYMMq9FOiW17/pub?gid=1002892177&single=true&output=csv',
};

// PIN de 4 dígitos por Oficial AFA — este es el RESPALDO por si la hoja de
// Sheets todavía no está publicada o falla la conexión. Una vez que publiques
// la hoja "PINs" (columnas: Nombre | PIN) los PINs se manejan desde ahí y
// esto deja de usarse. Todos arrancan en "1234" acá por si hace falta.
export const OFICIAL_PINS = {
  'Agustín Andrenacci': '1234',
  'Andres Lobo': '1234',
  'Ángel Sabio': '1234',
  'Fabián Teplitzky': '1234',
  'Fernando Depirro': '1234',
  'Gustavo Deffis': '1234',
  'Hernan Lomba': '1234',
  'Juan Chamorro': '1234',
  'Juan Meles': '1234',
  'Marcelo Maradei': '1234',
  'Pablo Diaz': '1234',
  'Sebastián Sgarra': '1234',
};

// Versión de la app: se muestra en la pantalla de inicio, debajo del botón
// Ingresar. Subir este número cuando le pases una versión nueva a Gustavo.
export const APP_VERSION = 'v22';

// Apps Script que guarda cada partido finalizado en la planilla compartida
// "POPA-2026-Partidos" (además del historial local del dispositivo).
export const APPS_SCRIPT_PARTIDOS_URL = 'https://script.google.com/macros/s/AKfycbyPMIuZqX8tUtCEPOFbPu6PniTG5qYjEUr9D6Fmnv3bx8B4-nFUuMhwvaKzrczoW1LctQ/exec';

export const ESTADO_INICIAL = {
  // Identificador interno fijo del partido — no cambia aunque se editen
  // Torneo/Local/Visitante después. Se completa solo, no lo toca el usuario.
  _id: null,

  // Sección 1 - Datos del partido
  torneo: '', fecha_nro: '', division: 'M', cat: '', dia: '',
  hora: '', nro: '', local: '', visitante: '', estadio: '',
  res_local: '', res_visitante: '', arbitro: '',
  deleg_l: '', deleg_v: '', oficial_afa: '',

  // Sección 2 - Control previo
  plan_cred_ok: false, plan_cred_dem_l: '', plan_cred_dem_v: '',
  plan_cred_hora_l: '', plan_cred_hora_v: '',
  form_ini_ok: false, form_ini_dem_l: '', form_ini_dem_v: '',
  form_ini_hora_l: '', form_ini_hora_v: '',
  buen_estado: false, ilum: false, mesa_crono: false, tablero: false,
  redes_per: false, altura: false, pared_prot: false, meta_anclada: false,
  banios: false, limpieza: false, camiseta: false, balon_nuevo: false,
  vest_l: false, vest_v: false, vest_arb: false,
  del_veedor_l: false, del_veedor_v: false,
  seguridad: false, medico: false,
  obs_previo: '',

  // Sección 3 - Horarios
  ingreso: '', protocolo: false, comenzo_si: null,
  motivo_inicio: '', motivo_inicio_pdf: '', hora_real: '',
  final_1t: '', inicio_2t: '', et_min: '', excedido: false,
  motivo_et: '', motivo_et_pdf: '', final_partido: '',
  obs_horarios: '',

  // Sección 4 - Observaciones
  tablero_fallas: false, sin_balon: false, medico_obs: false, policia: false,
  calent_supl: false,
  fuera_zona_l: false, fuera_zona_v: false,
  sin_chalecos_l: false, sin_chalecos_v: false,
  con_balones_l: false, con_balones_v: false,
  mas5_l: false, mas5_v: false,
  ilum_obs: false, humedad: false, goteras: false,
  arcos_obs: false, tribunas: false,
  invasion: false, incidentes: false, agresiones: false, gresca: false,
  publico_l: false, publico_v: false,
  obs_partido: '',

  // Sección 5 - Conclusión
  conclusiones: [],
  acta_extra: '',
  ingreso_local: '',
  ingreso_visita: '',
  ingreso_local_dem: '',
  ingreso_visita_dem: '',
  regreso_local: '',
  regreso_visita: '',
  regreso_local_dem: '',
  regreso_visita_dem: '',
};
