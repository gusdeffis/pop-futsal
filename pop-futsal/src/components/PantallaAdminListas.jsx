import { useState, useEffect, useRef } from 'react';
import { HOJAS_EDITABLES, obtenerListasAdmin, guardarListaAdmin } from '../useListasAdmin';

const C = { azul: '#0d1f4e', celeste: '#c6dbf5', verde: '#1a7a3a', rojo: '#e03030' };

// Perfil protegido: nadie puede editar ni borrar esta fila de la hoja
// Oficiales, salvo la propia persona logueada con ese nombre. Evita que
// alguien le resetee el PIN o le cambie el Perfil al creador de la app.
const NOMBRE_PROTEGIDO = 'GUSTAVO DEFFIS';

function esFilaProtegida(hojaActiva, fila) {
  return hojaActiva === 'Oficiales' && String(fila[0] || '').trim().toUpperCase() === NOMBRE_PROTEGIDO;
}

export default function PantallaAdminListas({ onBack, oficialLogueado, onIrAFixture }) {
  const [hojas, setHojas] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [hojaActiva, setHojaActiva] = useState(HOJAS_EDITABLES[0].clave);
  const [filasEdit, setFilasEdit] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const cargar = async () => {
    setCargando(true);
    const { ok, hojas: nuevasHojas } = await obtenerListasAdmin({ sinFixture: true });
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
    const filas = (hojas[hojaActiva] || []).map(fila => [...fila]);
    // Normaliza el Perfil viejo ("ADMINISTRADOR"/"GESTION" completos) al
    // código corto que usa el desplegable nuevo, así el select arranca
    // mostrando la opción correcta en vez de aparecer vacío. Se reescribe
    // corto recién si se guarda esa fila — hasta entonces la celda real en
    // Sheets sigue como estaba.
    //
    // CORRECCIÓN (bug real): si alguna celda de Oficiales quedó como
    // casillero NATIVO de Google Sheets (no texto), Apps Script la trae
    // como booleano true/false de verdad, no como string — y ".trim()"
    // sobre un booleano explota (undefined function), dejando la promesa
    // de guardar colgada para siempre sin avisar. Por eso TODO lo que viene
    // de la hoja se pasa por String(...) antes de tocarlo, no solo acá.
    if (hojaActiva === 'Oficiales') {
      filas.forEach(fila => {
        for (let j = 0; j < fila.length; j++) fila[j] = String(fila[j] ?? '');
        const p = fila[2].trim().toUpperCase();
        if (p === 'ADMINISTRADOR') fila[2] = 'ADM';
        else if (p === 'GESTION') fila[2] = 'GES';
        else if (p === '') fila[2] = 'OFI';
      });
    }
    setFilasEdit(filas);
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
      .map(f => f.map(c => String(c ?? '').trim()))
      .filter(f => f.some(c => c !== ''));
    const ok = await guardarListaAdmin(hojaActiva, filasLimpias);
    setMensaje(ok ? '✅ Guardado.' : '❌ No se pudo guardar. Revisá la conexión.');
    if (ok) {
      setFilasEdit(filasLimpias);
      setHojas(prev => ({ ...prev, [hojaActiva]: filasLimpias }));
    }
    setGuardando(false);
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ background: C.azul, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: 8, fontSize: 18, cursor: 'pointer' }}>←</button>
        <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, textTransform: 'uppercase' }}>Editar Listas</div>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Fixture ya no se edita acá — antes había una pantalla aparte que
            duplicaba lo que ya existe en Asignar Partidos, con una versión
            distinta y más limitada. Ahora es un solo link a la MISMA vista
            (carga rápida + partidos ya cargados, editables/borrables). */}
        <button onClick={onIrAFixture} style={{
          background: '#fff', color: C.azul, border: `1.5px solid ${C.azul}`, borderRadius: 8, padding: '10px', fontWeight: 700, cursor: 'pointer',
        }}>
          📄 Ir a Fixture (en Asignar Partidos)
        </button>

        <select
          value={hojaActiva} onChange={e => cambiarHoja(e.target.value)}
          style={{ height: 44, border: `1.5px solid ${C.azul}`, borderRadius: 8, padding: '0 10px', fontSize: 14, fontWeight: 700, color: C.azul, background: C.celeste }}
        >
          {HOJAS_EDITABLES.map(h => <option key={h.clave} value={h.clave}>{h.titulo}</option>)}
        </select>

        {cargando && <div style={{ textAlign: 'center', color: '#999', fontSize: 14, padding: '20px 0' }}>Cargando listas...</div>}
        {!cargando && error && (
          <div style={{ textAlign: 'center', color: C.rojo, fontSize: 13 }}>
            No se pudo traer las listas.
            <div><button onClick={cargar} style={{ marginTop: 8, background: C.azul, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 700, cursor: 'pointer' }}>Reintentar</button></div>
          </div>
        )}

        {!cargando && !error && (
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
                const esOficiales = hojaActiva === 'Oficiales';
                return (
                  <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {config.columnas.map((_, j) => {
                      // Punto 1 (rediseño de perfiles): en Oficiales, Perfil
                      // (col 2) es un desplegable ADM/OFI/GES en vez de texto
                      // libre — evita el error de tipeo que antes rompía el
                      // permiso en silencio (ej. escribir "X" donde hacía
                      // falta la palabra exacta "ADMINISTRADOR"). Informes y
                      // Asignar (col 3 y 4) pasan a ser casilleros.
                      if (esOficiales && j === 2) {
                        return (
                          <select
                            key={j} value={String(fila[j] ?? '')} onChange={e => cambiarCelda(i, j, e.target.value)}
                            disabled={protegida}
                            style={{
                              flex: config.anchos?.[j] ?? 1, minWidth: 0, height: 38, borderRadius: 6, padding: '0 4px', fontSize: 12,
                              fontWeight: 700, border: `1.5px solid ${C.azul}`,
                              color: protegida ? '#8fa3c9' : C.azul, background: protegida ? '#f2f4f8' : '#fff',
                            }}
                          >
                            <option value="OFI">OFI</option>
                            <option value="ADM">ADM</option>
                            <option value="GES">GES</option>
                          </select>
                        );
                      }
                      if (esOficiales && (j === 3 || j === 4)) {
                        const tildado = ['SI', 'X', 'TRUE'].includes(String(fila[j] ?? '').trim().toUpperCase());
                        return (
                          <div key={j} onClick={() => !protegida && cambiarCelda(i, j, tildado ? '' : 'SI')} style={{
                            flex: config.anchos?.[j] ?? 1, minWidth: 0, height: 38, borderRadius: 6,
                            border: `1.5px solid ${C.azul}`, cursor: protegida ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: protegida ? '#f2f4f8' : (tildado ? C.azul : '#fff'),
                          }}>
                            {tildado && <span style={{ color: protegida ? '#8fa3c9' : '#fff', fontSize: 16, fontWeight: 700 }}>✓</span>}
                          </div>
                        );
                      }
                      return (
                        <input
                          key={j} value={String(fila[j] ?? '')} onChange={e => cambiarCelda(i, j, e.target.value)}
                          placeholder={config.columnas[j]} readOnly={protegida}
                          style={{
                            flex: config.anchos?.[j] ?? 1, minWidth: 0, height: 38, borderRadius: 6, padding: '0 8px', fontSize: 13,
                            textTransform: 'uppercase', border: `1.5px solid ${C.azul}`,
                            color: protegida ? '#8fa3c9' : C.azul, background: protegida ? '#f2f4f8' : '#fff',
                          }}
                        />
                      );
                    })}
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
