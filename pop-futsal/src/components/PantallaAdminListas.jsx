import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { HOJAS_EDITABLES, obtenerListasAdmin, guardarListaAdmin } from '../useListasAdmin';

const C = { azul: '#0d1f4e', celeste: '#c6dbf5', verde: '#1a7a3a', rojo: '#e03030' };

// Perfil protegido: nadie puede editar ni borrar esta fila de la hoja
// Oficiales, salvo la propia persona logueada con ese nombre. Evita que
// alguien le resetee el PIN o le cambie el Perfil al creador de la app.
const NOMBRE_PROTEGIDO = 'GUSTAVO DEFFIS';

function esFilaProtegida(hojaActiva, fila) {
  return hojaActiva === 'Oficiales' && String(fila[0] || '').trim().toUpperCase() === NOMBRE_PROTEGIDO;
}

export default function PantallaAdminListas({ onBack, oficialLogueado }) {
  const [hojas, setHojas] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [hojaActiva, setHojaActiva] = useState(HOJAS_EDITABLES[0].clave);
  const [filasEdit, setFilasEdit] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  // Punto 16: carga rápida de Fixture — se preselecciona Torneo + M/F una
  // sola vez, y después se cargan de a muchos partidos con solo 3 columnas
  // (Fecha, Local, Visitante). Se SUMAN al Fixture existente, nunca lo
  // reemplazan — el resto de los datos (Estadio, Oficial, etc.) se completa
  // después desde "Asignar Partidos".
  const [fixtureTorneo, setFixtureTorneo] = useState('');
  const [fixtureGenero, setFixtureGenero] = useState('');
  const [fixtureFilas, setFixtureFilasNuevo] = useState([['', '', '']]);
  const [importando, setImportando] = useState(false);
  const [mensajeImport, setMensajeImport] = useState('');
  const [verCargados, setVerCargados] = useState(false);
  const inputArchivoRef = useRef(null);

  const cargar = async () => {
    setCargando(true);
    const { ok, hojas: nuevasHojas } = await obtenerListasAdmin();
    setError(!ok);
    setHojas(nuevasHojas);
    setCargando(false);
  };

  useEffect(() => { cargar(); }, []);

  // filasEdit se recalcula acá, en un solo lugar, cada vez que cambian los
  // datos traídos del servidor O la hoja elegida — antes se seteaba por
  // separado en cargar() y en cambiarHoja(), y si el fetch inicial tardaba
  // y el usuario elegía otra hoja mientras tanto, cuando el fetch lento
  // por fin terminaba pisaba la elección con los datos de la hoja vieja
  // (bug real: siempre traía "Torneos" primero, sin importar qué se
  // hubiera elegido, hasta seleccionar de nuevo).
  useEffect(() => {
    setFilasEdit((hojas[hojaActiva] || []).map(fila => [...fila]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hojas, hojaActiva]);

  const cambiarHoja = (clave) => {
    setHojaActiva(clave);
    setMensaje('');
  };

  const config = HOJAS_EDITABLES.find(h => h.clave === hojaActiva);

  const esMiPropioPerfil = (oficialLogueado || '').trim().toUpperCase() === NOMBRE_PROTEGIDO;

  const cambiarCelda = (fila, col, valor) => {
    setFilasEdit(prev => prev.map((f, i) => {
      if (i !== fila) return f;
      if (esFilaProtegida(hojaActiva, f) && !esMiPropioPerfil) return f; // bloqueado
      return f.map((c, j) => j === col ? valor : c);
    }));
  };

  const agregarFila = () => setFilasEdit(prev => [...prev, config.columnas.map(() => '')]);
  const borrarFila = (i) => setFilasEdit(prev => {
    const fila = prev[i];
    if (esFilaProtegida(hojaActiva, fila) && !esMiPropioPerfil) return prev; // bloqueado
    return prev.filter((_, idx) => idx !== i);
  });

  const guardar = async () => {
    setGuardando(true);
    setMensaje('');
    const filasLimpias = filasEdit
      .map(f => f.map(c => (c || '').trim()))
      .filter(f => f.some(c => c !== ''));
    const ok = await guardarListaAdmin(hojaActiva, filasLimpias);
    setMensaje(ok ? '✅ Guardado.' : '❌ No se pudo guardar. Revisá la conexión.');
    if (ok) {
      setFilasEdit(filasLimpias);
      setHojas(prev => ({ ...prev, [hojaActiva]: filasLimpias }));
    }
    setGuardando(false);
  };

  // --- Modo especial Fixture (punto 16) ---
  const cambiarCeldaFixture = (fila, col, valor) => {
    setFixtureFilasNuevo(prev => prev.map((f, i) => i === fila ? f.map((c, j) => j === col ? valor : c) : f));
  };
  const agregarFilaFixture = () => setFixtureFilasNuevo(prev => [...prev, ['', '', '']]);
  const borrarFilaFixture = (i) => setFixtureFilasNuevo(prev => prev.filter((_, idx) => idx !== i));

  // Punto 9: pegar varias filas copiadas de Excel de una sola vez, en vez
  // de tipear celda por celda o depender del archivo (más lento y con más
  // chances de fallar por conexión). Excel copia con TAB entre columnas y
  // salto de línea entre filas — se detecta un pegado así (más de una
  // celda) y arma las filas de la grilla directo, sin tocar la fila donde
  // se pegó si el pegado es de una sola celda (deja el comportamiento
  // normal de pegar texto suelto).
  const pegarEnFixture = (filaDesde, colDesde, e) => {
    const texto = e.clipboardData.getData('text');
    const filasPegadas = texto.split(/\r?\n/).filter(f => f.trim() !== '').map(f => f.split('\t'));
    if (filasPegadas.length === 0 || (filasPegadas.length === 1 && filasPegadas[0].length === 1)) return; // pegado normal de 1 celda
    e.preventDefault();
    setFixtureFilasNuevo(prev => {
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

  const guardarFixture = async () => {
    setGuardando(true);
    setMensaje('');
    const nuevas = fixtureFilas
      .map(f => f.map(c => (c || '').trim()))
      .filter(f => f[1] || f[2]); // al menos Local o Visitante cargado
    if (nuevas.length === 0) { setGuardando(false); setMensaje('❌ Cargá al menos un partido.'); return; }
    try {
      // Trae el Fixture más fresco posible antes de sumar — así no se
      // pisan asignaciones que otro coordinador haya hecho mientras tanto.
      const { ok, hojas: hojasFrescas } = await obtenerListasAdmin();
      const fixtureActual = ok ? (hojasFrescas.Fixture || []) : (hojas.Fixture || []);
      const filasNuevasCompletas = nuevas.map(([fechaNro, local, visitante]) => [
        fixtureTorneo, fixtureGenero, fechaNro, local, visitante, '', '', '', '', '', '', '',
      ]);
      const combinado = [...fixtureActual, ...filasNuevasCompletas];
      const okGuardar = await guardarListaAdmin('Fixture', combinado);
      setMensaje(okGuardar ? `✅ Se agregaron ${nuevas.length} partido(s) al Fixture.` : '❌ No se pudo guardar. Revisá la conexión.');
      if (okGuardar) {
        setFixtureFilasNuevo([['', '', '']]);
        setHojas(prev => ({ ...prev, Fixture: combinado }));
      }
    } catch {
      setMensaje('❌ No se pudo guardar. Revisá la conexión.');
    } finally {
      setGuardando(false);
    }
  };

  const esFixture = hojaActiva === 'Fixture';

  // Punto 5: subir el fixture COMPLETO de una vez desde un Excel, en vez de
  // cargarlo partido por partido a mano. Se espera un archivo con columnas
  // Torneo, Division, Fecha, Local, Visitante (los nombres de columna no
  // distinguen mayúscula/minúscula ni espacios de más). Igual que la carga
  // manual, se SUMA al Fixture existente — nunca lo reemplaza.
  const importarExcel = async (archivo) => {
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

      // Los encabezados del Excel pueden venir con mayúscula/minúscula o
      // espacios distintos ("Torneo", "torneo ", "TORNEO") — se normaliza
      // antes de buscar cada columna.
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

      const { ok, hojas: hojasFrescas } = await obtenerListasAdmin();
      const fixtureActual = ok ? (hojasFrescas.Fixture || []) : (hojas.Fixture || []);
      const combinado = [...fixtureActual, ...filasCompletas];
      const okGuardar = await guardarListaAdmin('Fixture', combinado);
      setMensajeImport(okGuardar
        ? `✅ Se importaron ${filasCompletas.length} partido(s) del Excel.`
        : '❌ No se pudo guardar. Revisá la conexión.');
      if (okGuardar) setHojas(prev => ({ ...prev, Fixture: combinado }));
    } catch (err) {
      setMensajeImport(`❌ No se pudo leer el archivo. Revisá que sea un Excel válido.\n\nDetalle técnico: ${err?.message || err}`);
    } finally {
      setImportando(false);
      if (inputArchivoRef.current) inputArchivoRef.current.value = '';
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ background: C.azul, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: 8, fontSize: 18, cursor: 'pointer' }}>←</button>
        <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, textTransform: 'uppercase' }}>Editar Listas</div>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <select
          value={hojaActiva} onChange={e => cambiarHoja(e.target.value)}
          style={{ height: 44, border: `1.5px solid ${C.azul}`, borderRadius: 8, padding: '0 10px', fontSize: 14, fontWeight: 700, color: C.azul, background: C.celeste }}
        >
          {HOJAS_EDITABLES.map(h => <option key={h.clave} value={h.clave}>{h.titulo}</option>)}
          <option value="Fixture">Fixture</option>
        </select>

        {cargando && <div style={{ textAlign: 'center', color: '#999', fontSize: 14, padding: '20px 0' }}>Cargando listas...</div>}
        {!cargando && error && (
          <div style={{ textAlign: 'center', color: C.rojo, fontSize: 13 }}>
            No se pudo traer las listas.
            <div><button onClick={cargar} style={{ marginTop: 8, background: C.azul, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 700, cursor: 'pointer' }}>Reintentar</button></div>
          </div>
        )}

        {!cargando && !error && esFixture && (
          <>
            <button onClick={() => setVerCargados(v => !v)} style={{
              background: '#fff', color: C.azul, border: `1.5px solid ${C.azul}`, borderRadius: 8, padding: '10px', fontWeight: 700, cursor: 'pointer',
            }}>
              {verCargados ? '▲ Ocultar' : '▼ Ver'} partidos ya cargados ({(hojas.Fixture || []).length})
            </button>

            {verCargados && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 260, overflowY: 'auto', border: `1px solid ${C.celeste}`, borderRadius: 8, padding: 8 }}>
                {(hojas.Fixture || []).length === 0 && <div style={{ fontSize: 12, color: '#999', textAlign: 'center' }}>Todavía no hay ningún partido cargado.</div>}
                {(hojas.Fixture || []).map((f, i) => (
                  <div key={i} style={{ fontSize: 12, color: C.azul, padding: '4px 6px', borderBottom: i < hojas.Fixture.length - 1 ? `1px solid ${C.celeste}` : 'none' }}>
                    <b>{f[3]} vs {f[4]}</b> — {f[0]} ({f[1] === 'F' ? 'Fem' : 'Masc'}) — Fecha {f[2] || '—'}
                  </div>
                ))}
              </div>
            )}

            <div style={{ fontSize: 12, color: '#666' }}>
              Elegí el Torneo y la División una sola vez, y cargá varios partidos seguidos con solo Fecha, Local y Visitante — se suman al Fixture, sin borrar lo que ya había. El resto (Estadio, Oficial, etc.) se completa después desde "Asignar Partidos".
            </div>
            <select
              value={fixtureTorneo} onChange={e => setFixtureTorneo(e.target.value)}
              style={{ height: 40, border: `1.5px solid ${C.azul}`, borderRadius: 8, padding: '0 10px', fontSize: 13, fontWeight: 600, color: C.azul, background: '#fff' }}
            >
              <option value="">Seleccioná el Torneo</option>
              {(hojas.Torneos || []).map(f => <option key={f[0]} value={f[0]}>{f[0]}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 6 }}>
              {['M', 'F'].map(g => (
                <button key={g} onClick={() => setFixtureGenero(g)} style={{
                  flex: 1, height: 40, borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  background: fixtureGenero === g ? C.azul : '#fff', color: fixtureGenero === g ? '#fff' : C.azul, border: `1.5px solid ${C.azul}`,
                }}>{g === 'M' ? 'Masculino' : 'Femenino'}</button>
              ))}
            </div>

            {fixtureTorneo && fixtureGenero && (
              <>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['Fecha N°', 'Local', 'Visitante'].map((t, j) => (
                    <div key={j} style={{ flex: j === 0 ? 0.6 : 1, fontSize: 11, fontWeight: 700, color: C.azul, textTransform: 'uppercase' }}>{t}</div>
                  ))}
                  <div style={{ width: 32, flexShrink: 0 }} />
                </div>
                <div style={{ fontSize: 11, color: '#999' }}>
                  💡 Podés copiar 3 columnas de Excel (Fecha N°, Local, Visitante) y pegarlas directo acá — se cargan todas las filas de una.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {fixtureFilas.map((fila, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="text" inputMode="numeric" value={fila[0]} onChange={e => cambiarCeldaFixture(i, 0, e.target.value)}
                        onPaste={e => pegarEnFixture(i, 0, e)} placeholder="N°"
                        style={{ flex: 0.6, minWidth: 0, height: 38, borderRadius: 6, padding: '0 8px', fontSize: 13, border: `1.5px solid ${C.azul}`, color: C.azul }}
                      />
                      <input
                        value={fila[1]} onChange={e => cambiarCeldaFixture(i, 1, e.target.value)}
                        onPaste={e => pegarEnFixture(i, 1, e)} placeholder="Local"
                        style={{ flex: 1, minWidth: 0, height: 38, borderRadius: 6, padding: '0 8px', fontSize: 13, textTransform: 'uppercase', border: `1.5px solid ${C.azul}`, color: C.azul }}
                      />
                      <input
                        value={fila[2]} onChange={e => cambiarCeldaFixture(i, 2, e.target.value)}
                        onPaste={e => pegarEnFixture(i, 2, e)} placeholder="Visitante"
                        style={{ flex: 1, minWidth: 0, height: 38, borderRadius: 6, padding: '0 8px', fontSize: 13, textTransform: 'uppercase', border: `1.5px solid ${C.azul}`, color: C.azul }}
                      />
                      <button onClick={() => borrarFilaFixture(i)} style={{ background: C.rojo, color: '#fff', border: 'none', borderRadius: 6, width: 32, height: 32, flexShrink: 0, fontWeight: 700, cursor: 'pointer' }}>✕</button>
                    </div>
                  ))}
                </div>
                <button onClick={agregarFilaFixture} style={{ background: C.celeste, color: C.azul, border: `1.5px solid ${C.azul}`, borderRadius: 8, padding: '10px', fontWeight: 700, cursor: 'pointer' }}>
                  + Agregar
                </button>
                <button onClick={guardarFixture} disabled={guardando} style={{
                  background: guardando ? '#8fa3c9' : C.verde, color: '#fff', border: 'none', borderRadius: 8,
                  padding: '12px', fontWeight: 700, fontSize: 15, textTransform: 'uppercase', cursor: guardando ? 'wait' : 'pointer',
                }}>
                  {guardando ? 'Guardando...' : 'Sumar al Fixture'}
                </button>
              </>
            )}

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
          </>
        )}

        {!cargando && !error && !esFixture && (
          <>
            {config.columnas.length > 1 && (
              <div style={{ display: 'flex', gap: 6 }}>
                {config.columnas.map((titulo, j) => (
                  <div key={j} style={{
                    flex: config.anchos?.[j] ?? 1, minWidth: 0, fontSize: 11, fontWeight: 700, color: C.azul,
                    textTransform: 'uppercase', letterSpacing: .3, padding: '0 2px',
                    whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.2,
                  }}>{titulo}</div>
                ))}
                <div style={{ width: 32, flexShrink: 0 }} />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filasEdit.map((fila, i) => {
                const protegida = esFilaProtegida(hojaActiva, fila) && !esMiPropioPerfil;
                return (
                  <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {config.columnas.map((_, j) => (
                      <input
                        key={j} value={fila[j] || ''} onChange={e => cambiarCelda(i, j, e.target.value)}
                        placeholder={hojaActiva === 'Oficiales' && j >= 2 ? '' : config.columnas[j]} readOnly={protegida}
                        style={{
                          flex: config.anchos?.[j] ?? 1, minWidth: 0, height: 38, borderRadius: 6, padding: '0 8px', fontSize: 13,
                          textTransform: 'uppercase', border: `1.5px solid ${C.azul}`,
                          color: protegida ? '#8fa3c9' : C.azul, background: protegida ? '#f2f4f8' : '#fff',
                        }}
                      />
                    ))}
                    {protegida ? (
                      <span title="Solo esta persona puede editar su propio perfil" style={{ width: 32, height: 32, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🔒</span>
                    ) : (
                      <button onClick={() => borrarFila(i)} style={{ background: C.rojo, color: '#fff', border: 'none', borderRadius: 6, width: 32, height: 32, flexShrink: 0, fontWeight: 700, cursor: 'pointer' }}>✕</button>
                    )}
                  </div>
                );
              })}
            </div>

            <button onClick={agregarFila} style={{ background: C.celeste, color: C.azul, border: `1.5px solid ${C.azul}`, borderRadius: 8, padding: '10px', fontWeight: 700, cursor: 'pointer' }}>
              + Agregar
            </button>

            <button onClick={guardar} disabled={guardando} style={{
              background: guardando ? '#8fa3c9' : C.verde, color: '#fff', border: 'none', borderRadius: 8,
              padding: '12px', fontWeight: 700, fontSize: 15, textTransform: 'uppercase', cursor: guardando ? 'wait' : 'pointer',
            }}>
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>

            {mensaje && <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 700 }}>{mensaje}</div>}
          </>
        )}
      </div>
    </div>
  );
}
