import { Header, SeccionHeader, BtnNext, BtnBack } from './UI';
import { golesDe, tarjetasDe, pendientesWsp, textoAvisoPendientes } from '../utils/golesTarjetas';

// Pantalla 4 — GOLES: goles y tarjetas del partido, separados por 1er y
// 2do tiempo, local a la izquierda y visitante a la derecha. Los goles
// completan solos el resultado del Acta Final (que sigue siendo editable
// a mano). Un solo botón de WhatsApp abajo manda todo lo que todavía no
// se avisó; lo enviado queda pintado. Si se corrige algo ya enviado,
// vuelve a quedar pendiente para mandar la corrección.

const AZUL = '#0d1f4e', CELESTE = '#c6dbf5', VERDE = '#1a9e4a', ENVIADO = '#4aa3e0';
const AMARILLA = '#fff1a6', AMARILLA_BORDE = '#d9b800', ROJA = '#d32626', ROJA_BORDE = '#8f1414';
const CLAVE_WSP = 'pop_wsp_destino'; // último número usado, para no tipearlo en cada partido

let seq = 0;
const nuevoId = () => `${Date.now().toString(36)}${(seq++).toString(36)}`;
const soloDigitos = (v) => String(v).replace(/\D/g, '').slice(0, 3);

const inp = {
  height: 38, border: `1.5px solid ${AZUL}`, borderRadius: 7, background: CELESTE, color: AZUL,
  fontSize: 16, fontWeight: 700, textAlign: 'center', padding: 0, width: '100%', boxSizing: 'border-box', minWidth: 0, outline: 'none',
};
const inpEnviado = { ...inp, background: ENVIADO, borderColor: ENVIADO, color: '#fff' };
const encabezadoCol = { fontSize: 9, fontWeight: 700, color: '#5a6b8c', textTransform: 'uppercase', textAlign: 'center' };
const subtitulo = { fontSize: 11, fontWeight: 700, color: AZUL, letterSpacing: .5, textTransform: 'uppercase' };

const GRID_GOL = '1fr 1fr 24px';
const GRID_TARJ = '8px 1fr 46px 1fr 24px';

function IconWsp({ size = 18, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.8 2.3.9 2.5c.1.2 1.6 2.5 4 3.5 1.5.6 2.1.7 2.8.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.5-.2z" />
    </svg>
  );
}

function BtnBorrar({ onClick }) {
  return (
    <button onClick={onClick} aria-label="Borrar" style={{
      height: 38, width: 24, border: 'none', background: 'none', color: ROJA, fontSize: 24, fontWeight: 700,
      lineHeight: 1, cursor: 'pointer', padding: 0,
    }}>×</button>
  );
}

