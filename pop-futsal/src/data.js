// POP Futsal - Datos base
// Actualizar estas listas según los datos del torneo

export const TORNEOS = [
  'Camp. de 1° A', 'Camp. de 1° B', 'Camp. de 1° C',
  'Camp. de 3° A', 'Camp. de 3° B', 'Camp. de 3° C',
  'Inferiores 1a', 'Inferiores 3a',
];

export const FECHAS = Array.from({ length: 47 }, (_, i) => String(i + 1));

export const CATEGORIAS = ['1a', '3a', '4a', '5a', '6a', '7a'];

export const CLUBES = [
  '17 de Agosto', 'America del Sud', 'Barracas Central',
  'Boca Jrs.', 'Camioneros', 'Estrella de Boedo',
  'Estudiantil Porteño', 'Ferro Carril Oeste', 'Glorias de Tigre',
  'Hebraica', 'Independiente', 'Jorge Newbery',
  'Kimberley', "Newell's", 'Pinocho',
  'Racing Club', 'River Plate', 'San Lorenzo',
];

export const ESTADIOS = [
  '17 de Agosto', 'America del Sud', 'Barracas Central',
  'Boca Jrs.', 'Camioneros', 'Estrella de Boedo',
  'Estudiantil Porteño', 'Ferro Carril Oeste', 'Glorias de Tigre',
  'Hebraica', 'Independiente', 'Jorge Newbery',
  'Kimberley', "Newell's", 'Pinocho',
  'Racing Club', 'River Plate', 'San Lorenzo',
];

export const ARBITROS = [
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

export const OFICIALES_AFA = [
  'Agustín Andrenacci', 'Andres Lobo', 'Ángel Sabio',
  'Fabián Teplitzky', 'Fernando Depirro', 'Gustavo Deffis',
  'Hernan Lomba', 'Juan Chamorro', 'Juan Meles',
  'Marcelo Maradei', 'Pablo Diaz', 'Sebastián Sgarra',
];

export const MOTIVOS_INICIO = [
  '', 'Partido de 3ra Div.', 'Cancha Ocupada',
  'Local en Vestuario', 'Visita en Vestuario', 'Ambos en Vestuario',
  'Limpieza de Cancha', 'Falla en Tablero', 'Arcos y Redes',
  'Cuerpo Técnico', 'Otro motivo',
];

export const MOTIVOS_ET = [
  '', 'Local en Vestuario', 'Visita en Vestuario', 'Ambos en Vestuario',
  'Limpieza de Cancha', 'Falla en Tablero', 'Arcos y Redes',
  'Cuerpo Técnico', 'Otro motivo',
];

export const ESTADO_INICIAL = {
  // Sección 1 - Datos del partido
  torneo: '', fecha_nro: '', division: 'M', cat: '', dia: '',
  hora: '', nro: '', local: '', visitante: '', estadio: '',
  res_local: '', res_visitante: '', arbitro: '',
  deleg_l: '', deleg_v: '', oficial_afa: '',

  // Sección 2 - Control previo
  plan_cred_ok: false, plan_cred_dem_l: '', plan_cred_dem_v: '',
  form_ini_ok: false, form_ini_dem_l: '', form_ini_dem_v: '',
  buen_estado: false, ilum: false, mesa_crono: false, tablero: false,
  redes_per: false, altura: false, pared_prot: false, meta_anclada: false,
  banios: false, limpieza: false, camiseta: false, balon_nuevo: false,
  vest_l: false, vest_v: false, vest_arb: false,
  del_veedor_l: false, del_veedor_v: false,
  seguridad: false, medico: false,
  obs_previo: '',

  // Sección 3 - Horarios
  ingreso: '', protocolo: false, comenzo_si: null,
  motivo_inicio: '', hora_real: '',
  final_1t: '', inicio_2t: '', et_min: '', excedido: false,
  motivo_et: '', final_partido: '',
  obs_horarios: '',

  // Sección 4 - Observaciones
  tablero_fallas: false, sin_balon: false, medico_obs: false, policia: false,
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
};
