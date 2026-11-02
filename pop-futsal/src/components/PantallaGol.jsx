import { useState } from 'react';
import { Header, SeccionHeader, BtnNext, BtnBack } from './UI';
import { golesDe, tarjetasDe, pendientesWsp, textoAvisoPendientes } from '../utils/golesTarjetas';

// Pantalla 4 — GOLES: goles, tarjetas de jugadores y del cuerpo técnico,
// local a la izquierda y visitante a la derecha. Cada fila tiene su tiempo
// (1 o 2, botoncito que se toca para cambiar): las filas nuevas arrancan
// con el tiempo de la última que se cargó o se cambió. Los goles
// completan solos el resultado del Acta Final (que sigue siendo editable
// a mano). Un solo botón de WhatsApp abajo manda todo lo que todavía no
// se avisó; lo enviado queda pintado. Si se corrige algo ya enviado,
// vuelve a quedar pendiente para mandar la corrección.

const AZUL = '#0d1f4e', CELESTE = '#c6dbf5', VERDE = '#1a9e4a', ENVIADO = '#4aa3e0';
const AMARILLA = '#fff1a6', AMARILLA_BORDE = '#d9b800', ROJA = '#d32626', ROJA_BORDE = '#8f1414';
const CLAVE_WSP = 'pop_wsp_destino'; // último número usado, para no tipearlo en cada partido
const CLAVE_COD = 'pop_wsp_codigo';  // último código de país usado (por defecto Argentina celular: 54 9)

let seq = 0;
const nuevoId = () => `${Date.now().toString(36)}${(seq++).toString(36)}`;
const soloDigitos = (v) => String(v).replace(/\D/g, '').slice(0, 3);

const inp = {
  height: 34, border: `1.5px solid ${AZUL}`, borderRadius: 7, background: CELESTE, color: AZUL,
  fontSize: 15, fontWeight: 700, textAlign: 'center', padding: 0, width: '100%', boxSizing: 'border-box', minWidth: 0, outline: 'none',
};
const encabezadoCol = { fontSize: 9, fontWeight: 700, color: '#5a6b8c', textTransform: 'uppercase', textAlign: 'center' };
const subtitulo = { fontSize: 15, fontWeight: 800, color: AZUL, letterSpacing: .8, textTransform: 'uppercase', textAlign: 'left', borderBottom: `2px solid ${AZUL}`, paddingBottom: 3, marginTop: 2 };
const tituloGoles = { ...subtitulo, fontSize: 19, textAlign: 'center' };
// Casillero del jugador (o DT/AUX): azul oscuro con número blanco; verde
// cuando ya se avisó por WhatsApp.
const VERDE_ENVIADO = '#1a9e4a';
function estiloJugador(enviado) {
  return { ...inp, background: enviado ? VERDE_ENVIADO : AZUL, borderColor: enviado ? VERDE_ENVIADO : AZUL, color: '#fff' };
}

// "Ir" del teclado numérico: en el minuto pasa al casillero del jugador de
// la misma fila; en el jugador cierra el teclado (el dato ya queda cargado).
function alApretarIr(e) {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const siguiente = e.target.getAttribute('aria-label') === 'Minuto'
    ? e.target.parentElement?.querySelector('[data-jugador]')
    : null;
  if (siguiente) siguiente.focus(); else e.target.blur();
}

// Minuto: siempre en recuadro gris con letra negra.
function CampoMinuto({ value, onChange }) {
  return (
    <input aria-label="Minuto" inputMode="numeric" enterKeyHint="next" value={value}
      onChange={e => onChange(soloDigitos(e.target.value))} onKeyDown={alApretarIr}
      style={{ ...inp, color: '#000', background: '#e4e7ee', border: '1.5px solid #a3acbd' }} />
  );
}


// Número para wa.me: código de país (por defecto "54 9", Argentina celular)
// + número con característica, sin 0 adelante ni 15. Si el número ya viene
// con el código adelante, no se repite. Vacío = WhatsApp deja elegir contacto.
export function numeroWhatsApp(codigo, numero) {
  const cod = String(codigo || '').replace(/\D/g, '');
  let num = String(numero || '').replace(/\D/g, '');
  if (!num) return '';
  if (cod && num.startsWith(cod) && num.length > 10) return num;
  if (cod.startsWith('54') && num.startsWith('54') && num.length === 12) return `549${num.slice(2)}`; // 54 11 ... sin el 9
  num = num.replace(/^0+/, '');
  if (cod.startsWith('54')) {
    // 11 15 3631 0202 → 11 3631 0202 (el 15 de celular no va en formato internacional)
    num = num.replace(/^(\d{2,4})15(\d{6,8})$/, (m, car, resto) => ((car + resto).length === 10 ? car + resto : m));
  }
  return cod + num;
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
      height: 34, width: 24, border: 'none', background: 'none', color: ROJA, fontSize: 24, fontWeight: 700,
      lineHeight: 1, cursor: 'pointer', padding: 0,
    }}>×</button>
  );
}

