import { useState, useEffect, useMemo } from 'react';
import { obtenerTodosLosPartidos } from '../useAutoSave';

const C = { azul: '#0d1f4e', celeste: '#c6dbf5', verde: '#1a7a3a', rojo: '#e03030' };

const FILTROS_VACIOS = { torneo: '', fecha_nro: '', oficial: '', dia: '', club: '' };

// Un partido "toca" un club si aparece como Local o como Visitante — así el
// filtro de Club encuentra el partido sin importar el rol.
function coincideClub(p, club) {
  if (!club) return true;
  const c = club.trim().toUpperCase();
  return (p['Local'] || '').toUpperCase().includes(c) || (p['Visitante'] || '').toUpperCase().includes(c);
}

// La planilla compartida devuelve Fecha/Hora como Date de Google Sheets
// serializado a ISO (ej: "2026-07-11T03:00:00.000Z"). Estas funciones lo
// convierten al formato legible DD/MM/AAAA y HH:MM, usando horas UTC porque
// así fueron serializadas (evita corrimientos de huso horario).
function esISO(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v);
}
function formatearDia(v) {
  if (!v) return '';
  if (!esISO(v)) return v;
  const d = new Date(v);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}
function formatearHora(v) {
  if (!v) return '';
  if (!esISO(v)) return v;
  const d = new Date(v);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

// Clave normalizada del día (ignora cualquier hora que venga pegada en la
// misma celda), para que el filtro y el desplegable agrupen por fecha
// calendario y no por el instante exacto.
function claveDia(v) {
  if (!esISO(v)) return v || '';
  const d = new Date(v);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export default function PantallaAdmin({ onBack, onEditarListas }) {
  const [partidos, setPartidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);

  const cargar = async () => {
    setCargando(true);
    const { ok, partidos } = await obtenerTodosLosPartidos();
    setError(!ok);
    setPartidos(partidos);
    setCargando(false);
  };

  useEffect(() => { cargar(); }, []);

  const opciones = useMemo(() => {
    // Un valor representativo por día calendario, aunque haya partidos con
    // horas distintas pegadas en la misma celda de "Día".
    const diasVistos = new Map();
    partidos.forEach(p => {
      const v = p['Día'];
      if (!v) return;
      const clave = claveDia(v);
      if (!diasVistos.has(clave)) diasVistos.set(clave, v);
    });
    return {
      torneos: [...new Set(partidos.map(p => p['Torneo']).filter(Boolean))].sort(),
      fechas: [...new Set(partidos.map(p => p['Fecha N°']).filter(Boolean))].sort(),
      oficiales: [...new Set(partidos.map(p => p['Oficial AFA']).filter(Boolean))].sort(),
      dias: [...diasVistos.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v),
    };
  }, [partidos]);

  const filtrados = useMemo(() => partidos.filter(p =>
    (!filtros.torneo || p['Torneo'] === filtros.torneo) &&
    (!filtros.fecha_nro || String(p['Fecha N°']) === filtros.fecha_nro) &&
    (!filtros.oficial || p['Oficial AFA'] === filtros.oficial) &&
    (!filtros.dia || claveDia(p['Día']) === claveDia(filtros.dia)) &&
    coincideClub(p, filtros.club)
  ), [partidos, filtros]);

  const setFiltro = (campo) => (e) => setFiltros(f => ({ ...f, [campo]: e.target.value }));

  const selectStyle = {
    height: 40, border: `1.5px solid ${C.azul}`, borderRadius: 8, padding: '0 10px',
    fontSize: 13, fontWeight: 600, color: C.azul, background: C.celeste, outline: 'none',
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ background: C.azul, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: 8, fontSize: 18, cursor: 'pointer' }}>←</button>
        <div>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, textTransform: 'uppercase' }}>Panel Administrador</div>
          <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 11 }}>{filtrados.length} de {partidos.length} partido{partidos.length !== 1 ? 's' : ''}</div>
        </div>
        <button onClick={onEditarListas} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', textTransform: 'uppercase' }}>
          🛠️ Editar Listas
        </button>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <select style={selectStyle} value={filtros.torneo} onChange={setFiltro('torneo')}>
            <option value="">Todos los Torneos</option>
            {opciones.torneos.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select style={selectStyle} value={filtros.fecha_nro} onChange={setFiltro('fecha_nro')}>
            <option value="">Toda Fecha N°</option>
            {opciones.fechas.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select style={selectStyle} value={filtros.oficial} onChange={setFiltro('oficial')}>
            <option value="">Todo Oficial AFA</option>
            {opciones.oficiales.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select style={selectStyle} value={filtros.dia} onChange={setFiltro('dia')}>
            <option value="">Toda Fecha</option>
            {opciones.dias.map(v => <option key={v} value={v}>{formatearDia(v)}</option>)}
          </select>
        </div>
        <input
          type="text" placeholder="Filtrar por Club (Local o Visitante)"
          value={filtros.club} onChange={setFiltro('club')}
          style={{ ...selectStyle, gridColumn: '1 / -1', textTransform: 'uppercase' }}
        />
        {(filtros.torneo || filtros.fecha_nro || filtros.oficial || filtros.dia || filtros.club) && (
          <button onClick={() => setFiltros(FILTROS_VACIOS)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: C.rojo, fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
            ✕ Limpiar filtros
          </button>
        )}

        {cargando && <div style={{ textAlign: 'center', color: '#999', fontSize: 14, padding: '40px 0' }}>Cargando partidos...</div>}
        {!cargando && error && (
          <div style={{ textAlign: 'center', color: C.rojo, fontSize: 13, padding: '20px 0' }}>
            No se pudo traer la planilla compartida. Revisá la conexión.
            <div><button onClick={cargar} style={{ marginTop: 8, background: C.azul, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 700, cursor: 'pointer' }}>Reintentar</button></div>
          </div>
        )}
        {!cargando && !error && filtrados.length === 0 && (
          <div style={{ textAlign: 'center', color: '#999', fontSize: 14, padding: '40px 0' }}>No hay partidos con estos filtros.</div>
        )}

        {!cargando && filtrados.map((p, i) => (
          <div key={i} style={{ border: `1.5px solid ${C.azul}`, borderRadius: 10, padding: 12, background: C.celeste }}>
            <div style={{ fontSize: 11, color: C.azul, fontWeight: 700, textTransform: 'uppercase' }}>
              {p['Torneo']}
            </div>
            <div style={{ fontSize: 11, color: C.azul, fontWeight: 700, textTransform: 'uppercase' }}>
              {p['Fecha N°'] && `Fecha ${p['Fecha N°']}`}
            </div>
            <div style={{ fontSize: 17, color: C.azul, fontWeight: 700, marginTop: 6, lineHeight: 1.3 }}>
              <div>{p['Local'] || '(sin local)'} {p['Res. Local'] ?? '-'}</div>
              <div>vs {p['Visitante'] || '(sin visitante)'} {p['Res. Visitante'] ?? '-'}</div>
            </div>
            <div style={{ fontSize: 16, color: C.azul, fontWeight: 700, marginTop: 6 }}>
              {formatearDia(p['Día']) || '(sin fecha)'}{p['Hora'] && ` - ${formatearHora(p['Hora'])} hs`}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4, color: C.azul }}>
              Oficial: {p['Oficial AFA'] || '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
