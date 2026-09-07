import { useRef, useState, useLayoutEffect, useEffect } from 'react';

// Valida los dígitos de una hora "HH:MM" a medida que se van tipeando —
// corta en el primer dígito que haría una hora imposible (ej. minutos
// arrancando en 6-9, como en "20:73"), en vez de aceptar cualquier cosa y
// dejar que quede una hora inválida cargada.
export function validarDigitosHora(digitos) {
  let resultado = '';
  for (let i = 0; i < digitos.length && i < 4; i++) {
    const d = digitos[i];
    if (i === 0 && d > '2') break; // hora no puede empezar con 3-9
    if (i === 1 && resultado[0] === '2' && d > '3') break; // 24-29 no existen
    if (i === 2 && d > '5') break; // minutos no pueden empezar con 6-9
    resultado += d;
  }
  return resultado;
}

const C = {
  azul: '#0d1f4e',
  // Celeste oscuro: fondo de campos en pantallas 1-3, borde azul siempre visible
  celeste: '#c6dbf5',
  celesteBorde: '#0d1f4e',
  rojo: '#e03030',
  // Bordó: paleta de la pantalla 4 (Observaciones durante el partido)
  bordo: '#7a1030',
  naranja: '#c96a1c',
  naranjaClaro: '#fadfba',
  // Rosa: fondo de campos en pantalla 4, borde bordó siempre visible
  rosa: '#fbdbe1',
  rosaBorde: '#7a1030',
  verde: '#1a7a3a',
  borde: '#dde1ec',
  fondo: '#f8f9fc',
  texto: '#0d1f4e',
  textoSec: '#666',
  blanco: '#ffffff',
};

// Fuerza mayúsculas en todo lo que se tipea en la app (campos de texto y
// observaciones), para que quede prolijo y uniforme sin que el Oficial AFA
// tenga que acordarse de usar mayúsculas.
const upper = (v) => (typeof v === 'string' ? v.toUpperCase() : v);

export function Header({ paso, total = 5, onIrA }) {
  const pasos = ['DATOS', 'CONTROL', 'HORARIOS', 'OBS.', 'ACTA'];
  return (
    <div>
      <div style={{ background: C.azul, padding: '10px 16px', display: 'flex', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: .5, textTransform: 'uppercase' }}>FUTSAL AFA</div>
          <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 11, textTransform: 'uppercase', letterSpacing: .3 }}>Planilla Oficial de Partido</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,.15)', color: '#fff', fontSize: 11, padding: '3px 8px', borderRadius: 20 }}>
          {paso} / {total}
        </div>
      </div>
      <div style={{ height: 3, background: 'rgba(0,0,0,.1)' }}>
        <div style={{ height: 3, background: C.rojo, width: `${(paso / total) * 100}%`, transition: 'width .3s' }} />
      </div>
      <div style={{ display: 'flex', background: C.azul, padding: '0 8px 10px' }}>
        {pasos.map((p, i) => (
          <div key={p} onClick={() => onIrA && onIrA(i + 1)} style={{
            flex: 1, textAlign: 'center', fontSize: 10, padding: '4px 2px', cursor: onIrA ? 'pointer' : 'default',
            borderBottom: i + 1 === paso ? `2px solid ${C.rojo}` : '2px solid transparent',
            color: i + 1 === paso ? '#fff' : i + 1 < paso ? 'rgba(255,255,255,.6)' : 'rgba(255,255,255,.3)',
            fontWeight: i + 1 === paso ? 700 : 400, textTransform: 'uppercase', letterSpacing: .3,
          }}>{p}</div>
        ))}
      </div>
    </div>
  );
}

export function SeccionHeader({ children, rojo }) {
  return (
    <div style={{
      background: rojo ? C.bordo : C.azul,
      color: '#fff', fontSize: 11, fontWeight: 700,
      letterSpacing: .5, padding: '7px 12px', borderRadius: 6,
      textTransform: 'uppercase',
    }}>{children}</div>
  );
}

export function Campo({ label, children, required }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <label style={{ fontSize: 12, color: C.azul, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .3 }}>
        {label}{required && <span style={{ color: C.rojo, fontSize: 10, marginLeft: 4 }}>*</span>}
      </label>}
      {children}
    </div>
  );
}

