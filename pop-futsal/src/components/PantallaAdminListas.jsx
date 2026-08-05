import { useState, useEffect } from 'react';
import { HOJAS_EDITABLES, obtenerListasAdmin, guardarListaAdmin } from '../useListasAdmin';

const C = { azul: '#0d1f4e', celeste: '#c6dbf5', verde: '#1a7a3a', rojo: '#e03030' };

export default function PantallaAdminListas({ onBack }) {
  const [hojas, setHojas] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [hojaActiva, setHojaActiva] = useState(HOJAS_EDITABLES[0].clave);
  const [filasEdit, setFilasEdit] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const cargar = async () => {
    setCargando(true);
    const { ok, hojas: nuevasHojas } = await obtenerListasAdmin();
    setError(!ok);
    setHojas(nuevasHojas);
    setFilasEdit((nuevasHojas[hojaActiva] || []).map(fila => [...fila]));
    setCargando(false);
  };

  useEffect(() => { cargar(); }, []);

  // Solo al cambiar de hoja (por el select) recargamos el formulario desde
  // lo último traído del servidor — no en cada guardado exitoso, para no
  // pisar el mensaje de "Guardado" que se acaba de mostrar.
  const cambiarHoja = (clave) => {
    setHojaActiva(clave);
    setFilasEdit((hojas[clave] || []).map(fila => [...fila]));
    setMensaje('');
  };

  const config = HOJAS_EDITABLES.find(h => h.clave === hojaActiva);

  const cambiarCelda = (fila, col, valor) => {
    setFilasEdit(prev => prev.map((f, i) => i === fila ? f.map((c, j) => j === col ? valor : c) : f));
  };

  const agregarFila = () => setFilasEdit(prev => [...prev, config.columnas.map(() => '')]);
  const borrarFila = (i) => setFilasEdit(prev => prev.filter((_, idx) => idx !== i));

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
              {filasEdit.map((fila, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {config.columnas.map((_, j) => (
                    <input
                      key={j} value={fila[j] || ''} onChange={e => cambiarCelda(i, j, e.target.value)}
                      placeholder={config.columnas[j]}
                      style={{ flex: config.anchos?.[j] ?? 1, minWidth: 0, height: 38, border: `1.5px solid ${C.azul}`, borderRadius: 6, padding: '0 8px', fontSize: 13, color: C.azul, textTransform: 'uppercase' }}
                    />
                  ))}
                  <button onClick={() => borrarFila(i)} style={{ background: C.rojo, color: '#fff', border: 'none', borderRadius: 6, width: 32, height: 32, flexShrink: 0, fontWeight: 700, cursor: 'pointer' }}>✕</button>
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
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>

            {mensaje && <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 700 }}>{mensaje}</div>}
          </>
        )}
      </div>
    </div>
  );
}
