import { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Input, InputHora, SelectLibre, Select } from './UI';
import { obtenerListasAdmin, guardarListaAdmin } from '../useListasAdmin';
import { parsearFixture, serializarFixture, estadiosDelClub } from '../utils/fixture';
import { generarPDFAsignaciones } from '../utils/asignacionesPdf';
import { generarExcelAsignaciones, descargarExcel } from '../utils/asignacionesExcel';
import { descargarPDF } from '../utils/pdfFiller';

const C = { azul: '#0d1f4e', celeste: '#c6dbf5', verde: '#1a7a3a', rojo: '#e03030', amarillo: '#8a6a10', amarilloClaro: '#fdf3d8', gris: '#8a94a6' };

const DIAS_SEMANA = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];

// A partir de "DD/MM/AAAA" calcula el día de la semana en mayúscula, igual
// que en la tarjeta de avisos de Pantalla Inicio.
function diaDeLaSemana(ddmmaaaa) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(ddmmaaaa || '');
  if (!m) return '';
  const fecha = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return DIAS_SEMANA[fecha.getDay()];
}

// Motivos por los que un partido puede quedar sin oficial confirmado —
// los primeros 3 significan que el partido no se jugó y hay que retomarlo
// (cuentan para el filtro PEND); "Sin Cubrir" es distinto: el partido se
// juega igual, solo que este oficial no lo puede cubrir por lejanía u otro
// motivo — no tiene sentido para el aviso de "pendientes por reprogramar".
const ESTADOS_PEND = ['Pendiente', 'Postergado', 'Suspendido'];
const ESTADOS_NO_CUBRE = [...ESTADOS_PEND, 'Sin Cubrir'];

