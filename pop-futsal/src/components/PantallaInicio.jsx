import { useState, useEffect } from 'react';
import { APP_VERSION } from '../data';

const C = { azul: '#0d1f4e', celeste: '#c6dbf5', rojo: '#e03030' };

const DIAS_SEMANA = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];

// A partir de "DD/MM/AAAA" calcula el día de la semana en mayúscula
// (MIÉRCOLES, JUEVES, etc.) para mostrarlo antes de la fecha.
function diaDeLaSemana(ddmmaaaa) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(ddmmaaaa || '');
  if (!m) return '';
  const fecha = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return DIAS_SEMANA[fecha.getDay()];
}

function validarPin(pines, nombre, pin) {
  const entrada = Object.entries(pines || {}).find(
    ([n]) => n.toUpperCase() === (nombre || '').toUpperCase()
  );
  return entrada && entrada[1] === pin;
}

export default function PantallaInicio({ guardado, onNuevo, onContinuar, onHistorial, oficiales, pines, oficialLogueado, onLogin, onLogout, esAdmin, onAdmin, veInformes, onInformes, veAsignar, onAsignar, pendientes, onCargarPendiente, cargandoPendientes, onActualizarPendientes }) {
  const [nombre, setNombre] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  // Al desloguearse (oficialLogueado pasa a vacío), borrar nombre/PIN del
  // formulario — si no, quedaban visibles en pantalla para el próximo que
  // agarre el celular, un problema de seguridad real.
  useEffect(() => {
    if (!oficialLogueado) {
      setNombre('');
      setPin('');
      setError('');
    }
  }, [oficialLogueado]);

  const handleIngresar = () => {
    if (!nombre) { setError('Elegí tu nombre.'); return; }
    if (pin.length !== 4) { setError('El PIN tiene 4 dígitos.'); return; }
    if (!validarPin(pines, nombre, pin)) { setError('Nombre o PIN incorrecto.'); return; }
    setError('');
    onLogin(nombre);
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: 'system-ui,sans-serif', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: C.azul, padding: '20px 24px 20px', textAlign: 'center' }}>
        <div style={{ color: '#fff', fontSize: 22, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>FUTSAL AFA</div>
        <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 12, textTransform: 'uppercase', letterSpacing: .5, marginTop: 4 }}>
          Planilla Oficial de Partido
        </div>
      </div>

      <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, justifyContent: 'center', alignItems: 'stretch', maxWidth: 360, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

        {!oficialLogueado ? (
          <>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.azul, textTransform: 'uppercase', letterSpacing: .5, textAlign: 'center', marginBottom: -4 }}>
              Identificate para ingresar
            </div>
            <select value={nombre} onChange={e => { setNombre(e.target.value); setError(''); }} style={{
              height: 48, border: `1.5px solid ${C.azul}`, borderRadius: 8, padding: '0 12px',
              fontSize: 15, fontWeight: 600, color: C.azul, background: C.celeste, outline: 'none',
            }}>
              <option value="">Seleccioná tu nombre</option>
              {(oficiales || []).map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <input
              type="tel" inputMode="numeric" maxLength={4} value={pin}
              onChange={e => { setPin(e.target.value.replace(/[^0-9]/g, '')); setError(''); }}
              placeholder="PIN (4 dígitos)"
              style={{
                height: 48, border: `1.5px solid ${C.azul}`, borderRadius: 8, padding: '0 12px',
                fontSize: 18, fontWeight: 700, color: C.azul, background: C.celeste, outline: 'none',
                letterSpacing: 6, textAlign: 'center',
              }}
            />
            {error && <div style={{ color: C.rojo, fontSize: 12, fontWeight: 700, textAlign: 'center' }}>{error}</div>}
            <button onClick={handleIngresar} style={{
              minHeight: 52, background: C.azul, color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: .3,
            }}>
              Ingresar
            </button>
            <div style={{ textAlign: 'center', color: '#000', fontSize: 13, fontWeight: 700 }}>{APP_VERSION}</div>
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 14, color: '#5a6b8c' }}>Conectado como</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: C.azul }}>{oficialLogueado}</div>
            </div>

            {cargandoPendientes && (
              <div style={{ textAlign: 'center', color: '#999', fontSize: 12, fontWeight: 600 }}>
                🔄 Buscando partidos asignados...
              </div>
            )}

            {!cargandoPendientes && pendientes?.length > 0 && (
              <div style={{ background: '#fdf3d8', border: '1.5px solid #c99a10', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#8a6a10', textTransform: 'uppercase' }}>
                    📋 Tenés {pendientes.length} partido{pendientes.length > 1 ? 's' : ''} asignado{pendientes.length > 1 ? 's' : ''}
                  </div>
                  <button onClick={onActualizarPendientes} title="Actualizar" style={{ background: 'none', border: 'none', color: '#8a6a10', fontSize: 16, cursor: 'pointer', padding: 2 }}>🔄</button>
                </div>
                {pendientes.map((p, i) => (
                  <div key={i} onClick={() => onCargarPendiente(p)} style={{
                    background: '#fff', border: '1px solid #e8d090', borderRadius: 8, padding: '8px 10px', cursor: 'pointer',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.azul }}>{p.local} vs {p.visitante}</div>
                    {(p.dia || p.hora) && (
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#666' }}>
                        {p.dia && `${diaDeLaSemana(p.dia)} ${p.dia}`}{p.hora ? `, ${p.hora} hs` : ''}
                      </div>
                    )}
                    {p.estadio && <div style={{ fontSize: 13, fontWeight: 700, color: '#666' }}>{p.estadio}</div>}
                  </div>
                ))}
              </div>
            )}

            {!cargandoPendientes && !(pendientes?.length > 0) && (
              <button onClick={onActualizarPendientes} style={{
                width: '100%', minHeight: 40, background: '#fff', color: C.azul, border: `1.5px solid ${C.celeste}`, borderRadius: 8,
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>
                🔄 Revisar partidos asignados
              </button>
            )}

            <button onClick={onNuevo} style={{
              minHeight: 64, background: C.azul, color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 16, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: .3,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              📋 Nuevo Partido
            </button>

            <button onClick={onContinuar} disabled={!guardado} style={{
              minHeight: 64, background: guardado ? C.celeste : '#eee', color: guardado ? C.azul : '#999',
              border: `1.5px solid ${guardado ? C.azul : '#ddd'}`, borderRadius: 10,
              fontSize: 16, fontWeight: 700, cursor: guardado ? 'pointer' : 'not-allowed',
              textTransform: 'uppercase', letterSpacing: .3,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <span style={{ lineHeight: 1.2 }}>▶ Continuar Partido</span>
              {guardado?.datos?.torneo && (
                <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'none', textAlign: 'center', lineHeight: 1.2 }}>
                  {guardado.datos.local || '—'} vs {guardado.datos.visitante || '—'}
                </span>
              )}
            </button>

            <button onClick={onHistorial} style={{
              minHeight: 64, background: '#c8ecd4', color: '#1a7a3a', border: `1.5px solid #1a7a3a`, borderRadius: 10,
              fontSize: 16, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: .3,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              🗂️ Historial de Partidos
            </button>

            {veAsignar && (
              <button onClick={onAsignar} style={{
                minHeight: 64, background: '#fdf3d8', color: '#8a6a10', border: `1.5px solid #8a6a10`, borderRadius: 10,
                fontSize: 16, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: .3,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                🗓️ Asignar Partidos
              </button>
            )}

            {veInformes && (
              <button onClick={onInformes} style={{
                minHeight: 64, background: '#e0d7f5', color: '#4a2f8a', border: `1.5px solid #4a2f8a`, borderRadius: 10,
                fontSize: 16, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: .3,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                📊 Informes
              </button>
            )}

            {esAdmin && (
              <button onClick={onAdmin} style={{
                minHeight: 64, background: '#fadfba', color: '#c96a1c', border: `1.5px solid #c96a1c`, borderRadius: 10,
                fontSize: 16, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: .3,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                🛠️ Panel Administrador
              </button>
            )}

            <div onClick={onLogout} style={{ textAlign: 'center', color: C.rojo, fontWeight: 800, fontSize: 19, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: .3, marginTop: 4 }}>
              Salir
            </div>
            <div style={{ textAlign: 'center', color: '#c9d0dc', fontSize: 9, marginTop: 24, paddingBottom: 6 }}>© Gustavo Deffis</div>
          </>
        )}
      </div>
    </div>
  );
}
