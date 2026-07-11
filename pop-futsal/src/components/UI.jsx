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

export function Header({ paso, total = 5 }) {
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
          <div key={p} style={{
            flex: 1, textAlign: 'center', fontSize: 10, padding: '4px 2px',
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

export function Input({ value, onChange, placeholder, type = 'text', style = {}, onKeyUp, variant = 'celeste' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(type === 'text' ? upper(e.target.value) : e.target.value)}
      onKeyUp={onKeyUp}
      placeholder={placeholder}
      style={{ ...baseStyle(variant), ...style }}
    />
  );
}

export function Select({ value, onChange, options, placeholder, variant = 'celeste' }) {
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
      }}
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// Checkbox azul - para items normales (instalaciones, etc.)
// Sin marcar: fondo celeste, casillero blanco. Marcado: fondo azul, casillero celeste.
export function CheckAzul({ label, checked, onChange }) {
  return (
    <div onClick={() => onChange(!checked)} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: checked ? C.azul : C.celeste,
      border: `1.5px solid ${C.azul}`,
      borderRadius: 8, padding: '12px 10px', cursor: 'pointer',
      userSelect: 'none', transition: 'all .15s',
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: 4, flexShrink: 0,
        background: checked ? C.celeste : '#fff',
        border: `2px solid ${checked ? C.celeste : C.azul}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {checked && <span style={{ color: C.azul, fontSize: 14, lineHeight: 1, fontWeight: 700 }}>✓</span>}
      </div>
      <span style={{ fontSize: 13, color: checked ? '#fff' : C.azul, lineHeight: 1.2, fontWeight: 600, textTransform: 'uppercase' }}>
        {label}
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

export function HoraInput({ value, onChange, label, variant = 'celeste' }) {
  const bg = variant === 'rosa' ? C.rosa : C.celeste;
  const border = variant === 'rosa' ? C.rosaBorde : C.celesteBorde;
  const setAhora = () => {
    const now = new Date();
    onChange(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
  };
  const handleChange = (val) => {
    // Auto-formato: al escribir 4 dígitos agrega ':'
    let v = val.replace(/[^0-9]/g, '');
    if (v.length >= 3) v = v.slice(0, 2) + ':' + v.slice(2, 4);
    onChange(v);
  };
  return (
    <div style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: variant === 'rosa' ? '#000' : C.azul, textTransform: 'uppercase', letterSpacing: .5 }}>{label}</div>
      <input
        type="text" value={value}
        onChange={e => handleChange(e.target.value)}
        placeholder="--:--" maxLength={5}
        style={{ fontSize: 26, fontWeight: 700, color: variant === 'rosa' ? '#000' : C.azul, border: 'none', background: 'transparent', width: '100%', outline: 'none', letterSpacing: 2 }}
      />
      <button onClick={setAhora} style={{
        background: variant === 'rosa' ? C.bordo : C.rojo, color: '#fff', border: 'none', borderRadius: 6,
        padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start',
      }}>▶ Ahora</button>
    </div>
  );
}

export function Textarea({ value, onChange, placeholder, minHeight = 80, variant = 'celeste' }) {
  const bg = variant === 'rosa' ? C.rosa : C.celeste;
  const border = variant === 'rosa' ? C.rosaBorde : C.celesteBorde;
  return (
    <textarea value={value} onChange={e => onChange(upper(e.target.value))} placeholder={placeholder}
      style={{ width: '100%', minHeight, border: `1.5px solid ${border}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, color: variant === 'rosa' ? '#000' : C.azul, background: bg, resize: 'vertical', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
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

export function BtnBack({ onClick }) {
  return (
    <button onClick={onClick} style={{
      height: 50, width: 50, background: C.celeste, color: C.azul,
      border: `2px solid ${C.celesteBorde}`, borderRadius: 8,
      fontSize: 22, fontWeight: 900, cursor: 'pointer', padding: 0, lineHeight: 1,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>←</button>
  );
}

export function BtnSalir({ onClick }) {
  return (
    <button onClick={onClick} title="Salir" style={{
      height: 50, width: 50, background: '#f2811d', color: '#fff',
      border: `2px solid ${C.naranja}`, borderRadius: 8, padding: 0, lineHeight: 1,
      fontSize: 20, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>🚪</button>
  );
}
