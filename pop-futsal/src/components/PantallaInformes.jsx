import { useState, useEffect, useMemo } from 'react';
import { obtenerTodosLosPartidos } from '../useAutoSave';
import {
  calcularIndicadoresPorClub, filtrarPartidos, demoraInicioMin,
  esSi, tuvoIncidente, tuvoObsInstalaciones, planillaFueraDeTermino, normalizarClub,
  COLUMNAS_OBS_INSTALACIONES,
} from '../utils/indicadoresClub';
import { textoObsItem } from '../utils/informeClub';
import { formatearDia } from '../utils/fechasSheet';
import { generarPDFTableros } from '../utils/informesTablerosPdf';
import { descargarPDF } from '../utils/pdfFiller';

const C = {
  azul: '#0d1f4e', celeste: '#c6dbf5', verde: '#1a7a3a', rojo: '#e03030',
  bordo: '#7a1030', naranja: '#c96a1c', gris: '#5f5f5f',
  peach: '#f2c9ae', amarillo: '#f5e050', amarilloTexto: '#5c4a00',
};

const FILTROS_VACIOS = { torneo: '', division: '', categoriaClub: '', generoMF: '', fechaDesde: '', fechaHasta: '', fechaNroDesde: '', fechaNroHasta: '' };

const th = { padding: '6px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,.25)', cursor: 'pointer', userSelect: 'none' };
const td = { padding: '6px 8px', fontSize: 12, textAlign: 'center', whiteSpace: 'nowrap' };
const inputFiltro = { height: 38, border: `1.5px solid ${C.azul}`, borderRadius: 8, padding: '0 8px', fontSize: 12, fontWeight: 600, color: C.azul, background: C.celeste, minWidth: 0 };
const selectFiltro = { ...inputFiltro, fontSize: 12, textTransform: 'uppercase' };

// Anchos parejos por tabla — la tabla 1 tiene 5 columnas de datos, la tabla 2
// tiene 4, con anchos distintos para que el total (240px) quede igual en
// las dos y se vean prolijas una debajo de la otra.
const ANCHO_CLUB = 70;
const ANCHO_PJ = 30;
const ANCHO_DATO_1 = 40; // x5 = 200
const ANCHO_DATO_2 = 50; // x4 = 200
const DIVISOR = { borderLeft: '1px solid #d5d5d5' };

function flecha(sortState, campo) {
  if (sortState.campo !== campo) return '';
  return sortState.dir === 'asc' ? ' ▲' : ' ▼';
}

function aplicarOrden(filas, sortState, getters) {
  if (!sortState.campo) return filas;
  const getter = getters[sortState.campo];
  const copia = [...filas];
  copia.sort((a, b) => {
    const va = getter(a), vb = getter(b);
    let cmp;
    if (typeof va === 'string') cmp = va.localeCompare(vb);
    else cmp = va - vb;
    return sortState.dir === 'asc' ? cmp : -cmp;
  });
  return copia;
}