function ddmmaaaaAIso(v) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v || '');
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}
function isoADdmmaaaa(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

// Solo el apellido, para que entre cómodo en la tarjeta compacta (Punto 3).
function soloApellido(nombreCompleto) {
  const partes = (nombreCompleto || '').trim().split(/\s+/);
  return partes[partes.length - 1] || '';
}

// Estilo de texto compartido para que Estadio, Fecha, Hora, Oficial y el
// Estado (Pendiente/Postergado) se vean todos iguales — mismo tamaño,
// color y negrita. Los desplegables (Estadio/Oficial/Estado) necesitan más
// espacio a la derecha para la flechita; los campos de texto simples no.
const estiloTexto = { height: 32, fontSize: 11, fontWeight: 700, paddingLeft: 6, paddingRight: 8 };
const estiloDesplegable = { ...estiloTexto, paddingRight: 28 };

// Blanco mientras el campo está vacío (para que salte a la vista qué falta
// completar), celeste (el mismo tono que ya usa el resto de la app) apenas
// tiene algún valor cargado — mismo criterio para Día, Hora, Estadio y
// Oficial, así los 4 se leen igual de un vistazo.
function estiloSegunCompletado(valor, base) {
  const completo = !!(valor && String(valor).trim());
  return {
    ...base,
    backgroundColor: completo ? C.celeste : '#fff',
    border: `1.5px solid ${completo ? C.azul : '#ccc'}`,
    ...(completo ? { color: C.azul } : {}), // vacío: no forzar color, así se ve el gris tenue del placeholder
  };
}

// Punto 11: numeración automática, un solo contador para todos los
// torneos/divisiones — nunca se repite. Arranca en el número más alto que
// ya haya en Fixture + 1 (si en algún momento hay que arrancar desde un
// número puntual acordado de antemano, se ajusta el "piso" acá).
const PISO_NUMERACION = 0;
// "Limpiar filtros" (punto 5) resetea a TODO vacío, mostrando absolutamente
// todo — distinto del arranque por defecto (M + Camp. de 1° A), que es
// solo el caso más común al entrar.
const FILTROS_VACIOS = { generoMF: '', torneo: '', fechaNro: '', soloPendientes: false, equipo: '', oficial: '', asignacion: '' };
function proximoNumero(fixture) {
  const maximo = fixture.reduce((max, p) => {
    const n = Number(p.partido_nro);
    return Number.isFinite(n) && n > max ? n : max;
  }, PISO_NUMERACION);
  return maximo + 1;
}

export default function PantallaAsignarPartidos({ onBack, listas, fixtureFilas, clubesFilas: clubesFilasIniciales, abrirFixtureAlEntrar }) {
  const [cargando, setCargando] = useState(!fixtureFilas);
  const [error, setError] = useState(false);
  const [fixture, setFixture] = useState(() => fixtureFilas ? parsearFixture(fixtureFilas) : []);
  const [clubesFilas, setClubesFilas] = useState(clubesFilasIniciales || []);
  const [inicializado, setInicializado] = useState(!!fixtureFilas);
  // Punto 4: arranca con M y "Camp. de 1° A" preseleccionados (el caso más
  // común), en vez de "todos" — si hace falta ver otra cosa, se cambia
  // igual que siempre.
  const [filtros, setFiltros] = useState({ generoMF: 'M', torneo: 'Camp. de 1° A', fechaNro: '', soloPendientes: false, equipo: '', oficial: '', asignacion: '' });
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [guardando, setGuardando] = useState(false);
  const [avisoGuardado, setAvisoGuardado] = useState('');
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [generandoExcel, setGenerandoExcel] = useState(false);

  // Corrige el Torneo por defecto si el texto exacto que puse ("Camp. de 1°
  // A") no coincide letra por letra con el que está guardado de verdad en
  // la planilla (un caracter como "°" puede verse igual pero ser distinto
  // por dentro) — caso real: el filtro decía "Camp. de 1° A" pero no
  // filtraba nada, porque el desplegable no encontraba ESA opción exacta.
  // Busca de forma más flexible (sin importar mayúsculas/tildes/espacios) y
  // ajusta el filtro al nombre real, una sola vez, apenas llega la lista.
  useEffect(() => {
    const normalizar = (s) => (s || '').trim().toUpperCase().replace(/[°º]/g, '');
    const torneosReales = listas?.torneos || [];
    if (torneosReales.length === 0) return;
    if (torneosReales.includes(filtros.torneo)) return; // ya coincide exacto, no hay nada que corregir
    const coincidencia = torneosReales.find(t => normalizar(t) === normalizar(filtros.torneo));
    if (coincidencia) setFiltros(f => ({ ...f, torneo: coincidencia }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listas?.torneos]);

  // --- Punto 7/8/9: acceso a Fixture directo desde Asignar Partidos ---
  const [mostrarFixture, setMostrarFixture] = useState(!!abrirFixtureAlEntrar);
  const [nuevosFixture, setNuevosFixture] = useState([['', '', '']]); // N°, Local, Visitante
  const [guardandoFixture, setGuardandoFixture] = useState(false);
  const [mensajeFixture, setMensajeFixture] = useState('');
  const [fechaFiltroCargados, setFechaFiltroCargados] = useState(''); // punto 8: filtro nuevo, solo acá
  const [filasBorradas, setFilasBorradas] = useState(new Set()); // _filaIndex marcados para borrar al guardar
  const [importando, setImportando] = useState(false);
  const [mensajeImport, setMensajeImport] = useState('');
  const inputArchivoRef = useRef(null);

  // Si App.jsx todavía no había terminado de traer fixtureFilas/clubesFilas
  // al montar este componente, useState solo agarra el valor inicial (vacío)
  // UNA vez — sin este efecto, cuando el fetch de App.jsx terminaba después,
  // la pantalla se quedaba pegada con datos vacíos para siempre (así
  // explicaba estadios "faltantes": no faltaban en Clubes, la pantalla
  // tenía una copia vieja). Solo se aplica hasta que se "inicializa" una
  // vez — después, no vuelve a pisar lo que el usuario ya esté editando.
  useEffect(() => {
    if (inicializado || !fixtureFilas) return;
    setFixture(parsearFixture(fixtureFilas));
    setClubesFilas(clubesFilasIniciales || []);
    setCargando(false);
    setInicializado(true);
  }, [fixtureFilas, clubesFilasIniciales, inicializado]);

  // Bug real corregido: fixtureFilas es una FOTO de lo que había al
  // momento de loguearse — si después se cargó Fixture desde Editar Listas
  // (o desde el botón Fixture de acá mismo, en OTRA pestaña/sesión), esta
  // pantalla seguía mostrando la foto vieja hasta hacer F5 (que fuerza un
  // login nuevo). Acá se pide la versión fresca en segundo plano, apenas
  // se entra — sin mostrar "Cargando..." si ya hay algo de la foto inicial
  // para mostrar mientras tanto, y sin pisar ediciones que el usuario ya
  // esté haciendo en pantalla (por eso corre UNA sola vez, al montar).
  // refrescoContador avisa al efecto de autocompletado (más abajo) que
  // hay datos nuevos y tiene que volver a pasar — sin esto, pisaba el
  // Estadio/N° ya autocompletado con la copia recién traída, que todavía
  // no lo tiene.
  const [refrescoContador, setRefrescoContador] = useState(0);
  useEffect(() => {
    (async () => {
      const { ok, hojas } = await obtenerListasAdmin({ soloHoja: 'Fixture' });
      if (ok) {
        setFixture(parsearFixture(hojas.Fixture));
        setRefrescoContador(n => n + 1);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si App.jsx ya trajo Fixture/Clubes al loguearse, se usa esa copia de
  // entrada — no hace falta pedirlo de nuevo ni mostrar "Cargando..." al
  // entrar acá (antes se traía todo de nuevo, esa era la demora).
  const cargar = async () => {
    setCargando(true);
    const { ok, hojas } = await obtenerListasAdmin();
    setError(!ok);
    if (ok) {
      setFixture(parsearFixture(hojas.Fixture));
      setClubesFilas(hojas.Clubes || []);
      setInicializado(true);
    }
    setCargando(false);
  };

  useEffect(() => {
    if (!fixtureFilas && !inicializado) cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Asigna número de partido y Estadio por defecto a las filas que todavía
  // no los tienen, apenas se cargan los datos — sin pisar nunca lo que ya
  // esté puesto. El Estadio faltante era un bug real: se calculaba pero
  // nunca se aplicaba como valor, solo quedaba disponible como opción del
  // desplegable — por eso parecía que "no traía el dato".
  useEffect(() => {
    if (cargando || error) return;
    setFixture(fx => {
      let siguiente = proximoNumero(fx);
      let cambio = false;
      const actualizado = fx.map(p => {
        let nuevo = p;
        if (!nuevo.partido_nro) { cambio = true; nuevo = { ...nuevo, partido_nro: String(siguiente++) }; }
        if (!nuevo.estadio) {
          const { principal } = estadiosDelClub(p.local, clubesFilas);
          if (principal) { cambio = true; nuevo = { ...nuevo, estadio: principal }; }
        }
        return nuevo;
      });
      return cambio ? actualizado : fx;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargando, error, clubesFilas, refrescoContador]);

  const opciones = useMemo(() => ({
    torneos: listas?.torneos || [],
    fechas: [...new Set(fixture.map(p => p.fecha_nro).filter(Boolean))].sort((a, b) => Number(a) - Number(b)),
    equipos: [...new Set(fixture.flatMap(p => [p.local, p.visitante]).filter(Boolean))].sort(),
    // GESTION (perfil liviano que solo ve Informes) no es un Oficial de
    // Partido de verdad, así que no tiene sentido que aparezca acá como
    // alguien a quien asignarle un partido.
    oficiales: [...new Set((listas?.oficiales || [])
      .filter(nombre => listas?.perfiles?.[(nombre || '').trim().toUpperCase()] !== 'GESTION')
      .map(soloApellido))].filter(Boolean).sort(),
  }), [fixture, listas]);

  const filtrados = useMemo(() => fixture.filter(p =>
    (!filtros.torneo || p.torneo === filtros.torneo) &&
    (!filtros.fechaNro || p.fecha_nro === filtros.fechaNro) &&
    (!filtros.generoMF || p.division === filtros.generoMF) &&
    (!filtros.soloPendientes || ESTADOS_PEND.includes(p.motivo)) &&
    (!filtros.equipo || p.local === filtros.equipo || p.visitante === filtros.equipo) &&
    (!filtros.oficial || soloApellido(p.oficial_asignado).toUpperCase() === filtros.oficial.toUpperCase()) &&
    (!filtros.asignacion || (filtros.asignacion === 'ASIGNADOS' ? !!p.oficial_asignado : !p.oficial_asignado))
  ), [fixture, filtros]);

  // Actualiza UN campo de UN partido puntual, identificado por su posición
  // real de fila (_filaIndex) — no por Torneo+Fecha+Local+Visitante. Esto
  // importa: si en algún momento el mismo partido se cargó 2 veces sin
  // querer (a mano y por Excel, por ejemplo), esos 4 datos coinciden en
  // las 2 filas — con la clave vieja, tocar la fecha de una tocaba
  // también la otra (bug real confirmado). La posición de fila nunca se
  // puede confundir con otra.
  const actualizarPartido = (filaIndex, campo, valor) => {
    setFixture(fx => fx.map(p => p._filaIndex === filaIndex ? { ...p, [campo]: valor } : p));
  };

  const toggleSeleccionado = (filaIndex) => {
    setSeleccionados(s => {
      const nuevo = new Set(s);
      if (nuevo.has(filaIndex)) nuevo.delete(filaIndex); else nuevo.add(filaIndex);
      return nuevo;
    });
  };

  // --- Punto 7/8/9 ---
  const cambiarCeldaFixtureNuevo = (fila, col, valor) => {
    setNuevosFixture(prev => prev.map((f, i) => i === fila ? f.map((c, j) => j === col ? valor : c) : f));
  };
  const agregarFilaFixtureNuevo = () => setNuevosFixture(prev => [...prev, ['', '', '']]);
  const borrarFilaFixtureNuevo = (i) => setNuevosFixture(prev => prev.filter((_, idx) => idx !== i));

  // Mismo mecanismo de pegado que en Editar Listas: pegar 3 columnas
  // copiadas de Excel (Fecha N°, Local, Visitante) de una sola vez.
  const pegarEnFixtureNuevo = (filaDesde, colDesde, e) => {
    const texto = e.clipboardData.getData('text');
    const filasPegadas = texto.split(/\r?\n/).filter(f => f.trim() !== '').map(f => f.split('\t'));
    if (filasPegadas.length === 0 || (filasPegadas.length === 1 && filasPegadas[0].length === 1)) return;
    e.preventDefault();
    setNuevosFixture(prev => {
      const nuevo = prev.map(f => [...f]);
      filasPegadas.forEach((filaPegada, i) => {
        const destino = filaDesde + i;
        while (nuevo.length <= destino) nuevo.push(['', '', '']);
        filaPegada.forEach((valor, j) => {
          const col = colDesde + j;
          if (col < 3) nuevo[destino][col] = valor.trim();
        });
      });
      return nuevo;
    });
  };

  // Punto 9: chequea el nombre contra la lista real de Clubes, para
  // avisar en el momento si no coincide con ninguno (nombre mal escrito,
  // club que todavía no está cargado, etc.) — se corrige ahí mismo, antes
  // de guardar, en vez de descubrirlo después en Asignar Partidos.
  const clubesConocidos = useMemo(
    () => new Set((clubesFilas || []).map(f => String(f[0] || '').trim().toUpperCase())),
    [clubesFilas]
  );
  const nombreClubValido = (nombre) => !nombre.trim() || clubesConocidos.has(nombre.trim().toUpperCase());

  const guardarFixtureNuevo = async () => {
    setGuardandoFixture(true);
    setMensajeFixture('');
    const nuevas = nuevosFixture
      .map(f => f.map(c => String(c ?? '').trim()))
      .filter(f => f[1] || f[2]);
    if (nuevas.length === 0) { setGuardandoFixture(false); setMensajeFixture('❌ Cargá al menos un partido.'); return; }
    try {
      const { ok, hojas } = await obtenerListasAdmin({ soloHoja: 'Fixture' });
      const fixtureFrescoRaw = ok ? (hojas.Fixture || []) : serializarFixture(fixture);
      const filasNuevasCompletas = nuevas.map(([fechaNro, local, visitante]) => [
        filtros.torneo, filtros.generoMF, fechaNro, local, visitante, '', '', '', '', '', '', '',
      ]);
      const combinado = [...fixtureFrescoRaw, ...filasNuevasCompletas];
      const okGuardar = await guardarListaAdmin('Fixture', combinado);
      setMensajeFixture(okGuardar ? `✅ Se agregaron ${nuevas.length} partido(s) al Fixture.` : '❌ No se pudo guardar, revisá la conexión');
      if (okGuardar) {
        setNuevosFixture([['', '', '']]);
        setFixture(parsearFixture(combinado));
      }
    } catch {
      setMensajeFixture('❌ No se pudo guardar, revisá la conexión');
    } finally {
      setGuardandoFixture(false);
    }
  };

  // Punto 8: borrar un partido ya cargado, ahí mismo — se aplica en
  // pantalla al toque, y se confirma en la planilla real recién cuando se
  // toca "Guardar" (mismo mecanismo prolijo que el resto de la pantalla).
  const borrarPartidoCargado = (filaIndex) => {
    setFilasBorradas(prev => new Set(prev).add(filaIndex));
    setFixture(fx => fx.filter(p => p._filaIndex !== filaIndex));
  };

  // Subir el fixture completo de una vez desde un Excel, en vez de cargarlo
  // partido por partido a mano. Espera columnas Torneo, Division, Fecha,
  // Local, Visitante (sin distinguir mayúscula/minúscula ni espacios de
  // más). Se SUMA al Fixture existente, nunca lo reemplaza — mismo criterio
  // que la carga manual/pegado de arriba.
  const importarExcelFixture = async (archivo) => {
    setImportando(true);
    setMensajeImport('');
    try {
      const buffer = await archivo.arrayBuffer();
      const libro = XLSX.read(buffer, { type: 'array' });
      const hoja = libro.Sheets[libro.SheetNames[0]];
      const filas = XLSX.utils.sheet_to_json(hoja, { defval: '' });

      if (filas.length === 0) {
        setMensajeImport('❌ El archivo no tiene filas de datos.');
        setImportando(false);
        return;
      }

      const normalizarClave = (obj, buscada) => {
        const clave = Object.keys(obj).find(k => k.trim().toLowerCase() === buscada);
        return clave ? String(obj[clave] ?? '').trim() : '';
      };

      const nuevasFilas = filas
        .map(fila => ({
          torneo: normalizarClave(fila, 'torneo'),
          division: normalizarClave(fila, 'division') || normalizarClave(fila, 'división'),
          fecha: normalizarClave(fila, 'fecha'),
          local: normalizarClave(fila, 'local'),
          visitante: normalizarClave(fila, 'visitante'),
        }))
        .filter(f => f.local || f.visitante);

      if (nuevasFilas.length === 0) {
        setMensajeImport('❌ No se encontraron columnas Torneo/Division/Fecha/Local/Visitante en el archivo.');
        setImportando(false);
        return;
      }

      const filasCompletas = nuevasFilas.map(f => [
        f.torneo, f.division.toUpperCase().startsWith('F') ? 'F' : 'M', f.fecha, f.local, f.visitante, '', '', '', '', '', '', '',
      ]);

      const { ok, hojas } = await obtenerListasAdmin({ soloHoja: 'Fixture' });
      const fixtureActual = ok ? (hojas.Fixture || []) : serializarFixture(fixture);
      const combinado = [...fixtureActual, ...filasCompletas];
      const okGuardar = await guardarListaAdmin('Fixture', combinado);
      setMensajeImport(okGuardar ? `✅ Se importaron ${filasCompletas.length} partido(s) del Excel.` : '❌ No se pudo guardar, revisá la conexión');
      if (okGuardar) setFixture(parsearFixture(combinado));
    } catch (err) {
      setMensajeImport(`❌ No se pudo leer el archivo. Revisá que sea un Excel válido.\n\nDetalle técnico: ${err?.message || err}`);
    } finally {
      setImportando(false);
      if (inputArchivoRef.current) inputArchivoRef.current.value = '';
    }
  };

  // Antes de guardar, trae la versión más fresca posible del fixture
  // completo (por si otro coordinador guardó algo mientras tanto) y aplica
  // ahí arriba SOLO los cambios hechos en esta sesión — así no se pisan
  // cambios ajenos con una copia vieja. También se combina por posición de
  // fila, no por Torneo+Fecha+Local+Visitante, por el mismo motivo de
  // arriba (evitar que 2 partidos "iguales" en esos 4 datos se confundan).
  const handleGuardar = async () => {
    setGuardando(true);
    setAvisoGuardado('');
    try {
      const { ok, hojas } = await obtenerListasAdmin();
      const fixtureFresco = ok ? parsearFixture(hojas.Fixture) : fixture;
      const cambiosPorFila = new Map(fixture.map(p => [p._filaIndex, p]));
      const combinado = fixtureFresco
        .filter(p => !filasBorradas.has(p._filaIndex)) // punto 8: respeta los borrados hechos en la vista de Fixture
        .map(p => cambiosPorFila.get(p._filaIndex) || p);
      const okGuardar = await guardarListaAdmin('Fixture', serializarFixture(combinado));
      setAvisoGuardado(okGuardar ? '✅ Guardado' : '❌ No se pudo guardar, revisá la conexión');
      if (okGuardar) { setFixture(combinado); setFilasBorradas(new Set()); }
    } catch {
      setAvisoGuardado('❌ No se pudo guardar, revisá la conexión');
    } finally {
      setGuardando(false);
    }
  };

  const handleEnviarWSP = () => {
    const elegidos = filtrados.filter(p => seleccionados.has(p._filaIndex));
    if (elegidos.length === 0) return;
    const texto = [
      `📋 Partidos asignados`,
      '',
      elegidos.map(p => `${p.local} vs ${p.visitante} — ${p.dia ? `${diaDeLaSemana(p.dia)} ${p.dia}` : '(sin fecha)'}${p.hora ? `, ${p.hora} hs` : ''}${p.estadio ? ` — Estadio: ${p.estadio}` : ''}`).join('\n\n'),
    ].join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`);
  };

  const handleGenerarPDF = async () => {
    setGenerandoPDF(true);
    try {
      const { bytes, nombreSugerido } = await generarPDFAsignaciones(filtrados);
      descargarPDF(bytes, nombreSugerido);
    } catch (err) {
      alert(`No se pudo generar el PDF.\n\nDetalle técnico: ${err?.message || err}`);
    } finally {
      setGenerandoPDF(false);
    }
  };

  const handleGenerarExcel = () => {
    setGenerandoExcel(true);
    try {
      const { bytes, nombreSugerido } = generarExcelAsignaciones(filtrados);
      descargarExcel(bytes, nombreSugerido);
    } catch (err) {
      alert(`No se pudo generar el Excel.\n\nDetalle técnico: ${err?.message || err}`);
    } finally {
      setGenerandoExcel(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ background: C.azul, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: 8, fontSize: 18, cursor: 'pointer' }}>←</button>
        <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, textTransform: 'uppercase' }}>Asignar Partidos</div>
        {/* Punto 7 (reubicado): acceso a Fixture — es secundario, así que va
            chico, pegado al margen derecho del título, no como su propia
            línea abajo (se confundía con un filtro más). */}
        <button onClick={() => setMostrarFixture(v => !v)} style={{
          marginLeft: 'auto', background: mostrarFixture ? '#fff' : 'rgba(255,255,255,.15)', color: mostrarFixture ? C.azul : '#fff',
          border: 'none', borderRadius: 8, padding: '6px 10px', fontWeight: 700, fontSize: 12, cursor: 'pointer', flexShrink: 0,
        }}>
          📄 Fixture
        </button>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {cargando && <div style={{ textAlign: 'center', color: '#999', fontSize: 14, padding: '20px 0' }}>Cargando...</div>}
        {!cargando && error && (
          <div style={{ textAlign: 'center', color: C.rojo, fontSize: 13 }}>
            No se pudo traer el fixture. Revisá la conexión.
            <div><button onClick={cargar} style={{ marginTop: 8, background: C.azul, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 700, cursor: 'pointer' }}>Reintentar</button></div>
          </div>
        )}

        {!cargando && !error && (
          <>
            {/* Punto 7: el botón se movió al header (arriba, al lado del
                título) — acá queda solo la vista que se muestra al tocarlo. */}
            {mostrarFixture ? (
              <VistaFixture
                torneo={filtros.torneo} genero={filtros.generoMF} opcionesTorneo={opciones.torneos}
                fixture={fixture} clubesConocidos={clubesConocidos} nombreClubValido={nombreClubValido}
                nuevosFixture={nuevosFixture} cambiarCelda={cambiarCeldaFixtureNuevo} agregarFila={agregarFilaFixtureNuevo}
                borrarFila={borrarFilaFixtureNuevo} pegar={pegarEnFixtureNuevo} guardar={guardarFixtureNuevo}
                guardando={guardandoFixture} mensaje={mensajeFixture}
                fechaFiltro={fechaFiltroCargados} setFechaFiltro={setFechaFiltroCargados}
                setGeneroFiltro={g => setFiltros(f => ({ ...f, generoMF: g }))}
                setTorneoFiltro={t => setFiltros(f => ({ ...f, torneo: t }))}
                actualizarPartido={actualizarPartido} borrarPartido={borrarPartidoCargado}
                importarExcel={importarExcelFixture} importando={importando} mensajeImport={mensajeImport} inputArchivoRef={inputArchivoRef}
              />
            ) : (
              <>
            {/* Punto 2: el campo Fecha ganó el espacio que se le sacó a
                PEND (bajado a ~40% de su ancho anterior, ajustado al
                tamaño justo de la letra) — pensado para la pantalla del
                celular, donde el campo Fecha venía muy angosto. */}
            <div style={{ display: 'grid', gridTemplateColumns: '48px 48px 1.3fr 0.85fr 38px', gap: 5 }}>
              {['M', 'F'].map(g => (
                <button key={g} onClick={() => setFiltros(f => ({ ...f, generoMF: f.generoMF === g ? '' : g }))} style={{
                  height: 36, borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  background: filtros.generoMF === g ? C.azul : '#fff', color: filtros.generoMF === g ? '#fff' : C.azul, border: `1.5px solid ${C.azul}`,
                }}>{g}</button>
              ))}
              <select value={filtros.torneo} onChange={e => setFiltros(f => ({ ...f, torneo: e.target.value }))} style={{ height: 36, border: `1.5px solid ${C.azul}`, borderRadius: 8, padding: '0 4px', fontSize: 11, fontWeight: 600, color: C.azul, background: C.celeste, minWidth: 0 }}>
                <option value="">Torneo</option>
                {opciones.torneos.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <select value={filtros.fechaNro} onChange={e => setFiltros(f => ({ ...f, fechaNro: e.target.value }))} style={{ height: 36, border: `1.5px solid ${C.azul}`, borderRadius: 8, padding: '0 2px', fontSize: 11, fontWeight: 600, color: C.azul, background: C.celeste, minWidth: 0 }}>
                <option value="">Fec.</option>
                {opciones.fechas.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <button onClick={() => setFiltros(f => ({ ...f, soloPendientes: !f.soloPendientes }))} style={{
                height: 36, borderRadius: 8, fontWeight: 700, fontSize: 10, cursor: 'pointer', padding: '0 2px',
                background: filtros.soloPendientes ? C.rojo : '#fde4cc', color: filtros.soloPendientes ? '#fff' : C.rojo, border: `1.5px solid ${C.rojo}`,
              }}>
                PEND
              </button>
            </div>

            {/* Punto 2: segunda línea de filtros — Equipo, Oficial, y
                Asignados/Sin Asignar — mismo tamaño y formato que la
                línea de arriba. */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5 }}>
              <select value={filtros.equipo} onChange={e => setFiltros(f => ({ ...f, equipo: e.target.value }))} style={{ height: 36, border: `1.5px solid ${C.azul}`, borderRadius: 8, padding: '0 4px', fontSize: 11, fontWeight: 600, color: C.azul, background: C.celeste, minWidth: 0 }}>
                <option value="">Equipo</option>
                {opciones.equipos.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <select value={filtros.oficial} onChange={e => setFiltros(f => ({ ...f, oficial: e.target.value }))} style={{ height: 36, border: `1.5px solid ${C.azul}`, borderRadius: 8, padding: '0 4px', fontSize: 11, fontWeight: 600, color: C.azul, background: C.celeste, minWidth: 0 }}>
                <option value="">Oficial</option>
                {opciones.oficiales.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <select value={filtros.asignacion} onChange={e => setFiltros(f => ({ ...f, asignacion: e.target.value }))} style={{ height: 36, border: `1.5px solid ${C.azul}`, borderRadius: 8, padding: '0 4px', fontSize: 11, fontWeight: 600, color: C.azul, background: C.celeste, minWidth: 0 }}>
                <option value="">Todos</option>
                <option value="ASIGNADOS">Asignados</option>
                <option value="SIN_ASIGNAR">Sin Asignar</option>
              </select>
            </div>

            {(filtros.generoMF || filtros.torneo || filtros.fechaNro || filtros.soloPendientes || filtros.equipo || filtros.oficial || filtros.asignacion) && (
              <button onClick={() => setFiltros(FILTROS_VACIOS)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: C.rojo, fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                ✕ Limpiar filtros
              </button>
            )}

            {/* Punto 2: si hay UN torneo puntual elegido, el título va acá
                arriba de la lista (así no se repite en cada tarjeta). Si
                están "todos los torneos" juntos, cada tarjeta aclara el
                suyo, porque pueden venir mezclados. */}
            {filtros.torneo && (
              <div style={{ fontSize: 15, fontWeight: 800, color: '#000' }}>
                {filtros.torneo} — {filtros.generoMF === 'F' ? 'Fem' : filtros.generoMF === 'M' ? 'Masc' : 'M/F'}
                {filtros.fechaNro && ` — Fecha ${filtros.fechaNro}`}
              </div>
            )}

            {filtrados.length === 0 && <div style={{ textAlign: 'center', color: '#999', fontSize: 13, padding: '16px 0' }}>Ningún partido coincide con estos filtros.</div>}

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filtrados.map((p, idx) => {
                const filaIndex = p._filaIndex;
                const estadiosClub = estadiosDelClub(p.local, clubesFilas);
                const opcionesEstadio = [estadiosClub.principal, estadiosClub.alt2, estadiosClub.alt3, ...(listas?.estadios || [])].filter((v, i, arr) => v && arr.indexOf(v) === i);
                const seCubre = p.se_cubre !== 'NO'; // SI por defecto
                const seleccionado = seleccionados.has(filaIndex);
                // Partido "completo": tiene Fecha, Hora y Oficial cargados —
                // se resalta con borde verde agua para distinguirlo de un
                // vistazo del resto, que todavía necesita algo.
                const completo = seCubre && !!p.dia && !!p.hora && !!p.oficial_asignado;
                return (
                  <div key={filaIndex} style={completo ? {
                    border: `2px solid ${C.verde}`, background: '#eaf7ee', borderRadius: 10, padding: 8,
                    marginTop: idx > 0 ? 4 : 0, marginBottom: 4,
                    display: 'flex', flexDirection: 'column', gap: 4,
                  } : {
                    borderTop: idx === 0 ? 'none' : `1px solid ${C.celeste}`, padding: '8px 0 8px',
                    display: 'flex', flexDirection: 'column', gap: 4,
                  }}>
                    {/* Punto 1: esta línea muestra lo que NO esté ya fijado
                        arriba en los filtros — Torneo (si no elegiste uno
                        puntual), M/F, y ahora también Fecha N° (si no
                        elegiste una puntual). Si ya elegiste torneo Y
                        fecha, esta línea no hace falta, ya está arriba. */}
                    {(!filtros.torneo || !filtros.fechaNro) && (
                      <div style={{ fontSize: 10, color: '#999' }}>
                        {!filtros.torneo && `${p.torneo} — `}
                        {p.division === 'M' ? 'Masc.' : 'Fem.'}
                        {!filtros.fechaNro && ` — Fecha ${p.fecha_nro || '—'}`}
                      </div>
                    )}

                    {/* Línea 1: N° - LOCAL - VISITANTE - ESTADIO - "WSP" (título del check de abajo) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '26px 1fr 1fr 1fr 28px', gap: 5, alignItems: 'center' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.gris, textAlign: 'center' }}>{p.partido_nro || '—'}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.azul, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.local}>{p.local}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.azul, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.visitante}>{p.visitante}</div>
                      <SelectLibre value={p.estadio} onChange={v => actualizarPartido(filaIndex, 'estadio', v)} options={opcionesEstadio} placeholder="Estadio" style={estiloSegunCompletado(p.estadio, estiloDesplegable)} />
                      <div style={{ fontSize: 9, fontWeight: 700, color: C.gris, textAlign: 'center' }}>WSP</div>
                    </div>

                    {/* Línea 2: check cubre (bajo el N°) - Fecha - Hora - Oficial (solo apellido) - check seleccionar (bajo "WSP") */}
                    <div style={{ display: 'grid', gridTemplateColumns: '26px 1fr 1fr 1fr 28px', gap: 5, alignItems: 'center' }}>
                      <div onClick={() => actualizarPartido(filaIndex, 'se_cubre', seCubre ? 'NO' : 'SI')} style={{
                        width: 26, height: 26, borderRadius: 6, background: seCubre ? C.verde : '#fff', border: `2px solid ${seCubre ? C.verde : C.rojo}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', justifySelf: 'center',
                      }}>
                        {seCubre && <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>✓</span>}
                      </div>
                      <input
                        type="date" value={ddmmaaaaAIso(p.dia)} onChange={e => actualizarPartido(filaIndex, 'dia', isoADdmmaaaa(e.target.value))}
                        style={{ ...estiloSegunCompletado(p.dia, estiloTexto), width: '100%', minWidth: 0, borderRadius: 8, boxSizing: 'border-box' }}
                      />
                      <InputHora value={p.hora} onChange={v => actualizarPartido(filaIndex, 'hora', v)} sinBoton style={estiloSegunCompletado(p.hora, estiloTexto)} />
                      <SelectLibre value={p.oficial_asignado} onChange={v => actualizarPartido(filaIndex, 'oficial_asignado', v)} options={opciones.oficiales} placeholder="Oficial" style={estiloSegunCompletado(p.oficial_asignado, estiloDesplegable)} />
                      <div onClick={() => toggleSeleccionado(filaIndex)} style={{
                        width: 26, height: 26, borderRadius: 6, background: seleccionado ? C.verde : '#fff', border: `2px solid ${seleccionado ? C.verde : C.azul}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', justifySelf: 'center',
                      }}>
                        {seleccionado && <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>✓</span>}
                      </div>
                    </div>

                    {!seCubre && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 6 }}>
                        <Select value={ESTADOS_NO_CUBRE.includes(p.motivo) ? p.motivo : ''} onChange={v => actualizarPartido(filaIndex, 'motivo', v)} options={ESTADOS_NO_CUBRE} placeholder="Estado" style={estiloDesplegable} />
                        <Input value={ESTADOS_NO_CUBRE.includes(p.motivo) ? '' : p.motivo} onChange={v => actualizarPartido(filaIndex, 'motivo', v)} placeholder="O escribí el motivo..." style={estiloTexto} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
            )}
          </>
        )}
      </div>

      {!cargando && !error && (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {avisoGuardado && <div style={{ fontSize: 12, fontWeight: 700, textAlign: 'center' }}>{avisoGuardado}</div>}
          <button onClick={handleGuardar} disabled={guardando} style={{
            minHeight: 52, background: guardando ? '#8fa3c9' : C.azul, color: '#fff', border: 'none', borderRadius: 10,
            fontSize: 15, fontWeight: 700, cursor: guardando ? 'wait' : 'pointer', textTransform: 'uppercase',
          }}>
            {guardando ? 'Guardando...' : '💾 Guardar Asignaciones'}
          </button>
          <button onClick={handleEnviarWSP} disabled={seleccionados.size === 0} style={{
            minHeight: 52, background: seleccionados.size === 0 ? '#eee' : C.verde, color: seleccionados.size === 0 ? '#999' : '#fff', border: 'none', borderRadius: 10,
            fontSize: 15, fontWeight: 700, cursor: seleccionados.size === 0 ? 'not-allowed' : 'pointer', textTransform: 'uppercase',
          }}>
            📎 Enviar {seleccionados.size > 0 ? `${seleccionados.size} ` : ''}por WhatsApp
          </button>
          <button onClick={handleGenerarPDF} disabled={generandoPDF || filtrados.length === 0} style={{
            minHeight: 52, background: '#fff', color: C.azul, border: `1.5px solid ${C.azul}`, borderRadius: 10,
            fontSize: 15, fontWeight: 700, cursor: (generandoPDF || filtrados.length === 0) ? 'not-allowed' : 'pointer', textTransform: 'uppercase',
          }}>
            {generandoPDF ? 'Generando...' : '📄 Generar PDF de estos partidos'}
          </button>
          <button onClick={handleGenerarExcel} disabled={generandoExcel || filtrados.length === 0} style={{
            minHeight: 52, background: '#fff', color: C.verde, border: `1.5px solid ${C.verde}`, borderRadius: 10,
            fontSize: 15, fontWeight: 700, cursor: (generandoExcel || filtrados.length === 0) ? 'not-allowed' : 'pointer', textTransform: 'uppercase',
          }}>
            {generandoExcel ? 'Generando...' : '📊 Generar Excel de estos partidos'}
          </button>
        </div>
      )}
    </div>
  );
}

// Punto 7/8/9: vista de Fixture embebida en Asignar Partidos — carga
// rápida (idéntica a la de Editar Listas, sin tocar esa) + partidos ya
// cargados como recuadros simples, editables/borrables ahí mismo.
function VistaFixture({
  torneo, genero, fixture, nombreClubValido, nuevosFixture, cambiarCelda, agregarFila, borrarFila, pegar,
  guardar, guardando, mensaje, fechaFiltro, setFechaFiltro, setGeneroFiltro, setTorneoFiltro, opcionesTorneo,
  actualizarPartido, borrarPartido, importarExcel, importando, mensajeImport, inputArchivoRef,
}) {
  const cargadosDelTorneo = useMemo(
    () => fixture.filter(p => (!torneo || p.torneo === torneo) && (!genero || p.division === genero)),
    [fixture, torneo, genero]
  );
  const fechasDisponibles = useMemo(
    () => [...new Set(fixture.filter(p => !torneo || p.torneo === torneo).map(p => p.fecha_nro).filter(Boolean))]
      .sort((a, b) => Number(a) - Number(b)),
    [fixture, torneo]
  );
  const cargadosFiltrados = fechaFiltro ? cargadosDelTorneo.filter(p => p.fecha_nro === fechaFiltro) : cargadosDelTorneo;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* El Torneo se elige acá mismo (además de reflejar/actualizar el
          filtro principal de arriba) — antes quedaba fijo al que ya
          estuviera elegido arriba, sin poder cambiarlo desde esta vista. */}
      <select value={torneo} onChange={e => setTorneoFiltro(e.target.value)} style={{ height: 40, border: `1.5px solid ${C.azul}`, borderRadius: 8, padding: '0 10px', fontSize: 13, fontWeight: 700, color: C.azul, background: C.celeste }}>
        <option value="">Elegí el Torneo</option>
        {opcionesTorneo.map(t => <option key={t} value={t}>{t}</option>)}
      </select>

      {!torneo && (
        <div style={{ fontSize: 12, color: C.rojo }}>Elegí un Torneo arriba antes de cargar Fixture.</div>
      )}

      {torneo && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.azul }}>{torneo} — {genero === 'F' ? 'Femenino' : 'Masculino'}</div>

          {/* Partidos ya cargados (punto 8): recuadros simples, editables y
              borrables ahí mismo — M/F reducido a 2 botones (Torneo ya
              elegido arriba) + filtro de Fecha nuevo a la derecha. */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: 6 }}>
            {['M', 'F'].map(g => (
              <button key={g} onClick={() => setGeneroFiltro(g)} style={{
                height: 36, borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                background: genero === g ? C.azul : '#fff', color: genero === g ? '#fff' : C.azul, border: `1.5px solid ${C.azul}`,
              }}>{g}</button>
            ))}
            <select value={fechaFiltro} onChange={e => setFechaFiltro(e.target.value)} style={{ height: 36, border: `1.5px solid ${C.azul}`, borderRadius: 8, padding: '0 6px', fontSize: 12, fontWeight: 600, color: C.azul, background: C.celeste }}>
              <option value="">Todas las fechas</option>
              {fechasDisponibles.map(f => <option key={f} value={f}>Fecha {f}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
            {cargadosFiltrados.length === 0 && <div style={{ fontSize: 12, color: '#999', textAlign: 'center' }}>No hay partidos cargados con este filtro.</div>}
            {cargadosFiltrados.map(p => (
              <div key={p._filaIndex} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input value={p.partido_nro} onChange={e => actualizarPartido(p._filaIndex, 'partido_nro', e.target.value)}
                  placeholder="N°" style={{ flex: 0.5, minWidth: 0, height: 36, borderRadius: 6, padding: '0 6px', fontSize: 12, border: `1.5px solid ${C.azul}`, color: C.azul }} />
                <input value={p.fecha_nro} onChange={e => actualizarPartido(p._filaIndex, 'fecha_nro', e.target.value)}
                  placeholder="Fec." style={{ flex: 0.5, minWidth: 0, height: 36, borderRadius: 6, padding: '0 6px', fontSize: 12, border: `1.5px solid ${C.azul}`, color: C.azul }} />
                <input value={p.local} onChange={e => actualizarPartido(p._filaIndex, 'local', e.target.value)}
                  placeholder="Local" style={{ flex: 1, minWidth: 0, height: 36, borderRadius: 6, padding: '0 6px', fontSize: 12, textTransform: 'uppercase', border: `1.5px solid ${nombreClubValido(p.local) ? C.azul : C.rojo}`, color: C.azul }} />
                <input value={p.visitante} onChange={e => actualizarPartido(p._filaIndex, 'visitante', e.target.value)}
                  placeholder="Visitante" style={{ flex: 1, minWidth: 0, height: 36, borderRadius: 6, padding: '0 6px', fontSize: 12, textTransform: 'uppercase', border: `1.5px solid ${nombreClubValido(p.visitante) ? C.azul : C.rojo}`, color: C.azul }} />
                <button onClick={() => borrarPartido(p._filaIndex)} style={{ background: C.rojo, color: '#fff', border: 'none', borderRadius: 6, width: 30, height: 30, flexShrink: 0, fontWeight: 700, cursor: 'pointer' }}>✕</button>
              </div>
            ))}
          </div>

          {/* Carga rápida (punto 7/9): idéntica a Editar Listas — pegar de
              Excel, o cargar a mano, con aviso si el nombre no coincide con
              ningún club conocido. */}
          <div style={{ borderTop: `1.5px solid ${C.celeste}`, paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, color: '#666' }}>
              💡 Podés copiar 3 columnas de Excel (Fecha N°, Local, Visitante) y pegarlas directo acá.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {nuevosFixture.map((fila, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input type="text" inputMode="numeric" value={fila[0]} onChange={e => cambiarCelda(i, 0, e.target.value)}
                      onPaste={e => pegar(i, 0, e)} placeholder="N°"
                      style={{ flex: 0.6, minWidth: 0, height: 38, borderRadius: 6, padding: '0 8px', fontSize: 13, border: `1.5px solid ${C.azul}`, color: C.azul }} />
                    <input value={fila[1]} onChange={e => cambiarCelda(i, 1, e.target.value)}
                      onPaste={e => pegar(i, 1, e)} placeholder="Local"
                      style={{ flex: 1, minWidth: 0, height: 38, borderRadius: 6, padding: '0 8px', fontSize: 13, textTransform: 'uppercase', border: `1.5px solid ${fila[1] && !nombreClubValido(fila[1]) ? C.rojo : C.azul}`, color: C.azul }} />
                    <input value={fila[2]} onChange={e => cambiarCelda(i, 2, e.target.value)}
                      onPaste={e => pegar(i, 2, e)} placeholder="Visitante"
                      style={{ flex: 1, minWidth: 0, height: 38, borderRadius: 6, padding: '0 8px', fontSize: 13, textTransform: 'uppercase', border: `1.5px solid ${fila[2] && !nombreClubValido(fila[2]) ? C.rojo : C.azul}`, color: C.azul }} />
                    <button onClick={() => borrarFila(i)} style={{ background: C.rojo, color: '#fff', border: 'none', borderRadius: 6, width: 32, height: 32, flexShrink: 0, fontWeight: 700, cursor: 'pointer' }}>✕</button>
                  </div>
                  {((fila[1] && !nombreClubValido(fila[1])) || (fila[2] && !nombreClubValido(fila[2]))) && (
                    <div style={{ fontSize: 11, color: C.rojo }}>⚠ No coincide con ningún club conocido — revisá el nombre.</div>
                  )}
                </div>
              ))}
            </div>
            <button onClick={agregarFila} style={{ background: C.celeste, color: C.azul, border: `1.5px solid ${C.azul}`, borderRadius: 8, padding: '10px', fontWeight: 700, cursor: 'pointer' }}>
              + Agregar
            </button>
            <button onClick={guardar} disabled={guardando} style={{
              background: guardando ? '#8fa3c9' : C.verde, color: '#fff', border: 'none', borderRadius: 8,
              padding: '12px', fontWeight: 700, fontSize: 15, textTransform: 'uppercase', cursor: guardando ? 'wait' : 'pointer',
            }}>
              {guardando ? 'Guardando...' : 'Sumar al Fixture'}
            </button>
            {mensaje && <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 700 }}>{mensaje}</div>}

            <div style={{ borderTop: `1.5px solid ${C.celeste}`, marginTop: 4, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 12, color: '#666' }}>
                O subí el fixture completo de una vez desde un Excel, con columnas Torneo, Division, Fecha, Local y Visitante.
              </div>
              <input
                ref={inputArchivoRef} type="file" accept=".xlsx,.xls"
                onChange={e => e.target.files[0] && importarExcel(e.target.files[0])}
                disabled={importando}
                style={{ fontSize: 13 }}
              />
              {importando && <div style={{ textAlign: 'center', color: '#999', fontSize: 13 }}>Importando...</div>}
              {mensajeImport && <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, whiteSpace: 'pre-line' }}>{mensajeImport}</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
