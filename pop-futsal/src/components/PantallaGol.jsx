import { useState } from 'react';
import { Header, SeccionHeader, BtnNext, BtnBack } from './UI';
import { golesDe, tarjetasDe, textoAvisoGol } from '../utils/golesTarjetas';

// Pantalla 4 — GOL: goles y tarjetas del partido, local a la izquierda y
// visitante a la derecha. Los goles completan solos el resultado del Acta
// Final (que sigue siendo editable a mano). Cada gol tiene un botón de
// WhatsApp para avisarlo; una vez usado queda celeste.

const AZUL = '#0d1f4e', CELESTE = '#c6dbf5', VERDE = '#1a9e4a', CELESTE_WSP = '#4aa3e0';
const AMARILLA = '#f2c200', ROJA = '#d32626';
const CLAVE_WSP = 'pop_wsp_destino'; // último número usado, para no tipearlo en cada partido

let seq = 0;
const nuevoId = () => `${Date.now().toString(36)}${(seq++).toString(36)}`;

const inp = {
  height: 38, border: `1.5px solid ${AZUL}`, borderRadius: 7, background: CELESTE, color: AZUL,
  fontSize: 16, fontWeight: 700, textAlign: 'center', padding: 0, width: '100%', boxSizing: 'border-box', minWidth: 0, outline: 'none',
};
const titulo = { fontSize: 12, fontWeight: 700, color: AZUL, letterSpacing: .5, textTransform: 'uppercase', borderBottom: `2px solid ${AZUL}`, paddingBottom: 3 };
const encabezadoCol = { fontSize: 9, fontWeight: 700, color: '#5a6b8c', textTransform: 'uppercase', textAlign: 'center' };

function IconWsp({ size = 18, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.8 2.3.9 2.5c.1.2 1.6 2.5 4 3.5 1.5.6 2.1.7 2.8.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.5-.2z" />
    </svg>
  );
}

const soloDigitos = (v) => String(v).replace(/\D/g, '').slice(0, 3);

function BtnBorrar({ onClick }) {
  return <button onClick={onClick} aria-label="Borrar" style={{ height: 38, width: 18, border: 'none', background: 'none', color: '#999', fontSize: 18, cursor: 'pointer', padding: 0 }}>×</button>;
}