function toggleSort(setSortState, campo) {
  setSortState(s => (s.campo === campo ? { campo, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { campo, dir: 'asc' }));
}

// Partidos donde jugó un club, con su rol en cada uno.
function partidosDelClubConRol(club, partidos) {
  const clubNorm = normalizarClub(club);
  return (partidos || [])
    .filter(p => normalizarClub(p['Local']) === clubNorm || normalizarClub(p['Visitante']) === clubNorm)
    .map(p => ({ p, rol: normalizarClub(p['Local']) === clubNorm ? 'L' : 'V' }));
}

function rivalDe(p, rol) {
  return rol === 'L' ? p['Visitante'] : p['Local'];
}

// Etiqueta del ítem de Instalaciones puntual que corresponde a cada columna
// booleana de CONTROL PREVIO (antes del partido, Pantalla2) — para sacar del
// texto libre de "Obs. Control Previo" la línea específica que el oficial
// escribió para ESE ítem (mismo mecanismo que ya usa el Informe por Club).
// OJO: esto es DISTINTO de "Obs. Instalaciones" del tablero de Informes,
// que sale de columnas de DURANTE EL PARTIDO (Pantalla4) — ver más abajo.
const ITEM_INSTALACIONES_POR_COLUMNA = {
  'Campo Buen Estado': 'CAMPO EN BUEN ESTADO', 'Iluminación OK': 'ILUMINACIÓN', 'Mesa Crono OK': 'MESA CRONO',
  'Tablero OK': 'TABLERO', 'Redes Perimetrales OK': 'REDES PERIMETRALES', 'Altura OK': 'ALTURA MIN. 5 MTS',
  'Pared Protecciones OK': 'PARED CON PROTECCIONES', 'Meta Anclada OK': 'META SIN ANCLAR',
  'Vestuario Local OK': 'VESTUARIO LOCAL', 'Vestuario Visita OK': 'VESTUARIO VISITA', 'Vestuario Árbitro OK': 'VESTUARIO ÁRBITRO',
  'Baños OK': 'BAÑOS PÚBLICOS', 'Limpieza OK': 'LIMPIEZA',
};

// Etiquetas legibles de las observaciones de instalaciones DURANTE EL
// PARTIDO (Pantalla4) — son estas columnas las que arma tuvoObsInstalaciones,
// que es lo que realmente cuenta la columna "Obs. Instalación" del tablero.
const LABEL_OBS_INSTALACIONES = {
  'Tablero con Fallas': 'Tablero con Fallas', 'Iluminación Obs.': 'Iluminación', 'Humedad': 'Humedad',
  'Goteras': 'Goteras', 'Arcos/Redes': 'Arcos/Redes', 'Tribunas': 'Tribunas',
};

// Predicados de detalle: para cada tipo de celda, qué partidos "cuentan",
// el texto principal a mostrar por partido, y de dónde sacar el motivo u
// observación (y con qué columnas de fecha/minutos armar el envío por WSP).
const DETALLE_PREDICADOS = {
  demora: {
    titulo: 'Partidos con demora de inicio',
    filtro: ({ p }) => demoraInicioMin(p) > 1,
    detalle: ({ p }) => `${demoraInicioMin(p)} min. de demora`,
    motivo: ({ p }) => [p['Motivo Demora Inicio'], p['Obs. Horarios']].filter(Boolean).join(' — '),
  },
  etExcedido: {
    titulo: 'Partidos con Entretiempo excedido',
    filtro: ({ p }) => esSi(p['ET Excedido']),
    detalle: ({ p }) => `ET: ${p['ET min.'] || '?'} min.`,
    motivo: ({ p }) => [p['Motivo Demora ET'], p['Obs. Horarios']].filter(Boolean).join(' — '),
  },
  incidentes: {
    titulo: 'Partidos con Incidentes',
    filtro: ({ p }) => tuvoIncidente(p),
    detalle: ({ p }) => [esSi(p['Incidentes']) && 'Incidentes', esSi(p['Agresiones']) && 'Agresiones', esSi(p['Gresca Generalizada']) && 'Gresca'].filter(Boolean).join(', '),
    motivo: ({ p }) => p['Obs. Partido'] || '',
  },
  instalaciones: {
    titulo: 'Partidos con Observación de Instalaciones',
    filtro: ({ p, rol }) => rol === 'L' && tuvoObsInstalaciones(p),
    detalle: ({ p }) => {
      const items = Object.entries(LABEL_OBS_INSTALACIONES).filter(([col]) => esSi(p[col])).map(([, etiqueta]) => etiqueta);
      return items.length ? items.join(', ') : 'Instalación con observación';
    },
    motivo: ({ p }) => p['Obs. Partido'] || '',
  },
  planillaFueraTermino: {
    titulo: 'Partidos con Planilla Fuera de Término',
    filtro: ({ p, rol }) => planillaFueraDeTermino(p, rol),
    detalle: ({ p, rol }) => {
      const min = Math.max(Number(p[`Demora Planillas ${rol}`]) || 0, Number(p[`Demora Form. Inicial ${rol}`]) || 0);
      return min > 0 ? `${min} min. fuera de término` : 'Llegada fuera de término';
    },
    motivo: ({ p }) => p['Obs. Control Previo'] || '',
  },
  camisetaSinApellido: {
    titulo: 'Partidos con Camiseta Sin Apellido',
    filtro: ({ p }) => !esSi(p['Camiseta c/Apellido OK']),
    detalle: () => 'Camiseta sin apellido',
    motivo: ({ p }) => textoObsItem(p['Obs. Control Previo'], 'CAMISETA C/APELLIDO') || p['Obs. Control Previo'] || '',
  },
};

function verDetalle(setDetalle, club, tipo, partidosFiltrados) {
  const { titulo, filtro, detalle, motivo } = DETALLE_PREDICADOS[tipo];
  const filas = partidosDelClubConRol(club, partidosFiltrados)
    .filter(filtro)
    .map(({ p, rol }) => ({
      fecha: p['Fecha N°'] || '',
      dia: formatearDia(p['Día']),
      rival: rivalDe(p, rol),
      lv: rol,
      detalle: detalle({ p, rol }),
      motivo: motivo({ p, rol }),
      oficial: p['Oficial AFA'] || '',
    }));
  setDetalle({ club, tipo, titulo, filas });
}

// Arma el texto para enviar por WhatsApp con todo el detalle del modal.
function armarTextoDetalleWSP(detalle, filtrosTexto) {
  const lineas = [
    `📊 ${detalle.titulo}`,
    `Club: ${detalle.club}`,
    filtrosTexto ? `Filtros: ${filtrosTexto}` : null,
    `Cantidad de partidos: ${detalle.filas.length}`,
    '━━━━━━━━━━━━━━━━━━━━',
    ...detalle.filas.flatMap(f => {
      const linea1 = `Fecha ${f.fecha}${f.dia ? ` — ${f.dia}` : ''} — ${f.lv === 'L' ? 'vs' : '@'} ${f.rival || '(sin rival)'}`;
      const linea2 = f.detalle;
      const linea3 = f.motivo ? `Obs: ${f.motivo}` : null;
      const linea4 = `Oficial: ${f.oficial || '—'}`;
      return [linea1, linea2, linea3, linea4, ''].filter(Boolean);
    }),
  ].filter(Boolean);
  return lineas.join('\n');
}

// Texto legible de los filtros activos, para el envío por WSP.
function textoFiltrosActivos(filtros) {
  const partes = [];
  if (filtros.torneo) partes.push(filtros.torneo);
  if (filtros.division) partes.push(`Div. ${filtros.division}`);
  if (filtros.categoriaClub) partes.push(`Cat. ${filtros.categoriaClub}`);
  if (filtros.generoMF) partes.push(filtros.generoMF === 'M' ? 'Masculino' : 'Femenino');
  if (filtros.fechaDesde || filtros.fechaHasta) partes.push(`Fechas ${filtros.fechaDesde || '...'} a ${filtros.fechaHasta || '...'}`);
  if (filtros.fechaNroDesde || filtros.fechaNroHasta) partes.push(`Torneo fecha ${filtros.fechaNroDesde || '...'} a ${filtros.fechaNroHasta || '...'}`);
  return partes.join(' | ');
}

// Modal con la lista de partidos detrás de un número de la tabla — ahora con
// el motivo/observación de cada uno, el oficial que cargó el partido, y un
// botón para mandar todo el detalle por WhatsApp.
function ModalDetalle({ detalle, filtros, onCerrar }) {
  if (!detalle) return null;
  const enviarWSP = () => {
    const texto = armarTextoDetalleWSP(detalle, textoFiltrosActivos(filtros || {}));
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`);
  };
  return (
    <div onClick={onCerrar} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ background: C.azul, padding: '14px 16px', position: 'sticky', top: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div>
            <div style={{ color: '#fff', fontSize: 11, textTransform: 'uppercase', opacity: .8 }}>{detalle.club}</div>
            <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{detalle.titulo} ({detalle.filas.length})</div>
          </div>
          {detalle.filas.length > 0 && (
            <button onClick={enviarWSP} style={{ background: C.verde, border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', textTransform: 'uppercase', flexShrink: 0 }}>
              📎 WSP
            </button>
          )}
        </div>
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {detalle.filas.length === 0 && <div style={{ color: '#999', fontSize: 13, textAlign: 'center', padding: 12 }}>Sin partidos para mostrar.</div>}
          {detalle.filas.map((f, i) => (
            <div key={i} style={{ border: `1px solid ${C.celeste}`, borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ fontSize: 11, color: C.azul, fontWeight: 700 }}>Fecha {f.fecha}{f.dia && ` — ${f.dia}`}</div>
              <div style={{ fontSize: 13, color: C.azul, fontWeight: 700 }}>{f.lv === 'L' ? 'vs' : '@'} {f.rival || '(sin rival)'}</div>
              <div style={{ fontSize: 12, color: C.rojo, fontWeight: 600 }}>{f.detalle}</div>
              {f.motivo && <div style={{ fontSize: 12, color: '#444' }}>Obs: {f.motivo}</div>}
              <div style={{ fontSize: 11, color: '#777', fontStyle: 'italic' }}>Oficial: {f.oficial || '—'}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: 12 }}>
          <button onClick={onCerrar} style={{ width: '100%', background: C.azul, color: '#fff', border: 'none', borderRadius: 8, padding: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// Celda con una barra de fondo tipo "data bar" — proporcional al valor sobre
// un máximo, igual al efecto del tablero de referencia en Excel. Se puede
// tocar para ver el detalle de partidos si se pasa onClick.
function CeldaBarra({ valor, texto, max, color, onClick, width, divisor }) {
  const pct = max > 0 ? Math.min(100, Math.round((valor / max) * 100)) : 0;
  return (
    <td onClick={onClick} style={{ ...td, position: 'relative', color: C.azul, fontWeight: 700, cursor: onClick ? 'pointer' : 'default', width, ...(divisor ? DIVISOR : {}) }}>
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to right, ${color} ${pct}%, transparent ${pct}%)` }} />
      <span style={{ position: 'relative', textDecoration: onClick ? 'underline' : 'none' }}>{texto}</span>
    </td>
  );
}

