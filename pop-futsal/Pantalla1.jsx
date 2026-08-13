import { useState, useEffect, useMemo } from 'react';
import { Input, InputHora, SelectLibre, Select } from './UI';
import { obtenerListasAdmin, guardarListaAdmin } from '../useListasAdmin';
import { parsearFixture, serializarFixture, estadiosDelClub } from '../utils/fixture';
import { generarPDFAsignaciones } from '../utils/asignacionesPdf';
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

export default function PantallaAsignarPartidos({ onBack, listas, fixtureFilas, clubesFilas: clubesFilasIniciales }) {
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
  }, [cargando, error, clubesFilas]);

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
      const combinado = fixtureFresco.map(p => cambiosPorFila.get(p._filaIndex) || p);
      const okGuardar = await guardarListaAdmin('Fixture', serializarFixture(combinado));
      setAvisoGuardado(okGuardar ? '✅ Guardado' : '❌ No se pudo guardar, revisá la conexión');
      if (okGuardar) setFixture(combinado);
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
      elegidos.map(p => `${p.local} vs ${p.visitante} — ${p.dia ? `${diaDeLaSemana(p.dia)} ${p.dia}` : '(sin fecha)'}${p.hora ? `, ${p.hora} hs` : ''}${p.estadio ? ` — ${p.estadio}` : ''}${p.partido_nro ? ` (Partido N° ${p.partido_nro})` : ''}`).join('\n\n'),
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

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ background: C.azul, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: 8, fontSize: 18, cursor: 'pointer' }}>←</button>
        <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, textTransform: 'uppercase' }}>Asignar Partidos</div>
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
                background: filtros.soloPendientes ? C.rojo : '#fff', color: filtros.soloPendientes ? '#fff' : C.rojo, border: `1.5px solid ${C.rojo}`,
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
                return (
                  <div key={filaIndex} style={{
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
        </div>
      )}
    </div>
  );
}