export default function PantallaGol({ datos, setDatos, onNext, onBack, onIrA }) {
  const goles = golesDe(datos);
  const tarjetas = tarjetasDe(datos);
  const [editandoWsp, setEditandoWsp] = useState(false);

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
  const cambiarGol = (id, cambios) => guardarGoles(goles.map(g => g.id === id ? { ...g, ...cambios } : g));
  const cambiarTarjeta = (id, cambios) => guardarTarjetas(tarjetas.map(t => t.id === id ? { ...t, ...cambios } : t));

  const setWsp = (v) => {
    setDatos(d => ({ ...d, wsp_destino: v }));
    try { localStorage.setItem(CLAVE_WSP, v); } catch { /* sin almacenamiento: no pasa nada */ }
  };

  const avisarGol = (g) => {
    const tel = wspDestino.replace(/\D/g, '');
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(textoAvisoGol(datos, g))}`);
    cambiarGol(g.id, { wsp: true });
  };

  const nL = goles.filter(g => g.lado === 'L').length;
  const nV = goles.filter(g => g.lado === 'V').length;
  const club = (lado) => (lado === 'L' ? datos.local : datos.visitante) || (lado === 'L' ? 'LOCAL' : 'VISITANTE');

  const columnaGoles = (lado) => {
    const lista = goles.filter(g => g.lado === lado);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        <button onClick={() => guardarGoles([...goles, { id: nuevoId(), lado, num: '', min: '', wsp: false }])} style={{
          height: 44, borderRadius: 8, border: `2px solid ${AZUL}`, background: '#fff', color: AZUL,
          fontWeight: 800, fontSize: 14, cursor: 'pointer',
        }}>+ GOL</button>
        {lista.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 36px 18px', gap: 5 }}>
            <div style={encabezadoCol}>Nº</div><div style={encabezadoCol}>Min.</div><div /><div />
          </div>
        )}
        {lista.map(g => (
          <div key={g.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 36px 18px', gap: 5, alignItems: 'center' }}>
            <input aria-label="Número de jugador" inputMode="numeric" value={g.num} onChange={e => cambiarGol(g.id, { num: soloDigitos(e.target.value) })} style={inp} />
            <input aria-label="Minuto" inputMode="numeric" value={g.min} onChange={e => cambiarGol(g.id, { min: soloDigitos(e.target.value) })} style={inp} />
            <button onClick={() => avisarGol(g)} aria-label="Avisar gol por WhatsApp" style={{
              height: 38, borderRadius: 7, border: 'none', cursor: 'pointer', padding: 0,
              background: g.wsp ? CELESTE_WSP : VERDE, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><IconWsp /></button>
            <BtnBorrar onClick={() => guardarGoles(goles.filter(x => x.id !== g.id))} />
          </div>
        ))}
      </div>
    );
  };

  const columnaTarjetas = (lado) => {
    const lista = tarjetas.filter(t => t.lado === lado);
    const agregar = (color) => guardarTarjetas([...tarjetas, { id: nuevoId(), lado, color, quien: 'JUG', num: '', min: '' }]);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <button onClick={() => agregar('A')} style={{ height: 40, borderRadius: 8, border: `2px solid #b89400`, background: AMARILLA, color: '#3a2e00', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>+ AM.</button>
          <button onClick={() => agregar('R')} style={{ height: 40, borderRadius: 8, border: `2px solid #8f1414`, background: ROJA, color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>+ ROJA</button>
        </div>
        {lista.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '10px 50px 1fr 1fr 18px', gap: 4 }}>
            <div /><div style={encabezadoCol}>Quién</div><div style={encabezadoCol}>Nº</div><div style={encabezadoCol}>Min.</div><div />
          </div>
        )}
        {lista.map(t => (
          <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '10px 50px 1fr 1fr 18px', gap: 4, alignItems: 'center' }}>
            <div title={t.color === 'R' ? 'Roja' : 'Amarilla'} style={{ width: 10, height: 30, borderRadius: 2, background: t.color === 'R' ? ROJA : AMARILLA }} />
            <select aria-label="Quién" value={t.quien} onChange={e => cambiarTarjeta(t.id, { quien: e.target.value })}
              style={{ ...inp, fontSize: 12, padding: '0 2px', textAlign: 'left', appearance: 'none' }}>
              <option value="JUG">JUG</option><option value="DT">DT</option><option value="AUX">AUX</option>
            </select>
            {t.quien === 'JUG'
              ? <input aria-label="Número de jugador" inputMode="numeric" value={t.num} onChange={e => cambiarTarjeta(t.id, { num: soloDigitos(e.target.value) })} style={inp} />
              : <div style={{ ...inp, background: '#eef1f7', border: '1.5px solid #dde1ec', color: '#999', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>—</div>}
            <input aria-label="Minuto" inputMode="numeric" value={t.min} onChange={e => cambiarTarjeta(t.id, { min: soloDigitos(e.target.value) })} style={inp} />
            <BtnBorrar onClick={() => guardarTarjetas(tarjetas.filter(x => x.id !== t.id))} />
          </div>
        ))}
      </div>
    );
  };

  const separador = { borderLeft: '1px solid #dde1ec', paddingLeft: 10, minWidth: 0 };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <Header paso={4} onIrA={onIrA} />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SeccionHeader>4. Gol</SeccionHeader>

        {/* Marcador */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8, background: AZUL, color: '#fff', borderRadius: 8, padding: '8px 10px' }}>
          <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>{club('L')}</div>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 2 }}>{nL} - {nV}</div>
          <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>{club('V')}</div>
        </div>

        <div style={titulo}>⚽ Goles</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {columnaGoles('L')}
          <div style={separador}>{columnaGoles('V')}</div>
        </div>

        <div style={{ ...titulo, marginTop: 6 }}>Tarjetas</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {columnaTarjetas('L')}
          <div style={separador}>{columnaTarjetas('V')}</div>
        </div>

        {/* Número de WhatsApp para los avisos de gol: discreto, abajo a la derecha. */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginTop: 4 }}>
          {editandoWsp ? (
            <>
              <input type="tel" inputMode="tel" autoFocus placeholder="Nº de WhatsApp" value={datos.wsp_destino || wspDestino}
                onChange={e => setWsp(e.target.value)} onBlur={() => setEditandoWsp(false)}
                style={{ ...inp, height: 32, width: 170, fontSize: 14, background: '#fff', border: '1px solid #b8c8e8' }} />
              <button onClick={() => setEditandoWsp(false)} style={{ height: 32, border: 'none', background: 'none', color: AZUL, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>OK</button>
            </>
          ) : (
            <button onClick={() => setEditandoWsp(true)} style={{ border: 'none', background: 'none', color: '#8a96ad', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}>
              <IconWsp size={13} color="#8a96ad" />
              {wspDestino ? `Avisos a ${wspDestino}` : 'Avisos: elegir contacto al enviar'} ✎
            </button>
          )}
        </div>
      </div>
      <div style={{ padding: '8px 16px 24px', display: 'flex', gap: 10 }}>
        <BtnBack onClick={onBack} />
        <BtnNext onClick={onNext}>Siguiente: Acta Final</BtnNext>
      </div>
    </div>
  );
}