// Encabezado de 2 líneas (ej: "Con" / "Demora") — deja las columnas más
// angostas sin cortar el título. Clickeable para ordenar.
function Th2({ top, bottom, bg, color, rowSpan, onClick, flechaTexto, width, divisor }) {
  return (
    <th rowSpan={rowSpan} onClick={onClick} style={{ ...th, background: bg, color, lineHeight: 1.25, width, ...(divisor ? DIVISOR : {}) }}>
      <div>{top}</div>
      <div>{bottom}{flechaTexto}</div>
    </th>
  );
}

// Celda que se resalta con un color sólido cuando el valor es mayor a 0
// (Incidentes, Obs. Instalaciones, Controles Previos). Si el valor es mayor
// a 0, se puede tocar para ver el detalle de los partidos.
function CeldaResaltada({ valor, colorFondo, colorTexto, onClick, width, divisor }) {
  const activo = Number(valor) > 0;
  return (
    <td onClick={activo && onClick ? onClick : undefined} style={{ ...td, background: activo ? colorFondo : '#fff', color: activo ? colorTexto : C.azul, fontWeight: activo ? 700 : 400, cursor: activo && onClick ? 'pointer' : 'default', textDecoration: activo && onClick ? 'underline' : 'none', width, ...(divisor ? DIVISOR : {}) }}>
      {valor}
    </td>
  );
}

