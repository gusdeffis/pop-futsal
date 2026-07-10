const C = { azul: '#0d1f4e', celeste: '#c6dbf5', rojo: '#e03030' };

export default function PantallaInicio({ guardado, onNuevo, onContinuar, onHistorial }) {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: 'system-ui,sans-serif', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: C.azul, padding: '32px 24px 28px', textAlign: 'center' }}>
        <div style={{ color: '#fff', fontSize: 22, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>FUTSAL AFA</div>
        <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 12, textTransform: 'uppercase', letterSpacing: .5, marginTop: 4 }}>
          Planilla Oficial de Partido
        </div>
      </div>

      <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 14, justifyContent: 'center' }}>

        <button onClick={onNuevo} style={{
          height: 64, background: C.azul, color: '#fff', border: 'none', borderRadius: 10,
          fontSize: 16, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: .3,
        }}>
          📋 Nuevo Partido
        </button>

        <button onClick={onContinuar} disabled={!guardado} style={{
          height: 64, background: guardado ? C.celeste : '#eee', color: guardado ? C.azul : '#999',
          border: `1.5px solid ${guardado ? C.azul : '#ddd'}`, borderRadius: 10,
          fontSize: 16, fontWeight: 700, cursor: guardado ? 'pointer' : 'not-allowed',
          textTransform: 'uppercase', letterSpacing: .3, display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          <span>▶ Continuar Partido</span>
          {guardado?.datos?.torneo && (
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'none' }}>
              {guardado.datos.local} vs {guardado.datos.visitante}
            </span>
          )}
        </button>

        <button onClick={onHistorial} style={{
          height: 64, background: '#fff', color: C.azul, border: `1.5px solid ${C.azul}`, borderRadius: 10,
          fontSize: 16, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: .3,
        }}>
          🗂️ Historial de Partidos
        </button>

      </div>
    </div>
  );
}
