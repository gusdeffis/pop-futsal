const C = {
  azul: '#0d1f4e',
  rojo: '#e03030',
  borde: '#dde1ec',
  fondo: '#f8f9fc',
  texto: '#222',
  textoSec: '#666',
};

export function Header({ paso }) {
  const pasos = ['Datos', 'Control', 'Horarios', 'Acta'];
  return (
    <div>
      <div style={{ background: C.azul, padding: '12px 16px', display: 'flex', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontSize: 11, opacity: .7, letterSpacing: .5 }}>AFA FUTSAL · TEMPORADA 2026</div>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>POP - Planilla Oficial de Partido</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,.15)', color: '#fff', fontSize: 11, padding: '3px 8px', borderRadius: 20 }}>
          {paso} / 4
        </div>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,.2)', backgroundColor: C.azul }}>
        <div style={{ height: 3, background: C.rojo, width: `${paso * 25}%`, transition: 'width .3s' }} />
      </div>
      <div style={{ display: 'flex', background: C.azul, padding: '0 16px 10px' }}>
        {pasos.map((p, i) => (
          <div key={p} style={{
            flex: 1, textAlign: 'center', fontSize: 11, padding: '4px 0',
            borderBottom: i + 1 === paso ? `2px solid ${C.rojo}` : '2px solid transparent',
            color: i + 1 === paso ? '#fff' : i + 1 < paso ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.4)',
            fontWeight: i + 1 === paso ? 600 : 400,
          }}>{p}</div>
        ))}
      </div>
    </div>
  );
}

export function SeccionHeader({ children, rojo }) {
  return (
    <div style={{
      background: rojo ? C.rojo : C.azul,
      color: '#fff', fontSize: 11, fontWeight: 600,
      letterSpacing: .6, padding: '7px 12px', borderRadius: 6,
    }}>{children}</div>
  );
}

export function SeccionSub({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 600, color: '#999', letterSpacing: .8, textTransform: 'uppercase', marginBottom: 10 }}>
      {children}
    </div>
  );
}

export function Campo({ label, children, required }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 13, color: C.textoSec, fontWeight: 500 }}>
        {label}{required && <span style={{ color: C.rojo, fontSize: 10, marginLeft: 4 }}>obligatorio</span>}
      </label>
      {children}
    </div>
  );
}

const inputBase = {
  height: 46, border: `1.5px solid #dde1ec`, borderRadius: 8,
  padding: '0 12px', fontSize: 15, color: '#222',
  background: '#f8f9fc', width: '100%', outline: 'none',
  boxSizing: 'border-box',
};

export function Input({ value, onChange, placeholder, type = 'text', style = {} }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ ...inputBase, ...style }}
      onFocus={e => e.target.style.borderColor = C.azul}
      onBlur={e => e.target.style.borderColor = '#dde1ec'}
    />
  );
}

export function Select({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        ...inputBase,
        color: value ? '#222' : '#aaa',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
        backgroundSize: '16px',
      }}
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

export function CheckItem({ label, checked, onChange, rojo }) {
  const color = rojo ? C.rojo : C.azul;
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: checked ? (rojo ? '#fdf0f0' : '#eef1fa') : C.fondo,
        border: `1.5px solid ${checked ? color : C.borde}`,
        borderRadius: 8, padding: '13px 10px', cursor: 'pointer',
        userSelect: 'none', transition: 'all .15s',
      }}
    >
      <div style={{
        width: 22, height: 22, borderRadius: 4, flexShrink: 0,
        background: checked ? color : 'transparent',
        border: `2px solid ${checked ? color : '#bbb'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {checked && <span style={{ color: '#fff', fontSize: 14, lineHeight: 1 }}>✓</span>}
      </div>
      <span style={{ fontSize: 13, color: checked ? color : C.texto, lineHeight: 1.2, fontWeight: checked ? 500 : 400 }}>
        {label}
      </span>
    </div>
  );
}

export function LVChip({ label, checked, onChange }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        border: `1.5px solid ${checked ? C.rojo : C.borde}`,
        borderRadius: 6, padding: '7px 14px',
        background: checked ? '#fdf0f0' : C.fondo,
        cursor: 'pointer', fontSize: 13, fontWeight: 500,
        color: checked ? C.rojo : C.textoSec,
      }}
    >
      <div style={{
        width: 16, height: 16, borderRadius: 3, flexShrink: 0,
        background: checked ? C.rojo : 'transparent',
        border: `2px solid ${checked ? C.rojo : '#bbb'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {checked && <span style={{ color: '#fff', fontSize: 11 }}>✓</span>}
      </div>
      {label}
    </div>
  );
}

export function HoraInput({ value, onChange, label }) {
  const setAhora = () => {
    const now = new Date();
    onChange(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
  };
  const formatHora = (val) => {
    let v = val.replace(/[^0-9]/g, '');
    if (v.length >= 3) v = v.slice(0, 2) + ':' + v.slice(2, 4);
    return v;
  };
  return (
    <div style={{ background: C.fondo, border: `1.5px solid ${C.borde}`, borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: '#999', textTransform: 'uppercase', letterSpacing: .6 }}>{label}</div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(formatHora(e.target.value))}
        placeholder="--:--"
        maxLength={5}
        style={{ fontSize: 28, fontWeight: 500, color: C.texto, border: 'none', background: 'transparent', width: '100%', outline: 'none', letterSpacing: 1 }}
      />
      <button
        onClick={setAhora}
        style={{ background: C.rojo, color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start' }}
      >
        ▶ Ahora
      </button>
    </div>
  );
}

export function Textarea({ value, onChange, placeholder, minHeight = 80 }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: '100%', minHeight, border: `1.5px solid ${C.borde}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, color: C.texto, background: C.fondo, resize: 'vertical', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
      onFocus={e => e.target.style.borderColor = C.azul}
      onBlur={e => e.target.style.borderColor = C.borde}
    />
  );
}

export function Divider() {
  return <div style={{ height: 1, background: '#eee' }} />;
}

export function BtnNext({ onClick, children, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1, height: 52, background: disabled ? '#ccc' : C.azul,
        color: '#fff', border: 'none', borderRadius: 8,
        fontSize: 15, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}
    >
      {children} →
    </button>
  );
}

export function BtnBack({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 52, width: 52, background: C.fondo, color: C.texto,
        border: `1.5px solid ${C.borde}`, borderRadius: 8,
        fontSize: 20, cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}
    >
      ←
    </button>
  );
}