// Tabla 1: Demora en Inicio de Partidos + Entretiempos
function Fila1({ f, esTotal, maxPorcentaje, maxMinProm, onVerDetalle }) {
  const bg = esTotal ? C.celeste : '#fff';
  const peso = esTotal ? 700 : 400;
  const click = (tipo, valor) => (esTotal || !(Number(valor) > 0) ? undefined : () => onVerDetalle(f.club, tipo));
  const clickDemora = click('demora', f.demoraInicio.partidosConDemora);
  const clickEt = click('etExcedido', f.entretiempos.cantidadExcedidos);
  return (
    <tr style={{ background: bg, fontWeight: peso }}>
      <td style={{ ...td, textAlign: 'left', paddingLeft: 12, textTransform: 'uppercase', fontWeight: 700, color: C.azul, width: ANCHO_CLUB }}>{f.club}</td>
      <td style={{ ...td, color: C.azul, width: ANCHO_PJ }}>{f.partidos}</td>
      <td onClick={clickDemora} style={{ ...td, ...DIVISOR, color: C.rojo, fontWeight: 700, width: ANCHO_DATO_1, cursor: clickDemora ? 'pointer' : 'default', textDecoration: clickDemora ? 'underline' : 'none' }}>{f.demoraInicio.partidosConDemora}</td>
      <CeldaBarra valor={f.demoraInicio.porcentaje} texto={`${f.demoraInicio.porcentaje}%`} max={maxPorcentaje} color={C.peach} onClick={clickDemora} width={ANCHO_DATO_1} />
      <CeldaBarra valor={f.demoraInicio.minutosPromedio} texto={f.demoraInicio.minutosPromedio} max={maxMinProm} color={C.peach} onClick={clickDemora} width={ANCHO_DATO_1} />
      <td onClick={clickEt} style={{ ...td, color: C.azul, fontWeight: 700, width: ANCHO_DATO_1, cursor: clickEt ? 'pointer' : 'default', textDecoration: clickEt ? 'underline' : 'none' }}>{f.entretiempos.cantidadExcedidos}</td>
      <td style={{ ...td, color: C.azul, fontWeight: 700, width: ANCHO_DATO_1, background: f.entretiempos.promedioMin >= 3 ? C.celeste : 'transparent' }}>{f.entretiempos.promedioMin}</td>
    </tr>
  );
}

