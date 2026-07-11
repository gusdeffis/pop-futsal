const C = { azul: '#0d1f4e', celeste: '#c6dbf5' };

export default function PantallaHistorial({ historial, onBack, onEditar }) {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ background: C.azul, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: 8, fontSize: 18, cursor: 'pointer' }}>←</button>
        <div>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, textTransform: 'uppercase' }}>Historial de Partidos</div>
          <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 11 }}>{historial.length} partido{historial.length !== 1 ? 's' : ''} guardado{historial.length !== 1 ? 's' : ''} · tocá uno para editarlo</div>
        </div>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {historial.length === 0 && (
          <div style={{ textAlign: 'center', color: '#999', fontSize: 14, padding: '40px 0' }}>
            Todavía no hay partidos guardados en el historial.
          </div>
        )}

        {historial.map(h => (
          <div key={h.id} onClick={() => onEditar(h)} style={{ border: `1.5px solid ${C.azul}`, borderRadius: 10, padding: 12, background: C.celeste, cursor: 'pointer' }}>
            <div style={{ fontSize: 11, color: C.azul, fontWeight: 700, textTransform: 'uppercase' }}>
              {h.torneo} {h.fecha_nro && `· Fecha ${h.fecha_nro}`} {h.cat && `· Cat. ${h.cat}`}
            </div>
            <div style={{ fontSize: 15, color: C.azul, fontWeight: 700, marginTop: 4 }}>
              {h.local} {h.res_local ?? '-'} — {h.res_visitante ?? '-'} {h.visitante}
            </div>
            <div style={{ fontSize: 11, color: '#5a6b8c', marginTop: 2 }}>
              {h.dia} · guardado {new Date(h.timestamp).toLocaleString('es-AR')}
            </div>
            <div style={{ fontSize: 11, color: C.azul, fontWeight: 700, marginTop: 6 }}>✏️ Tocar para editar</div>
          </div>
        ))}
      </div>
    </div>
  );
}
