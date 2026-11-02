import { useState } from 'react';
import { Header, SeccionHeader, BtnNext, BtnBack } from './UI';
import { golesDe, tarjetasDe, pendientesWsp, textoAvisoPendientes } from '../utils/golesTarjetas';

// Pantalla 4 — GOLES: goles y tarjetas del partido, separados por 1er y
// 2do tiempo (goles, tarjetas de jugadores y del cuerpo técnico), local a la izquierda y visitante a la derecha. Los goles
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
const encabezadoCol = { fontSize: 9, fontWeight: 700, color: '#5a6b8c', textTransform: 'uppercase', textAlign: 'center' };
const subtitulo = { fontSize: 14, fontWeight: 800, color: AZUL, letterSpacing: .5, textTransform: 'uppercase', borderBottom: `2px solid ${AZUL}`, paddingBottom: 3, marginTop: 4 };
const ROJA_PASTEL = '#f9c4c4';

// Casillero del jugador (o DT/AUX): celeste en goles, del color de la
// tarjeta en tarjetas, azul cuando ya se avisó por WhatsApp.
function estiloJugador(color, enviado) {
  if (enviado) return { ...inp, background: ENVIADO, borderColor: ENVIADO, color: '#fff' };
  if (color === 'A') return { ...inp, background: AMARILLA, borderColor: AMARILLA_BORDE, color: '#5a4a00' };
  if (color === 'R') return { ...inp, background: ROJA_PASTEL, borderColor: ROJA, color: '#7a1030' };
  return inp;
}