// Tabla 2: Incidentes, Obs. Instalaciones, Controles Previos
function Fila2({ f, esTotal, onVerDetalle }) {
  const bg = esTotal ? C.celeste : '#fff';
  const peso = esTotal ? 700 : 400;
  const click = (tipo) => (esTotal ? undefined : () => onVerDetalle(f.club, tipo));
  return (
    <tr style={{ background: bg, fontWeight: peso }}>
      <td style={{ ...td, textAlign: 'left', paddingLeft: 12, textTransform: 'uppercase', fontWeight: 700, color: C.azul, width: ANCHO_CLUB }}>{f.club}</td>
      <td style={{ ...td, color: C.azul, width: ANCHO_PJ }}>{f.partidos}</td>
      <CeldaResaltada valor={f.incidentes} colorFondo={C.rojo} colorTexto="#fff" onClick={click('incidentes')} width={ANCHO_DATO_2} divisor />
      <CeldaResaltada valor={f.obsInstalaciones} colorFondo={C.bordo} colorTexto="#fff" onClick={click('instalaciones')} width={ANCHO_DATO_2} />
      <CeldaResaltada valor={f.controlesPrevios.planillaFueraTermino} colorFondo={C.amarillo} colorTexto={C.amarilloTexto} onClick={click('planillaFueraTermino')} width={ANCHO_DATO_2} />
      <CeldaResaltada valor={f.controlesPrevios.camisetaSinApellido} colorFondo={C.amarillo} colorTexto={C.amarilloTexto} onClick={click('camisetaSinApellido')} width={ANCHO_DATO_2} />
    </tr>
  );
}