// variant: 'celeste' (default, pantallas 1-3) | 'rosa' (pantalla 4)
function baseStyle(variant) {
  const bg = variant === 'rosa' ? C.rosa : C.celeste;
  const border = variant === 'rosa' ? C.rosaBorde : C.celesteBorde;
  return {
    height: 44, border: `1.5px solid ${border}`, borderRadius: 8,
    padding: '0 12px', fontSize: 15, color: variant === 'rosa' ? '#000' : C.azul, fontWeight: 600,
    background: bg, width: '100%', outline: 'none', boxSizing: 'border-box',
  };
}

// Campo de hora simple (mismo aspecto que Input), para la Hora programada
// del partido en Pantalla 1 — sin el recuadro grande ni el botón "Ahora"
// de HoraInput, que ahí no tienen sentido.
export function InputHora({ value, onChange, placeholder = 'HH:MM', style = {}, variant = 'celeste' }) {
  const ref = useRef(null);
  const cursor = useRef(null);

  useLayoutEffect(() => {
    if (cursor.current != null && ref.current) {
      ref.current.setSelectionRange(cursor.current, cursor.current);
      cursor.current = null;
    }
  }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value;
    const posCursorRaw = e.target.selectionStart;
    const digitosAntes = raw.slice(0, posCursorRaw).replace(/[^0-9]/g, '').length;
    const digitos = validarDigitosHora(raw.replace(/[^0-9]/g, '').slice(0, 4));
    const formateado = digitos.length >= 3 ? `${digitos.slice(0, 2)}:${digitos.slice(2)}` : digitos;
    let nuevaPos = digitosAntes + (formateado.includes(':') && digitosAntes > 2 ? 1 : 0);
    cursor.current = Math.min(nuevaPos, formateado.length);
    onChange(formateado);
  };

  // Si al salir del campo solo se cargó la hora (1 o 2 dígitos, sin los
  // ":MM"), completa los minutos en "00" para que quede "HH:00" — antes
  // quedaba a medio escribir y no disparaba ningún cálculo dependiente.
  const handleBlur = () => {
    if (value && /^\d{1,2}$/.test(value)) onChange(`${value.padStart(2, '0')}:00`);
  };

  return (
    <input
      ref={ref}
      type="text" inputMode="numeric" value={value || ''} onChange={handleChange} onBlur={handleBlur}
      placeholder={placeholder} maxLength={5}
      style={{ ...baseStyle(variant), ...style }}
    />
  );
}

export function Input({ value, onChange, placeholder, type = 'text', style = {}, onKeyUp, variant = 'celeste' }) {
  const ref = useRef(null);
  const cursor = useRef(null);

  useLayoutEffect(() => {
    if (cursor.current != null && ref.current) {
      ref.current.setSelectionRange(cursor.current, cursor.current);
      cursor.current = null;
    }
  }, [value]);

  const handleChange = (e) => {
    if (type === 'text') {
      cursor.current = e.target.selectionStart;
      onChange(upper(e.target.value));
    } else {
      onChange(e.target.value);
    }
  };

  return (
    <input
      ref={ref}
      type={type}
      value={value}
      onChange={handleChange}
      onKeyUp={onKeyUp}
      placeholder={placeholder}
      style={{ ...baseStyle(variant), ...style }}
    />
  );
}