export default function PantallaGol({ datos, setDatos, onNext, onBack, onIrA }) {
  const goles = golesDe(datos);
  const tarjetas = tarjetasDe(datos);

  const leerWspGuardado = () => { try { return localStorage.getItem(CLAVE_WSP) || ''; } catch { return ''; } };
  const wspDestino = datos.wsp_destino || leerWspGuardado();

  // Cada cambio en los goles recalcula el resultado del Acta Final. Si
  // después alguien lo corrige a mano allá, queda lo que escribió hasta
  // el próximo cambio de goles.
  const guardarGoles = (lista) => setDatos(d => ({
    ...d, goles: lista,
    res_local: String(lista.filter(g => g.lado === 'L').length),
    res_visitante: String(lista.filter(g => g.lado === 'V').length),
  }));
  const guardarTarjetas = (lista) => setDatos(d => ({ ...d, tarjetas: lista }));
  // Editar algo ya enviado lo vuelve a dejar pendiente (wsp: false).
  const cambiarGol = (id, cambios) => guardarGoles(goles.map(g => g.id === id ? { ...g, ...cambios, wsp: false } : g));
  const cambiarTarjeta = (id, cambios) => guardarTarjetas(tarjetas.map(t => t.id === id ? { ...t, ...cambios, wsp: false } : t));

  const setWsp = (v) => {
    setDatos(d => ({ ...d, wsp_destino: v }));
    try { localStorage.setItem(CLAVE_WSP, v); } catch { /* sin almacenamiento: no pasa nada */ }
  };

  const pend = pendientesWsp(datos);
  const cantPendientes = pend.goles.length + pend.tarjetas.length;

  const enviarPendientes = () => {
    const msj = textoAvisoPendientes(datos);
    if (!msj) return;
    const tel = (wspDestino || '').replace(/\D/g, '');
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msj)}`);
    setDatos(d => ({
      ...d,
      goles: golesDe(d).map(g => ({ ...g, wsp: true })),
      tarjetas: tarjetasDe(d).map(t => ({ ...t, wsp: true })),
    }));
  };

  const nL = goles.filter(g => g.lado === 'L').length;
  const nV = goles.filter(g => g.lado === 'V').length;
  const nombre = (lado) => (lado === 'L' ? datos.local : datos.visitante) || (lado === 'L' ? 'LOCAL' : 'VISITANTE');
  const tiempoDe = (x) => (Number(x.tiempo) === 2 ? 2 : 1);

  const columnaGoles = (lado, tiempo) => {
    const lista = goles.filter(g => g.lado === lado && tiempoDe(g) === tiempo);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        <button onClick={() => guardarGoles([...goles, { id: nuevoId(), lado, tiempo, min: '', num: '', wsp: false }])} style={{
          height: 42, borderRadius: 8, border: `2px solid ${AZUL}`, background: '#fff', color: AZUL,
          fontWeight: 800, fontSize: 14, cursor: 'pointer',
        }}>+ GOL</button>
        {lista.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: GRID_GOL, gap: 5 }}>
            <div style={encabezadoCol}>Min.</div><div style={encabezadoCol}>Nº</div><div />
          </div>
        )}
        {lista.map(g => {
          const st = g.wsp ? inpEnviado : inp;
          return (
            <div key={g.id} style={{ display: 'grid', gridTemplateColumns: GRID_GOL, gap: 5, alignItems: 'center' }}>
              <input aria-label="Minuto" inputMode="numeric" value={g.min} onChange={e => cambiarGol(g.id, { min: soloDigitos(e.target.value) })} style={st} />
              <input aria-label="Número de jugador" inputMode="numeric" value={g.num} onChange={e => cambiarGol(g.id, { num: soloDigitos(e.target.value) })} style={st} />
              <BtnBorrar onClick={() => guardarGoles(goles.filter(x => x.id !== g.id))} />
            </div>
          );
        })}
      </div>
    );
  };

  const columnaTarjetas = (lado, tiempo) => {
    const lista = tarjetas.filter(t => t.lado === lado && tiempoDe(t) === tiempo);
    const agregar = (color) => guardarTarjetas([...tarjetas, { id: nuevoId(), lado, tiempo, color, quien: 'JUG', min: '', num: '', wsp: false }]);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <button onClick={() => agregar('A')} style={{ height: 38, borderRadius: 8, border: `2px solid ${AMARILLA_BORDE}`, background: AMARILLA, color: '#5a4a00', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>+ AM.</button>
          <button onClick={() => agregar('R')} style={{ height: 38, borderRadius: 8, border: `2px solid ${ROJA_BORDE}`, background: ROJA, color: '#fff', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>+ ROJA</button>
        </div>
        {lista.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: GRID_TARJ, gap: 4 }}>
            <div /><div style={encabezadoCol}>Min.</div><div style={encabezadoCol}>Quién</div><div style={encabezadoCol}>Nº</div><div />
          </div>
        )}
        {lista.map(t => {
          const st = t.wsp ? inpEnviado : inp;
          return (
            <div key={t.id} style={{ display: 'grid', gridTemplateColumns: GRID_TARJ, gap: 4, alignItems: 'center' }}>
              <div title={t.color === 'R' ? 'Roja' : 'Amarilla'} style={{ width: 8, height: 30, borderRadius: 2, boxSizing: 'border-box', background: t.color === 'R' ? ROJA : AMARILLA, border: `1px solid ${t.color === 'R' ? ROJA_BORDE : AMARILLA_BORDE}` }} />
              <input aria-label="Minuto" inputMode="numeric" value={t.min} onChange={e => cambiarTarjeta(t.id, { min: soloDigitos(e.target.value) })} style={st} />
              <select aria-label="Quién" value={t.quien} onChange={e => cambiarTarjeta(t.id, { quien: e.target.value })}
                style={{ ...st, fontSize: 12, padding: '0 2px', textAlign: 'center', appearance: 'none' }}>
                <option value="JUG">JUG</option><option value="DT">DT</option><option value="AUX">AUX</option>
              </select>
              {t.quien === 'JUG'
                ? <input aria-label="Número de jugador" inputMode="numeric" value={t.num} onChange={e => cambiarTarjeta(t.id, { num: soloDigitos(e.target.value) })} style={st} />
                : <div style={{ ...inp, background: '#eef1f7', border: '1.5px solid #dde1ec', color: '#999', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>—</div>}
              <BtnBorrar onClick={() => guardarTarjetas(tarjetas.filter(x => x.id !== t.id))} />
            </div>
          );
        })}
      </div>
    );
  };

  const separador = { borderLeft: '1px solid #dde1ec', paddingLeft: 10, minWidth: 0 };

  const bloqueTiempo = (tiempo) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ background: '#e8edf8', color: AZUL, fontSize: 12, fontWeight: 800, letterSpacing: .5, textTransform: 'uppercase', padding: '6px 10px', borderRadius: 6, borderLeft: `4px solid ${AZUL}` }}>
        {tiempo === 1 ? '1er Tiempo' : '2do Tiempo'}
      </div>
      <div style={subtitulo}>⚽ Goles</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {columnaGoles('L', tiempo)}
        <div style={separador}>{columnaGoles('V', tiempo)}</div>
      </div>
      <div style={subtitulo}>Tarjetas</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {columnaTarjetas('L', tiempo)}
        <div style={separador}>{columnaTarjetas('V', tiempo)}</div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <Header paso={4} onIrA={onIrA} />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SeccionHeader>4. Goles</SeccionHeader>

        {/* Marcador: local a la izquierda, visitante a la derecha (igual que las columnas) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8, background: AZUL, color: '#fff', borderRadius: 8, padding: '8px 10px' }}>
          <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>{nombre('L')}</div>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 2 }}>{nL} - {nV}</div>
          <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>{nombre('V')}</div>
        </div>

        {bloqueTiempo(1)}
        {bloqueTiempo(2)}

        {/* WhatsApp: un solo botón que manda todo lo pendiente, y al lado el número de destino */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 132px', gap: 8, marginTop: 6, alignItems: 'end' }}>
          <button onClick={enviarPendientes} disabled={cantPendientes === 0} style={{
            height: 50, borderRadius: 8, border: 'none', cursor: cantPendientes ? 'pointer' : 'default',
            background: cantPendientes ? VERDE : '#b9c2d3', color: '#fff', fontWeight: 800, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 8px',
          }}>
            <IconWsp size={22} />
            {cantPendientes ? `ENVIAR (${cantPendientes})` : 'TODO ENVIADO'}
          </button>
          <div>
            <div style={{ ...encabezadoCol, textAlign: 'left', marginBottom: 2 }}>Enviar a</div>
            <input type="tel" inputMode="tel" aria-label="Número de WhatsApp" placeholder="Elegir contacto" value={wspDestino}
              onChange={e => setWsp(e.target.value)}
              style={{ ...inp, height: 34, fontSize: 13, fontWeight: 600, background: '#fff', border: '1px solid #b8c8e8' }} />
          </div>
        </div>
      </div>
      <div style={{ padding: '8px 16px 24px', display: 'flex', gap: 10 }}>
        <BtnBack onClick={onBack} />
        <BtnNext onClick={onNext}>Siguiente: Acta Final</BtnNext>
      </div>
    </div>
  );
}
