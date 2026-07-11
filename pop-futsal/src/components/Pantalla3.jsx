import { useEffect } from 'react';
import { Header, SeccionHeader, HoraInput, CheckAzul, Textarea, BtnNext, BtnBack } from './UI';

const selectStyle = {
  width: '100%', height: 44, border: '1.5px solid #0d1f4e', borderRadius: 8,
  padding: '0 12px', fontSize: 14, color: '#0d1f4e', fontWeight: 600,
  background: '#c6dbf5', appearance: 'none', outline: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%230d1f4e' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
};

// Calcula minutos entre dos horas "HH:MM". Si inicio_2t < final_1t asume que cruzó la hora.
function calcularMinutos(inicio, fin) {
  if (!inicio || !fin || !inicio.includes(':') || !fin.includes(':')) return '';
  const [h1, m1] = inicio.split(':').map(Number);
  const [h2, m2] = fin.split(':').map(Number);
  if ([h1, m1, h2, m2].some(n => Number.isNaN(n))) return '';
  let mins = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (mins < 0) mins += 24 * 60;
  return String(mins);
}

export default function Pantalla3({ datos, setDatos, onNext, onBack, listas }) {
  const set = (campo) => (valor) => setDatos(d => ({ ...d, [campo]: valor }));

  // ET = Inicio 2°T - Final 1°T, se recalcula solo
  useEffect(() => {
    const calculado = calcularMinutos(datos.final_1t, datos.inicio_2t);
    if (calculado !== datos.et_min) set('et_min')(calculado);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos.final_1t, datos.inicio_2t]);

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <Header paso={3} />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

        <SeccionHeader>3. Control de horarios</SeccionHeader>

        {/* Ingreso al campo */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <HoraInput label="Formación Local" value={datos.ingreso_local || ''} onChange={v => setDatos(d => ({ ...d, ingreso_local: v }))} />
          <HoraInput label="Formación Visita" value={datos.ingreso_visita || ''} onChange={v => setDatos(d => ({ ...d, ingreso_visita: v }))} />
          <HoraInput label="Ingreso campo" value={datos.ingreso} onChange={set('ingreso')} />
        </div>

        {/* Protocolo y comienzo */}
        <CheckAzul label="Protocolo de inicio cumplido" checked={datos.protocolo} onChange={set('protocolo')} />

        <div style={{ fontSize: 11, fontWeight: 700, color: '#0d1f4e', letterSpacing: .5, textTransform: 'uppercase' }}>
          ¿Comenzó en hora?
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['si', 'SI', '#1a7a3a', '#e8f5ee'], ['no', 'NO', '#e03030', '#fff0f0']].map(([val, label, color, bg]) => (
            <button key={val}
              onClick={() => set('comenzo_si')(datos.comenzo_si === val ? null : val)}
              style={{
                flex: 1, height: 50, borderRadius: 8,
                border: `2px solid ${datos.comenzo_si === val ? color : '#b8c8e8'}`,
                background: datos.comenzo_si === val ? color : bg,
                color: datos.comenzo_si === val ? '#fff' : color,
                fontSize: 16, fontWeight: 700, cursor: 'pointer',
              }}
            >{label}</button>
          ))}
        </div>

        {datos.comenzo_si === 'no' && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#e03030', marginBottom: 6 }}>Motivo de demora de inicio</div>
            <select style={selectStyle} value={datos.motivo_inicio} onChange={e => set('motivo_inicio')(e.target.value)}>
              {listas.motivosInicio.map(o => <option key={o} value={o}>{o || '— Sin motivo —'}</option>)}
            </select>
          </div>
        )}

        {/* Hora real de inicio + Primer tiempo, todo en una línea */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <HoraInput label="Inicio Real" value={datos.hora_real} onChange={set('hora_real')} />
          <HoraInput label="Final 1° T" value={datos.final_1t} onChange={set('final_1t')} />
          <HoraInput label="Inicio 2° T" value={datos.inicio_2t} onChange={set('inicio_2t')} />
        </div>

        {/* Entretiempo */}
        <div style={{ fontSize: 11, fontWeight: 700, color: '#0d1f4e', letterSpacing: .5, textTransform: 'uppercase' }}>Entretiempo</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid #0d1f4e', borderRadius: 8, padding: '8px 10px', background: '#c6dbf5' }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#0d1f4e' }}>{datos.et_min || '—'}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#0d1f4e' }}>min. ET</span>
          </div>
          <div onClick={() => set('excedido')(!datos.excedido)} style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 8,
            background: datos.excedido ? '#8f1010' : '#fff',
            border: '1.5px solid #e03030',
            borderRadius: 8, padding: '10px', cursor: 'pointer',
          }}>
            <div style={{ width: 20, height: 20, borderRadius: 4, background: datos.excedido ? '#fff' : '#fbdbe1', border: `2px solid ${datos.excedido ? '#fff' : '#e03030'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {datos.excedido && <span style={{ color: '#8f1010', fontSize: 13, fontWeight: 700 }}>✓</span>}
            </div>
            <span style={{ fontSize: 12, color: datos.excedido ? '#fff' : '#e03030', fontWeight: 700, textTransform: 'uppercase' }}>Excedido</span>
          </div>
        </div>

        {datos.excedido && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#e03030', marginBottom: 6 }}>Motivo de demora en entretiempo</div>
            <select style={selectStyle} value={datos.motivo_et} onChange={e => set('motivo_et')(e.target.value)}>
              {listas.motivosET.map(o => <option key={o} value={o}>{o || '— Sin motivo —'}</option>)}
            </select>
          </div>
        )}

        <HoraInput label="Final del partido" value={datos.final_partido} onChange={set('final_partido')} />

        <div style={{ fontSize: 11, fontWeight: 700, color: '#0d1f4e', letterSpacing: .5, textTransform: 'uppercase' }}>Observaciones de horarios</div>
        <Textarea value={datos.obs_horarios} onChange={set('obs_horarios')} placeholder="Observaciones sobre horarios..." />

      </div>
      <div style={{ padding: '8px 16px 24px', display: 'flex', gap: 10 }}>
        <BtnBack onClick={onBack} />
        <BtnNext onClick={onNext}>Siguiente: Observaciones</BtnNext>
      </div>
    </div>
  );
}