// Minuto: recuadro gris con letra negra mientras se escribe (o si está
// vacío); al salir del casillero queda solo el número ("15'") sin recuadro.
// Tocándolo de nuevo vuelve el recuadro para corregirlo.
function CampoMinuto({ value, onChange }) {
  const [editando, setEditando] = useState(false);
  const soloTexto = !editando && value !== '';
  return (
    <input aria-label="Minuto" inputMode="numeric"
      value={soloTexto ? `${value}'` : value}
      onFocus={() => setEditando(true)} onBlur={() => setEditando(false)}
      onChange={e => onChange(soloDigitos(e.target.value))}
      style={{
        ...inp, color: '#000',
        background: soloTexto ? 'transparent' : '#e4e7ee',
        border: `1.5px solid ${soloTexto ? 'transparent' : '#a3acbd'}`,
        fontSize: soloTexto ? 18 : 16,
      }} />
  );
}


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

  // Las tres secciones (Goles, Tarjetas, Cuerpo técnico) usan la MISMA
  // línea: Min → Jugador o DT/AUX → ✕ (el color de la tarjeta va en el casillero),
  // con los mismos anchos, para que los casilleros queden alineados.
  const GRID = '1fr 1fr 24px';
  const encabezado = (segunda) => (
    <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 5 }}>
      <div style={encabezadoCol}>Min.</div><div style={encabezadoCol}>{segunda}</div><div />
    </div>
  );
  // Botones con forma de tarjeta (más angostos que altos).
  const botonesTarjeta = (agregar) => (
    <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 14 }}>
      <button onClick={() => agregar('A')} aria-label="Agregar amarilla" style={{ width: 30, height: 40, borderRadius: 4, border: `2px solid ${AMARILLA_BORDE}`, background: AMARILLA, color: '#5a4a00', fontWeight: 800, fontSize: 18, cursor: 'pointer', padding: 0 }}>+</button>
      <button onClick={() => agregar('R')} aria-label="Agregar roja" style={{ width: 30, height: 40, borderRadius: 4, border: `2px solid ${ROJA_BORDE}`, background: ROJA, color: '#fff', fontWeight: 800, fontSize: 18, cursor: 'pointer', padding: 0 }}>+</button>
    </div>
  );
  const columna = (children) => <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>{children}</div>;

  const columnaGoles = (lado, tiempo) => {
    const lista = goles.filter(g => g.lado === lado && tiempoDe(g) === tiempo);
    return columna(<>
      <button onClick={() => guardarGoles([...goles, { id: nuevoId(), lado, tiempo, min: '', num: '', wsp: false }])} style={{
        height: 38, borderRadius: 8, border: `2px solid ${AZUL}`, background: CELESTE, color: AZUL,
        fontWeight: 800, fontSize: 14, cursor: 'pointer',
      }}>+ GOL</button>
      {lista.length > 0 && encabezado('Jugador')}
      {lista.map(g => {
        const st = estiloJugador(null, g.wsp);
        return (
          <div key={g.id} style={{ display: 'grid', gridTemplateColumns: GRID, gap: 5, alignItems: 'center' }}>
            <CampoMinuto value={g.min} onChange={v => cambiarGol(g.id, { min: v })} />
            <input aria-label="Número de jugador" inputMode="numeric" value={g.num} onChange={e => cambiarGol(g.id, { num: soloDigitos(e.target.value) })} style={st} />
            <BtnBorrar onClick={() => guardarGoles(goles.filter(x => x.id !== g.id))} />
          </div>
        );
      })}
    </>);
  };

  // Tarjetas de jugadores (quien = 'JUG') o del cuerpo técnico (DT/AUX).
  const columnaTarjetas = (lado, tiempo, cuerpoTecnico) => {
    const esCT = (t) => t.quien === 'DT' || t.quien === 'AUX';
    const lista = tarjetas.filter(t => t.lado === lado && tiempoDe(t) === tiempo && esCT(t) === cuerpoTecnico);
    const agregar = (color) => guardarTarjetas([...tarjetas, { id: nuevoId(), lado, tiempo, color, quien: cuerpoTecnico ? 'DT' : 'JUG', min: '', num: '', wsp: false }]);
    return columna(<>
      {botonesTarjeta(agregar)}
      {lista.length > 0 && encabezado(cuerpoTecnico ? 'DT / Aux.' : 'Jugador')}
      {lista.map(t => {
        const st = estiloJugador(t.color, t.wsp);
        return (
          <div key={t.id} style={{ display: 'grid', gridTemplateColumns: GRID, gap: 5, alignItems: 'center' }}>
            <CampoMinuto value={t.min} onChange={v => cambiarTarjeta(t.id, { min: v })} />
            {cuerpoTecnico
              ? <select aria-label="DT o auxiliar" value={t.quien} onChange={e => cambiarTarjeta(t.id, { quien: e.target.value })}
                  style={{ ...st, fontSize: 14, padding: 0, textAlign: 'center', textAlignLast: 'center', appearance: 'none' }}>
                  <option value="DT">DT</option><option value="AUX">AUX</option>
                </select>
              : <input aria-label="Número de jugador" inputMode="numeric" value={t.num} onChange={e => cambiarTarjeta(t.id, { num: soloDigitos(e.target.value) })} style={st} />}
            <BtnBorrar onClick={() => guardarTarjetas(tarjetas.filter(x => x.id !== t.id))} />
          </div>
        );
      })}
    </>);
  };

  const separador = { borderLeft: '1px solid #dde1ec', paddingLeft: 10, minWidth: 0 };

  const bloqueTiempo = (tiempo) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ background: '#e8edf8', color: AZUL, fontSize: 15, fontWeight: 800, letterSpacing: .8, textTransform: 'uppercase', padding: '8px 10px', borderRadius: 6, textAlign: 'center', border: `1.5px solid ${AZUL}` }}>
        {tiempo === 1 ? '1er Tiempo' : '2do Tiempo'}
      </div>
      <div style={subtitulo}>⚽ Goles</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {columnaGoles('L', tiempo)}
        <div style={separador}>{columnaGoles('V', tiempo)}</div>
      </div>
      <div style={subtitulo}>🟨🟥 Tarjetas</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {columnaTarjetas('L', tiempo, false)}
        <div style={separador}>{columnaTarjetas('V', tiempo, false)}</div>
      </div>
      <div style={subtitulo}>🟨🟥 Cuerpo técnico</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {columnaTarjetas('L', tiempo, true)}
        <div style={separador}>{columnaTarjetas('V', tiempo, true)}</div>
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