export default function PantallaInformes({ onBack, listas, onInformeClub }) {
  const [partidos, setPartidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [sort1, setSort1] = useState({ campo: null, dir: 'asc' });
  const [sort2, setSort2] = useState({ campo: null, dir: 'asc' });
  const [detalle, setDetalle] = useState(null);
  const [exportando, setExportando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    const { ok, partidos: nuevos } = await obtenerTodosLosPartidos();
    setError(!ok);
    setPartidos(nuevos);
    setCargando(false);
  };

  useEffect(() => { cargar(); }, []);

  const setFiltro = (campo) => (e) => setFiltros(f => ({ ...f, [campo]: e.target.value }));
  const hayFiltrosActivos = Object.values(filtros).some(v => v !== '');

  const opciones = useMemo(() => ({
    torneos: [...new Set(partidos.map(p => p['Torneo']).filter(Boolean))].sort(),
    divisiones: [...new Set(partidos.map(p => p['Categoría']).filter(Boolean))].sort(),
  }), [partidos]);

  const partidosFiltrados = useMemo(() => filtrarPartidos(partidos, filtros), [partidos, filtros]);
  const { porClub, total } = calcularIndicadoresPorClub(partidosFiltrados, {
    categoriaClub: filtros.categoriaClub,
    clubesCategoria: listas?.clubesCategoria,
  });
  const maxPorcentaje = 100;
  const maxMinProm = Math.max(1, ...porClub.map(f => f.demoraInicio.minutosPromedio));

  const GETTERS_1 = {
    club: f => f.club, partidos: f => f.partidos,
    partidosConDemora: f => f.demoraInicio.partidosConDemora, porcentaje: f => f.demoraInicio.porcentaje,
    minutosPromedio: f => f.demoraInicio.minutosPromedio, cantidadExcedidos: f => f.entretiempos.cantidadExcedidos,
    promedioMinET: f => f.entretiempos.promedioMin,
  };
  const GETTERS_2 = {
    club: f => f.club, partidos: f => f.partidos, incidentes: f => f.incidentes, obsInstalaciones: f => f.obsInstalaciones,
    planillaFueraTermino: f => f.controlesPrevios.planillaFueraTermino, camisetaSinApellido: f => f.controlesPrevios.camisetaSinApellido,
  };
  const filas1 = aplicarOrden(porClub, sort1, GETTERS_1);
  const filas2 = aplicarOrden(porClub, sort2, GETTERS_2);
  const onVerDetalle = (club, tipo) => verDetalle(setDetalle, club, tipo, partidosFiltrados);

  const exportarTablerosPdf = async () => {
    setExportando(true);
    let bytes, nombreSugerido;
    try {
      ({ bytes, nombreSugerido } = await generarPDFTableros(porClub, total, { fecha: new Date() }));
    } catch (err) {
      console.error('Error generando el PDF de los tableros:', err);
      alert(`No se pudo armar el PDF de los tableros.\n\nDetalle técnico: ${err?.message || err}`);
      setExportando(false);
      return;
    }
    try {
      const archivo = typeof File !== 'undefined' ? new File([bytes], nombreSugerido, { type: 'application/pdf' }) : null;
      const puedeCompartirArchivo = archivo && navigator.canShare && navigator.canShare({ files: [archivo] });
      if (puedeCompartirArchivo) {
        await navigator.share({ files: [archivo], title: 'Tableros de Informes', text: 'Tableros de Informes — AFA Futsal' });
      } else {
        descargarPDF(bytes, nombreSugerido);
        alert('Tu celular no permite adjuntar el PDF directo desde acá. Se descargó el archivo: adjuntalo manualmente en WhatsApp o Correo.');
      }
    } catch (err) {
      if (err?.name === 'AbortError') {
        // El usuario cerró el cuadro de compartir sin elegir nada — no es un error.
      } else {
        console.error('Error compartiendo el PDF de los tableros:', err);
        try {
          descargarPDF(bytes, nombreSugerido);
          alert(`No se pudo abrir el cuadro de compartir (${err?.message || err}). Se descargó el archivo igual: adjuntalo manualmente en WhatsApp o Correo.`);
        } catch (err2) {
          alert(`No se pudo compartir ni descargar el PDF.\n\nDetalle técnico: ${err?.message || err}`);
        }
      }
    } finally {
      setExportando(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <ModalDetalle detalle={detalle} filtros={filtros} onCerrar={() => setDetalle(null)} />
      <div style={{ background: C.azul, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: 8, fontSize: 18, cursor: 'pointer' }}>←</button>
        <div>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, textTransform: 'uppercase' }}>Tablero e Informes</div>
          <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 11 }}>Se actualiza solo con cada partido subido</div>
        </div>
        <button onClick={cargar} style={{ background: C.celeste, border: 'none', color: C.azul, fontSize: 11, fontWeight: 700, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', textTransform: 'uppercase', marginLeft: 'auto' }}>
          ↻ Actualizar
        </button>
        <button onClick={exportarTablerosPdf} disabled={exportando} style={{ background: exportando ? '#8fc9a3' : C.verde, border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, padding: '8px 10px', borderRadius: 8, cursor: exportando ? 'wait' : 'pointer', textTransform: 'uppercase' }}>
          {exportando ? '⏳ Generando...' : '📎 Exportar PDF'}
        </button>
      </div>

      {!cargando && !error && partidos.length > 0 && (
        <div style={{ padding: '12px 12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setMostrarFiltros(m => !m)} style={{
            background: '#fff', color: C.azul, border: `1.5px solid ${C.azul}`, borderRadius: 8,
            padding: '10px 18px', fontWeight: 700, fontSize: 12, cursor: 'pointer', textTransform: 'uppercase',
          }}>
            ☰ Filtros{hayFiltrosActivos ? ' •' : ''}
          </button>
          <div style={{ display: 'flex', gap: 6 }}>
            {['M', 'F'].map(g => (
              <button
                key={g}
                onClick={() => setFiltros(f => ({ ...f, generoMF: f.generoMF === g ? '' : g }))}
                style={{
                  width: 40, height: 40, borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer',
                  background: filtros.generoMF === g ? C.azul : '#fff', color: filtros.generoMF === g ? '#fff' : C.azul,
                  border: `1.5px solid ${C.azul}`,
                }}
              >{g}</button>
            ))}
          </div>
        </div>
      )}

      {cargando && <div style={{ textAlign: 'center', color: '#999', fontSize: 14, padding: '40px 0' }}>Cargando...</div>}
      {!cargando && error && (
        <div style={{ textAlign: 'center', color: C.rojo, fontSize: 13, padding: '20px 0' }}>
          No se pudo traer la planilla compartida. Revisá la conexión.
          <div><button onClick={cargar} style={{ marginTop: 8, background: C.azul, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 700, cursor: 'pointer' }}>Reintentar</button></div>
        </div>
      )}
      {!cargando && !error && partidos.length === 0 && (
        <div style={{ textAlign: 'center', color: '#999', fontSize: 14, padding: '40px 0' }}>Todavía no hay partidos cargados.</div>
      )}

      {!cargando && !error && partidos.length > 0 && mostrarFiltros && (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, borderBottom: `1px solid ${C.celeste}` }}>
          <select style={{ ...selectFiltro, width: '100%' }} value={filtros.torneo} onChange={setFiltro('torneo')}>
            <option value="">Todos los Torneos</option>
            {opciones.torneos.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select style={{ ...selectFiltro, width: '100%' }} value={filtros.division} onChange={setFiltro('division')}>
            <option value="">Todas las Divisiones</option>
            {opciones.divisiones.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select style={{ ...selectFiltro, width: '100%' }} value={filtros.categoriaClub} onChange={setFiltro('categoriaClub')}>
            <option value="">Todos los Clubes</option>
            {['A', 'B', 'C', 'D'].map(v => <option key={v} value={v}>Categoría {v}</option>)}
          </select>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.azul, textTransform: 'uppercase', marginBottom: 4 }}>Rango de fechas</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input type="date" style={inputFiltro} value={filtros.fechaDesde} onChange={setFiltro('fechaDesde')} placeholder="Desde" />
              <input type="date" style={inputFiltro} value={filtros.fechaHasta} onChange={setFiltro('fechaHasta')} placeholder="Hasta" />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.azul, textTransform: 'uppercase', marginBottom: 4 }}>Rango de fechas de torneo</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input type="number" style={inputFiltro} value={filtros.fechaNroDesde} onChange={setFiltro('fechaNroDesde')} placeholder="Desde (ej: 1)" />
              <input type="number" style={inputFiltro} value={filtros.fechaNroHasta} onChange={setFiltro('fechaNroHasta')} placeholder="Hasta (ej: 10)" />
            </div>
          </div>
          {hayFiltrosActivos && (
            <button onClick={() => setFiltros(FILTROS_VACIOS)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: C.rojo, fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
              ✕ Limpiar filtros
            </button>
          )}
        </div>
      )}

      {!cargando && !error && partidos.length > 0 && porClub.length === 0 && (
        <div style={{ textAlign: 'center', color: '#999', fontSize: 14, padding: '40px 0' }}>Ningún partido coincide con estos filtros.</div>
      )}

      {!cargando && !error && porClub.length > 0 && (
        <>
          <div style={{ padding: '10px 12px 0', fontSize: 15, fontWeight: 700, color: C.azul, textTransform: 'uppercase' }}>
            Tablero de Demoras en Inicio y Entretiempos
          </div>
          <div style={{ overflowX: 'auto', padding: '6px 0 12px' }}>
            <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
              <thead>
                <tr>
                  <th rowSpan={2} onClick={() => toggleSort(setSort1, 'club')} style={{ ...th, textAlign: 'center', background: C.gris, color: '#fff', width: ANCHO_CLUB }}>Club{flecha(sort1, 'club')}</th>
                  <th rowSpan={2} onClick={() => toggleSort(setSort1, 'partidos')} style={{ ...th, background: C.gris, color: '#fff', width: ANCHO_PJ }}>PJ{flecha(sort1, 'partidos')}</th>
                  <th colSpan={3} style={{ ...th, ...DIVISOR, background: C.peach, color: C.azul, cursor: 'default' }}>Demora, Inicio Partido</th>
                  <th colSpan={2} style={{ ...th, background: C.azul, color: '#fff', cursor: 'default' }}>E. Tiempos</th>
                </tr>
                <tr>
                  <Th2 top="Con" bottom="Demora" bg={C.peach} color={C.azul} onClick={() => toggleSort(setSort1, 'partidosConDemora')} flechaTexto={flecha(sort1, 'partidosConDemora')} width={ANCHO_DATO_1} divisor />
                  <th onClick={() => toggleSort(setSort1, 'porcentaje')} style={{ ...th, background: C.peach, color: C.azul, width: ANCHO_DATO_1 }}>%{flecha(sort1, 'porcentaje')}</th>
                  <Th2 top="Min" bottom="Prom" bg={C.peach} color={C.azul} onClick={() => toggleSort(setSort1, 'minutosPromedio')} flechaTexto={flecha(sort1, 'minutosPromedio')} width={ANCHO_DATO_1} />
                  <Th2 top="Cant" bottom="Exced" bg={C.azul} color="#fff" onClick={() => toggleSort(setSort1, 'cantidadExcedidos')} flechaTexto={flecha(sort1, 'cantidadExcedidos')} width={ANCHO_DATO_1} />
                  <Th2 top="Min" bottom="Prom" bg={C.azul} color="#fff" onClick={() => toggleSort(setSort1, 'promedioMinET')} flechaTexto={flecha(sort1, 'promedioMinET')} width={ANCHO_DATO_1} />
                </tr>
              </thead>
              <tbody>
                {filas1.map(f => <Fila1 key={f.club} f={f} maxPorcentaje={maxPorcentaje} maxMinProm={maxMinProm} onVerDetalle={onVerDetalle} />)}
                <Fila1 f={total} esTotal maxPorcentaje={maxPorcentaje} maxMinProm={maxMinProm} />
              </tbody>
            </table>
          </div>

          <div style={{ padding: '10px 12px 0', fontSize: 15, fontWeight: 700, color: C.azul, textTransform: 'uppercase' }}>
            Tablero de Incidentes y Controles Previos
          </div>
          <div style={{ overflowX: 'auto', padding: '6px 0 12px' }}>
            <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
              <thead>
                <tr>
                  <th onClick={() => toggleSort(setSort2, 'club')} style={{ ...th, textAlign: 'center', background: C.gris, color: '#fff', width: ANCHO_CLUB }}>Club{flecha(sort2, 'club')}</th>
                  <th onClick={() => toggleSort(setSort2, 'partidos')} style={{ ...th, background: C.gris, color: '#fff', width: ANCHO_PJ }}>PJ{flecha(sort2, 'partidos')}</th>
                  <th onClick={() => toggleSort(setSort2, 'incidentes')} style={{ ...th, ...DIVISOR, background: C.rojo, color: '#fff', width: ANCHO_DATO_2 }}>INC{flecha(sort2, 'incidentes')}</th>
                  <Th2 top="Obs." bottom="Instal." bg={C.bordo} color="#fff" onClick={() => toggleSort(setSort2, 'obsInstalaciones')} flechaTexto={flecha(sort2, 'obsInstalaciones')} width={ANCHO_DATO_2} />
                  <Th2 top="Planilla" bottom="F. Término" bg={C.amarillo} color={C.amarilloTexto} onClick={() => toggleSort(setSort2, 'planillaFueraTermino')} flechaTexto={flecha(sort2, 'planillaFueraTermino')} width={ANCHO_DATO_2} />
                  <Th2 top="Camiseta" bottom="S/Apellido" bg={C.amarillo} color={C.amarilloTexto} onClick={() => toggleSort(setSort2, 'camisetaSinApellido')} flechaTexto={flecha(sort2, 'camisetaSinApellido')} width={ANCHO_DATO_2} />
                </tr>
              </thead>
              <tbody>
                {filas2.map(f => <Fila2 key={f.club} f={f} onVerDetalle={onVerDetalle} />)}
                <Fila2 f={total} esTotal />
              </tbody>
            </table>
          </div>

          {onInformeClub && (
            <div style={{ padding: '16px 12px 24px' }}>
              <button onClick={onInformeClub} style={{ width: '100%', background: C.azul, color: '#fff', border: `1.5px solid ${C.azul}`, borderRadius: 8, padding: '10px', fontWeight: 700, fontSize: 12, cursor: 'pointer', textTransform: 'uppercase' }}>
                📎 Informe PDF por Club (para WhatsApp / Correo)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