// Igual que Select, pero además permite escribir un valor que no está en la
// lista (para amistosos con equipos/árbitros/estadios de afuera). Usa un
// <input> con lista desplegable de sugerencias en vez de un <select> cerrado.
export function SelectLibre({ value, onChange, options, placeholder, variant = 'celeste', style = {} }) {
  const [abierto, setAbierto] = useState(false);
  // Al volver a tocar un campo que ya tiene un valor cargado, se muestra la
  // lista COMPLETA (para reelegir otra opción), no filtrada por el texto ya
  // escrito — si no, filtrar por el valor actual solía dejar como única
  // opción visible la que ya estaba seleccionada. El filtrado por texto
  // vuelve a activarse en cuanto la persona empieza a escribir de nuevo.
  const [filtrando, setFiltrando] = useState(false);
  const contenedorRef = useRef(null);
  const inputRef = useRef(null);
  const cursor = useRef(null);

  useLayoutEffect(() => {
    if (cursor.current != null && inputRef.current) {
      inputRef.current.setSelectionRange(cursor.current, cursor.current);
      cursor.current = null;
    }
  }, [value]);

  // Cierra la lista si se toca afuera del campo
  useEffect(() => {
    const cerrar = (e) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target)) { setAbierto(false); setFiltrando(false); }
    };
    document.addEventListener('mousedown', cerrar);
    document.addEventListener('touchstart', cerrar);
    return () => {
      document.removeEventListener('mousedown', cerrar);
      document.removeEventListener('touchstart', cerrar);
    };
  }, []);

  const handleChange = (e) => {
    cursor.current = e.target.selectionStart;
    onChange(upper(e.target.value));
    setFiltrando(true);
    setAbierto(true);
  };

  const elegir = (opcion) => {
    onChange(opcion);
    setAbierto(false);
    setFiltrando(false);
  };

  const filtrados = value && filtrando
    ? options.filter(o => o.toUpperCase().includes(value.toUpperCase()))
    : options;

  return (
    <div ref={contenedorRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onFocus={() => { setFiltrando(false); setAbierto(true); }}
          placeholder={placeholder}
          autoComplete="off"
          style={{
            ...baseStyle(variant), color: value ? (variant === 'rosa' ? '#000' : C.azul) : '#5a6b8c',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%230d1f4e' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
            backgroundSize: '16px', paddingRight: 32,
            ...style,
          }}
        />
      </div>
      {abierto && filtrados.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
          background: '#fff', border: `1.5px solid ${C.celesteBorde}`, borderRadius: 8,
          maxHeight: 220, overflowY: 'auto', zIndex: 20, boxShadow: '0 4px 12px rgba(0,0,0,.15)',
        }}>
          {filtrados.map(o => (
            <div key={o} onClick={() => elegir(o)} style={{
              padding: '10px 12px', fontSize: 14, fontWeight: 600, color: C.azul,
              cursor: 'pointer', borderBottom: '1px solid #eee',
            }}>{o}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Select({ value, onChange, options, placeholder, variant = 'celeste', style = {} }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        ...baseStyle(variant),
        color: value ? (variant === 'rosa' ? '#000' : C.azul) : '#5a6b8c',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%230d1f4e' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
        backgroundSize: '16px', paddingRight: 32,
        ...style,
      }}
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// Checkbox azul - para items normales (instalaciones, etc.)
// Sin marcar: fondo celeste, casillero blanco. Marcado: fondo azul, casillero celeste.
export function CheckAzul({ label, checked, onChange, minHeight, padding = '12px 10px', sinMayuscula, color = C.azul, colorInactivo = C.celeste, sinCasillero, fontSize = 13 }) {
  const lineas = Array.isArray(label) ? label : [label];
  return (
    <div onClick={() => onChange(!checked)} style={{
      display: 'flex', alignItems: 'center', justifyContent: sinCasillero ? 'center' : 'flex-start', gap: sinCasillero ? 0 : 10, minWidth: 0,
      background: checked ? color : colorInactivo,
      border: `1.5px solid ${color}`,
      borderRadius: 8, padding, cursor: 'pointer',
      userSelect: 'none', transition: 'all .15s', minHeight,
    }}>
      {!sinCasillero && (
        <div style={{
          width: 22, height: 22, borderRadius: 4, flexShrink: 0,
          background: checked ? colorInactivo : '#fff',
          border: `2px solid ${checked ? colorInactivo : color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {checked && <span style={{ color, fontSize: 14, lineHeight: 1, fontWeight: 700 }}>✓</span>}
        </div>
      )}
      <span style={{ fontSize, color: checked ? '#fff' : color, lineHeight: 1.2, fontWeight: 600, textTransform: sinMayuscula ? 'none' : 'uppercase', minWidth: 0, wordBreak: 'break-word', textAlign: sinCasillero ? 'center' : 'left' }}>
        {/* Punto pedido: en la grilla angosta de Instalaciones (3 columnas)
            el casillero cuadrado de siempre le robaba mucho ancho al
            texto — acá (sinCasillero) se saca el cuadrado y se confía en
            el cambio de color de fondo (celeste/azul) como indicador
            principal, ganando bastante más lugar para las 2 líneas de
            texto. En el resto de la app (ej. Pantalla3) sigue igual que
            siempre, con su casillero. */}
        {sinCasillero && checked && '✓ '}
        {lineas.length > 1 ? lineas.map((linea, i) => <div key={i}>{linea}</div>) : lineas[0]}
      </span>
    </div>
  );
}

// Checkbox bordó - para incumplimientos/problemas (pantalla 4)
// Sin marcar: fondo rosa, casillero blanco, letra negra. Marcado: fondo bordó, casillero rosa, letra blanca.
export function CheckRojo({ label, checked, onChange }) {
  return (
    <div onClick={() => onChange(!checked)} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: checked ? C.bordo : C.rosa,
      border: `1.5px solid ${C.bordo}`,
      borderRadius: 8, padding: '12px 10px', cursor: 'pointer',
      userSelect: 'none', transition: 'all .15s',
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: 4, flexShrink: 0,
        background: checked ? C.rosa : '#fff',
        border: `2px solid ${checked ? C.rosa : C.bordo}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {checked && <span style={{ color: C.bordo, fontSize: 14, lineHeight: 1, fontWeight: 700 }}>✓</span>}
      </div>
      <span style={{ fontSize: 13, color: checked ? '#fff' : '#000', lineHeight: 1.2, fontWeight: 700, textTransform: 'uppercase' }}>
        {label}
      </span>
    </div>
  );
}

// Igual que CheckRojo pero con letra más chica, para filas de 3 columnas angostas.
export function CheckRojoChico({ label, checked, onChange }) {
  return (
    <div onClick={() => onChange(!checked)} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: checked ? C.bordo : C.rosa,
      border: `1.5px solid ${C.bordo}`,
      borderRadius: 8, padding: '10px 8px', cursor: 'pointer',
      userSelect: 'none', transition: 'all .15s',
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: 4, flexShrink: 0,
        background: checked ? C.rosa : '#fff',
        border: `2px solid ${checked ? C.rosa : C.bordo}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {checked && <span style={{ color: C.bordo, fontSize: 12, lineHeight: 1, fontWeight: 700 }}>✓</span>}
      </div>
      <span style={{ fontSize: 11, color: checked ? '#fff' : '#000', lineHeight: 1.1, fontWeight: 700, textTransform: 'uppercase' }}>
        {label}
      </span>
    </div>
  );
}

// Chip L/V bordó para incumplimientos (Calentamiento Suplentes) - letras cortas
// para que no se rompa el ancho de la fila.
export function LVRojo({ label, checked, onChange }) {
  return (
    <div onClick={() => onChange(!checked)} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      border: `1.5px solid ${C.bordo}`,
      borderRadius: 6, padding: '7px 10px',
      background: checked ? C.bordo : '#fff',
      cursor: 'pointer', fontSize: 12, fontWeight: 700,
      color: checked ? '#fff' : '#000',
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: 3, flexShrink: 0,
        background: checked ? C.rosa : '#fff',
        border: `2px solid ${checked ? C.rosa : C.bordo}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {checked && <span style={{ color: C.bordo, fontSize: 10, fontWeight: 700 }}>✓</span>}
      </div>
      {label}
    </div>
  );
}

export function HoraInput({ value, onChange, label, variant = 'celeste', sinBoton = false, minHeight }) {
  const bg = variant === 'rosa' ? C.rosa : variant === 'naranja' ? C.naranjaClaro : C.celeste;
  const border = variant === 'rosa' ? C.rosaBorde : variant === 'naranja' ? C.naranja : C.celesteBorde;
  const color = variant === 'rosa' ? '#000' : C.azul;
  const lineasLabel = Array.isArray(label) ? label : [label];
  const ref = useRef(null);
  const cursor = useRef(null);

  useLayoutEffect(() => {
    if (cursor.current != null && ref.current) {
      ref.current.setSelectionRange(cursor.current, cursor.current);
      cursor.current = null;
    }
  }, [value]);

  const setAhora = () => {
    const now = new Date();
    onChange(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
  };

  // Campo único "HH:MM" con el ":" agregado solo. El cursor se calcula a
  // partir de cuántos DÍGITOS había antes de él (ignorando el ":"), y se le
  // suma 1 si esa posición ya quedó después del ":" en el resultado — así
  // nunca se "adelanta" ni duplica un dígito, escribas donde escribas.
  const handleChange = (e) => {
    const raw = e.target.value;
    const posCursorRaw = e.target.selectionStart;
    const digitosAntes = raw.slice(0, posCursorRaw).replace(/[^0-9]/g, '').length;
    const digitos = validarDigitosHora(raw.replace(/[^0-9]/g, '').slice(0, 4));
    const formateado = digitos.length >= 3 ? `${digitos.slice(0, 2)}:${digitos.slice(2)}` : digitos;
    let nuevaPos = digitosAntes + (formateado.includes(':') && digitosAntes > 2 ? 1 : 0);
    cursor.current = Math.min(nuevaPos, formateado.length);
    onChange(formateado);
  };

  // Mismo autocompletado que InputHora: si solo se cargó la hora (sin los
  // ":MM"), al salir del campo se completa en "00" — antes quedaba a medio
  // escribir y ningún cálculo dependiente (demoras, entretiempo, etc.)
  // se disparaba.
  const handleBlur = () => {
    if (value && /^\d{1,2}$/.test(value)) onChange(`${value.padStart(2, '0')}:00`);
  };

  return (
    <div style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 6, minHeight, justifyContent: minHeight ? 'center' : undefined, boxSizing: 'border-box' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: .5, lineHeight: 1.2 }}>
        {lineasLabel.map((l, i) => <div key={i}>{l}</div>)}
      </div>
      <input
        ref={ref}
        type="text" inputMode="numeric" value={value || ''} onChange={handleChange} onBlur={handleBlur}
        placeholder="--:--" maxLength={5}
        style={{ fontSize: 26, fontWeight: 700, color, border: 'none', background: 'transparent', width: '100%', outline: 'none', letterSpacing: 2, padding: 0 }}
      />
      {!sinBoton && (
        <button onClick={setAhora} tabIndex={-1} style={{
          background: variant === 'rosa' ? C.bordo : C.rojo, color: '#fff', border: 'none', borderRadius: 6,
          padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start',
        }}>▶ Ahora</button>
      )}
    </div>
  );
}

export function Textarea({ value, onChange, placeholder, minHeight = 80, variant = 'celeste', expandible = true, onFocus }) {
  const bg = variant === 'rosa' ? C.rosa : C.celeste;
  const border = variant === 'rosa' ? C.rosaBorde : C.celesteBorde;
  const ref = useRef(null);
  const cursor = useRef(null);
  const [expandido, setExpandido] = useState(false);

  // Conserva la posición del cursor al escribir en el medio del texto
  // (sin esto, forzar mayúsculas en cada tecla mandaba el cursor al final).
  useLayoutEffect(() => {
    if (cursor.current != null && ref.current) {
      ref.current.setSelectionRange(cursor.current, cursor.current);
      cursor.current = null;
    }
  }, [value]);

  const handleChange = (e) => {
    cursor.current = e.target.selectionStart;
    onChange(upper(e.target.value));
  };

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={handleChange}
      onFocus={() => { if (expandible) setExpandido(true); onFocus && onFocus(); }}
      onBlur={() => setExpandido(false)}
      placeholder={placeholder}
      style={{
        width: '100%', minHeight: expandido ? minHeight * 2 : minHeight,
        border: `1.5px solid ${border}`, borderRadius: 8, padding: '10px 12px',
        fontSize: 15, fontWeight: 700, color: variant === 'rosa' ? '#000' : C.azul,
        background: bg, resize: 'vertical', fontFamily: 'inherit', outline: 'none',
        boxSizing: 'border-box', transition: 'min-height .15s',
      }}
    />
  );
}

export function Divider() {
  return <div style={{ height: 1, background: C.celesteBorde, margin: '4px 0' }} />;
}

export function BtnNext({ onClick, children, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      flex: 1, height: 50, background: disabled ? '#ccc' : C.azul,
      color: '#fff', border: 'none', borderRadius: 8,
      fontSize: 15, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
    }}>
      {children} →
    </button>
  );
}

// Panel para completar observaciones ítem por ítem: una fila por cada
// elemento de `items`, con un tilde (para corregir el estado ahí mismo) y un
// campo de texto para la observación puntual de ese ítem. Al cerrar, arma
// las líneas "Label: texto" (solo de las filas que se completaron) y las
// agrega al campo de observaciones.
export function PanelCompletarObs({ items, datos, set, obsField, colorBordo, onCerrar }) {
  const [textos, setTextos] = useState({});
  const [campoEnFoco, setCampoEnFoco] = useState(null);
  const bordo = colorBordo ? '#7a1030' : '#0d1f4e';
  const bg = colorBordo ? '#fbdbe1' : '#c6dbf5';

  const confirmar = () => {
    const lineas = items
      .filter(([campo]) => (textos[campo] || '').trim())
      .map(([campo, label]) => `${label.toUpperCase()}: ${textos[campo].trim()}`);
    if (lineas.length) {
      const previo = datos[obsField]?.trim();
      set(obsField)(previo ? `${previo}\n${lineas.join('\n')}` : lineas.join('\n'));
    }
    onCerrar();
  };

  return (
    <div style={{ background: '#f8f9fc', border: `1.5px solid ${bordo}`, borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.length === 0 && (
        <div style={{ fontSize: 12, color: '#666', textAlign: 'center' }}>No hay ítems para completar.</div>
      )}
      {items.map(([campo, label, colorItem]) => {
        // Punto pedido: un ítem puntual (ej. "Partido Suspendido") puede
        // tener SU PROPIO color, distinto del resto de los ítems del
        // mismo panel — si no se especifica, usa el color general.
        const itemBordo = colorItem || bordo;
        const itemBg = colorItem ? '#fbdbe1' : bg;
        const checked = !!datos[campo];
        const expandido = campoEnFoco === campo;
        return (
          <div key={campo} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div onClick={() => set(campo)(!checked)} style={{
              display: 'flex', alignItems: 'center', gap: 10, minHeight: 40, minWidth: 0,
              background: checked ? itemBordo : itemBg, border: `1.5px solid ${itemBordo}`, borderRadius: 8,
              padding: '10px 12px', cursor: 'pointer', userSelect: 'none',
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 4, flexShrink: 0,
                background: checked ? itemBg : '#fff', border: `2px solid ${checked ? itemBg : itemBordo}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {checked && <span style={{ color: itemBordo, fontSize: 14, fontWeight: 700 }}>✓</span>}
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: checked ? '#fff' : itemBordo, textTransform: 'uppercase', minWidth: 0, wordBreak: 'break-word' }}>
                {label}
              </span>
            </div>
            <textarea
              value={textos[campo] || ''}
              onChange={e => setTextos(t => ({ ...t, [campo]: e.target.value.toUpperCase() }))}
              onFocus={() => setCampoEnFoco(campo)}
              onBlur={() => setCampoEnFoco(c => (c === campo ? null : c))}
              placeholder="Observación..."
              style={{
                width: '100%', minHeight: expandido ? 96 : 40, border: `1.5px solid ${itemBordo}`, borderRadius: 8, padding: '10px 12px',
                fontSize: 15, fontWeight: 700, color: '#0d1f4e', background: itemBg, outline: 'none',
                resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'min-height .15s',
              }}
            />
          </div>
        );
      })}
      <button onClick={confirmar} style={{
        alignSelf: 'flex-end', background: bordo, color: '#fff', border: 'none', borderRadius: 6,
        padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', marginTop: 4,
      }}>Listo</button>
    </div>
  );
}

export function BtnBack({ onClick }) {
  return (
    <button onClick={onClick} style={{
      height: 50, width: 50, background: C.celeste, color: C.azul,
      border: `2px solid ${C.celesteBorde}`, borderRadius: 8,
      cursor: 'pointer', padding: 0, lineHeight: 1,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.azul} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M11 6l-6 6 6 6" />
      </svg>
    </button>
  );
}

export function BtnSalir({ onClick }) {
  return (
    <button onClick={onClick} title="Salir" style={{
      height: 50, width: 50, background: '#fadfba', color: '#8a5a10',
      border: '2px solid #c96a1c', borderRadius: 8, padding: 0, lineHeight: 1,
      fontSize: 20, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>🚪</button>
  );
}