export default function PantallaGol({ datos, setDatos, onNext, onBack, onIrA }) {
  const goles = golesDe(datos);
  const tarjetas = tarjetasDe(datos);

  const leer = (k) => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };
  const wspDestino = datos.wsp_destino || leer(CLAVE_WSP);
  const wspCodigo = datos.wsp_codigo || leer(CLAVE_COD) || '54 9';

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
  const setCodigo = (v) => {
    setDatos(d => ({ ...d, wsp_codigo: v }));
    try { localStorage.setItem(CLAVE_COD, v); } catch { /* idem */ }
  };

  const pend = pendientesWsp(datos);
  const cantPendientes = pend.goles.length + pend.tarjetas.length;

  const enviarPendientes = () => {
    const msj = textoAvisoPendientes(datos);
    if (!msj) return;
    const tel = numeroWhatsApp(wspCodigo, wspDestino);
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
  // línea: rayita de color (vacía en goles) → Min → Jugador o DT/AUX → ✕,
  // con los mismos anchos, para que los casilleros queden alineados.
  const GRID = '24px 36px 1fr 1fr 24px';
  const encabezado = (segunda) => (
    <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 5 }}>
      <div /><div /><div style={encabezadoCol}>Min.</div><div style={encabezadoCol}>{segunda}</div><div />
    </div>
  );
  // Tiempo de la fila: botoncito gris (como el minuto) que se toca para
  // cambiar 1 ↔ 2. Las filas nuevas arrancan en 2 si ya hay algo cargado en 2do tiempo.
  const tiempoActual = [...goles, ...tarjetas].some(x => tiempoDe(x) === 2) ? 2 : 1;
  const botonTiempo = (x, cambiar) => (
    <button aria-label="Tiempo" onClick={() => cambiar({ tiempo: tiempoDe(x) === 1 ? 2 : 1 })} style={{
      height: 34, width: 36, borderRadius: 7, padding: 0, cursor: 'pointer', fontSize: 14, fontWeight: 800,
      border: '1.5px solid #a3acbd', background: '#e4e7ee', color: '#000',
    }}>{tiempoDe(x)}T</button>
  );
  // A la izquierda de cada fila: tarjetita amarilla/roja en tarjetas, pelota en goles.
  const marca = (color) => color
    ? <div style={{ display: 'flex', justifyContent: 'center' }}><div title={color === 'R' ? 'Roja' : 'Amarilla'} style={{ width: 20, height: 28, borderRadius: 3, boxSizing: 'border-box', background: color === 'R' ? ROJA : AMARILLA, border: `1.5px solid ${color === 'R' ? ROJA_BORDE : AMARILLA_BORDE}` }} /></div>
    : <div aria-hidden="true" style={{ fontSize: 24, textAlign: 'center', lineHeight: 1 }}>⚽</div>;
  // Botones con forma de tarjeta (más angostos que altos).
  const botonesTarjeta = (agregar) => (
    <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 14 }}>
      <button onClick={() => agregar('A')} aria-label="Agregar amarilla" style={{ width: 30, height: 40, borderRadius: 4, border: `2px solid ${AMARILLA_BORDE}`, background: AMARILLA, color: '#5a4a00', fontWeight: 800, fontSize: 18, cursor: 'pointer', padding: 0 }}>+</button>
      <button onClick={() => agregar('R')} aria-label="Agregar roja" style={{ width: 30, height: 40, borderRadius: 4, border: `2px solid ${ROJA_BORDE}`, background: ROJA, color: '#fff', fontWeight: 800, fontSize: 18, cursor: 'pointer', padding: 0 }}>+</button>
    </div>
  );
  const columna = (children) => <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>{children}</div>;

  const columnaGoles = (lado) => {
    const lista = goles.filter(g => g.lado === lado);
    return columna(<>
      <button onClick={() => guardarGoles([...goles, { id: nuevoId(), lado, tiempo: tiempoActual, min: '', num: '', wsp: false }])} style={{
        height: 38, borderRadius: 8, border: `2px solid ${AZUL}`, background: CELESTE, color: AZUL,
        fontWeight: 800, fontSize: 14, cursor: 'pointer',
      }}>+ GOL</button>
      {lista.length > 0 && encabezado('Jugador')}
      {lista.map(g => {
        const st = estiloJugador(g.wsp);
        return (
          <div key={g.id} style={{ display: 'grid', gridTemplateColumns: GRID, gap: 5, alignItems: 'center' }}>
            {marca(null)}
            {botonTiempo(g, c => cambiarGol(g.id, c))}
            <CampoMinuto value={g.min} onChange={v => cambiarGol(g.id, { min: v })} />
            <input aria-label="Número de jugador" data-jugador inputMode="numeric" enterKeyHint="done" onKeyDown={alApretarIr} value={g.num} onChange={e => cambiarGol(g.id, { num: soloDigitos(e.target.value) })} style={st} />
            <BtnBorrar onClick={() => guardarGoles(goles.filter(x => x.id !== g.id))} />
          </div>
        );
      })}
    </>);
  };

  // Tarjetas de jugadores (quien = 'JUG') o del cuerpo técnico (DT/AUX).
  const columnaTarjetas = (lado, cuerpoTecnico) => {
    const esCT = (t) => t.quien === 'DT' || t.quien === 'AUX';
    const lista = tarjetas.filter(t => t.lado === lado && esCT(t) === cuerpoTecnico);
    const agregar = (color) => guardarTarjetas([...tarjetas, { id: nuevoId(), lado, tiempo: tiempoActual, color, quien: cuerpoTecnico ? 'DT' : 'JUG', min: '', num: '', wsp: false }]);
    return columna(<>
      {botonesTarjeta(agregar)}
      {lista.length > 0 && encabezado(cuerpoTecnico ? 'DT/AUX' : 'Jugador')}
      {lista.map(t => {
        const st = estiloJugador(t.wsp);
        return (
          <div key={t.id} style={{ display: 'grid', gridTemplateColumns: GRID, gap: 5, alignItems: 'center' }}>
            {marca(t.color)}
            {botonTiempo(t, c => cambiarTarjeta(t.id, c))}
            <CampoMinuto value={t.min} onChange={v => cambiarTarjeta(t.id, { min: v })} />
            {cuerpoTecnico
              ? <button aria-label="DT o auxiliar" onClick={() => cambiarTarjeta(t.id, { quien: t.quien === 'DT' ? 'AUX' : 'DT' })}
                  style={{ ...st, fontSize: 14, cursor: 'pointer' }}>{t.quien}</button>
              : <input aria-label="Número de jugador" data-jugador inputMode="numeric" enterKeyHint="done" onKeyDown={alApretarIr} value={t.num} onChange={e => cambiarTarjeta(t.id, { num: soloDigitos(e.target.value) })} style={st} />}
            <BtnBorrar onClick={() => guardarTarjetas(tarjetas.filter(x => x.id !== t.id))} />
          </div>
        );
      })}
    </>);
  };

  // Definición por penales: por equipo, una secuencia de ⚽ (convirtió) y
  // ✗ (atajado/errado), con su total. Los convertidos completan solos el
  // Def. Penales del Acta (editable). Arranca grisada: se habilita tocando
  // el título.
  const penales = Array.isArray(datos.penales) ? datos.penales : [];
  const [verPenales, setVerPenales] = useState(penales.length > 0);
  const guardarPenales = (lista) => setDatos(d => ({
    ...d, penales: lista,
    pen_local: lista.length ? String(lista.filter(p => p.lado === 'L' && p.ok).length) : '',
    pen_visitante: lista.length ? String(lista.filter(p => p.lado === 'V' && p.ok).length) : '',
  }));
  const totPen = (lado) => penales.filter(p => p.lado === lado && p.ok).length;
  const btnPen = { height: 34, minWidth: 38, borderRadius: 7, border: `1.5px solid ${AZUL}`, background: CELESTE, color: AZUL, fontWeight: 800, fontSize: 15, cursor: 'pointer', padding: '0 6px' };
  const filaPenales = (lado) => {
    const lista = penales.filter(p => p.lado === lado);
    const ultimo = lista[lista.length - 1];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 800, color: AZUL, textTransform: 'uppercase' }}>{nombre(lado)}</div>
          <div aria-label={`Total penales ${lado === 'L' ? 'local' : 'visitante'}`} style={{ fontSize: 22, fontWeight: 800, color: AZUL, minWidth: 24, textAlign: 'center' }}>{totPen(lado)}</div>
          <button aria-label="Penal convertido" onClick={() => guardarPenales([...penales, { id: nuevoId(), lado, ok: true }])} style={btnPen}>+⚽</button>
          <button aria-label="Penal atajado" onClick={() => guardarPenales([...penales, { id: nuevoId(), lado, ok: false }])} style={{ ...btnPen, color: ROJA, fontSize: 20, lineHeight: 1 }}>+×</button>
          <button aria-label="Borrar último penal" disabled={!ultimo} onClick={() => guardarPenales(penales.filter(p => p.id !== ultimo.id))} style={{ ...btnPen, background: '#fff', opacity: ultimo ? 1 : .4 }}>⌫</button>
        </div>
        <div aria-label={`Penales ${lado === 'L' ? 'local' : 'visitante'}`} style={{ minHeight: 24, fontSize: 19, letterSpacing: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {lista.map(p => <span key={p.id} style={p.ok ? undefined : { color: ROJA, fontWeight: 700, fontSize: 26, lineHeight: '22px' }}>{p.ok ? '⚽' : '×'}</span>)}
        </div>
      </div>
    );
  };

  const separador = { borderLeft: '1px solid #dde1ec', paddingLeft: 10, minWidth: 0 };

  const fila2 = (izq, der) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {izq}
      <div style={separador}>{der}</div>
    </div>
  );

  const seccionPenales = (
    <>
      <div role="button" aria-label="Definición por penales" onClick={() => setVerPenales(v => !v)} style={{
        ...subtitulo, cursor: 'pointer',
        color: verPenales ? AZUL : '#a3acbd', borderBottomColor: verPenales ? AZUL : '#c9cfdb',
        display: 'flex', alignItems: 'baseline',
      }}>
        <span style={{ flex: 1 }}>Definición por penales</span>
        {(verPenales || penales.length > 0) && <span style={{ fontSize: 14 }}>{totPen('L')} - {totPen('V')}</span>}
      </div>
      {verPenales && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filaPenales('L')}
          <div style={{ borderTop: '1px solid #dde1ec' }} />
          {filaPenales('V')}
        </div>
      )}
    </>
  );

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <Header paso={4} onIrA={onIrA} />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <SeccionHeader>4. Goles</SeccionHeader>

        {/* Marcador: local a la izquierda, visitante a la derecha (igual que las columnas) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8, background: AZUL, color: '#fff', borderRadius: 8, padding: '8px 10px' }}>
          <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>{nombre('L')}</div>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 2 }}>{nL} - {nV}</div>
          <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>{nombre('V')}</div>
        </div>

        <div style={tituloGoles}>Goles</div>
        {fila2(columnaGoles('L'), columnaGoles('V'))}
        <div style={subtitulo}>🟨🟥 Tarjetas</div>
        {fila2(columnaTarjetas('L', false), columnaTarjetas('V', false))}
        <div style={subtitulo}>🟨🟥 Cuerpo técnico</div>
        {fila2(columnaTarjetas('L', true), columnaTarjetas('V', true))}
        {seccionPenales}

        {/* WhatsApp: un solo botón que manda todo lo pendiente; debajo, discreto, el número de destino */}
        <button onClick={enviarPendientes} disabled={cantPendientes === 0} style={{
          height: 50, borderRadius: 8, border: 'none', cursor: cantPendientes ? 'pointer' : 'default', marginTop: 4,
          background: cantPendientes ? VERDE : '#b9c2d3', color: '#fff', fontWeight: 800, fontSize: 15,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 8px',
        }}>
          <IconWsp size={22} />
          {cantPendientes ? `ENVIAR POR WHATSAPP (${cantPendientes})` : 'TODO ENVIADO'}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: -4 }}>
          <div style={{ ...encabezadoCol, fontSize: 10, whiteSpace: 'nowrap' }}>Enviar a</div>
          <div style={{ display: 'flex', alignItems: 'center', height: 32, border: '1px solid #b8c8e8', borderRadius: 7, background: '#f1f3f8', paddingLeft: 6, color: '#8a96ad', fontSize: 13, fontWeight: 600 }}>
            +<input aria-label="Código de país" inputMode="numeric" value={wspCodigo} onChange={e => setCodigo(e.target.value.replace(/[^\d ]/g, '').slice(0, 7))}
              style={{ width: 44, border: 'none', background: 'transparent', color: '#8a96ad', fontSize: 13, fontWeight: 600, outline: 'none', padding: '0 2px' }} />
          </div>
          <input type="tel" inputMode="tel" aria-label="Número de WhatsApp" placeholder="Ej: 11 3631 0202 (vacío: elegir contacto)" value={wspDestino}
            onChange={e => setWsp(e.target.value)}
            style={{ ...inp, flex: 1, height: 32, fontSize: 13, fontWeight: 600, background: '#fff', border: '1px solid #b8c8e8', textAlign: 'left', paddingLeft: 8 }} />
        </div>
      </div>
      <div style={{ padding: '8px 16px 24px', display: 'flex', gap: 10 }}>
        <BtnBack onClick={onBack} />
        <BtnNext onClick={onNext}>Siguiente: Acta Final</BtnNext>
      </div>
    </div>
  );
}
