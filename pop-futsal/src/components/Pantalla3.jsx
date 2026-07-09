import { Header, SeccionHeader, HoraInput, CheckAzul, Textarea, Divider, BtnNext, BtnBack } from './UI';
import { MOTIVOS_INICIO, MOTIVOS_ET } from '../data';

const selectStyle = {
  width: '100%', height: 44, border: '1.5px solid #b8c8e8', borderRadius: 8,
  padding: '0 12px', fontSize: 14, color: '#0d1f4e', fontWeight: 600,
  background: '#e8edf8', appearance: 'none', outline: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%230d1f4e' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
};

export default function Pantalla3({ datos, setDatos, onNext, onBack }) {
  const set = (campo) => (valor) => setDatos(d => ({ ...d, [campo]: valor }));

  const handleHoraET = (val) => {
    let v = val.replace(/[^0-9]/g, '');
    set('et_min')(v);
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <Header paso={3} />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

        <SeccionHeader>3. Control de horarios</SeccionHeader>

        {/* Ingreso al campo */}
        <div style={{ fontSize: 11, fontWeight: 700, color: '#0d1f4e', letterSpacing: .5, textTransform: 'uppercase' }}>
          Ingreso al campo de juego
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <HoraInput label="Formación Local" value={datos.ingreso_local || ''} onChange={v => setDatos(d => ({ ...d, ingreso_local: v }))} />
          <HoraInput label="Formación Visita" value={datos.ingreso_visita || ''} onChange={v => setDatos(d => ({ ...d, ingreso_visita: v }))} />
          <HoraInput label="Ingreso campo" value={datos.ingreso} onChange={set('ingreso')} />
        </div>

        <Divider />

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
              {MOTIVOS_INICIO.map(o => <option key={o} value={o}>{o || '— Sin motivo —'}</option>)}
            </select>
          </div>
        )}

        <HoraInput label="Hora de inicio real del partido" value={datos.hora_real} onChange={set('hora_real')} />

        <Divider />

        {/* Primer tiempo */}
        <div style={{ fontSize: 11, fontWeight: 700, color: '#0d1f4e', letterSpacing: .5, textTransform: 'uppercase' }}>Primer tiempo</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <HoraInput label="Final 1° T" value={datos.final_1t} onChange={set('final_1t')} />
          <HoraInput label="Inicio 2° T" value={datos.inicio_2t} onChange={set('inicio_2t')} />
        </div>

        <Divider />

        {/* Entretiempo */}
        <div style={{ fontSize: 11, fontWeight: 700, color: '#0d1f4e', letterSpacing: .5, textTransform: 'uppercase' }}>Entretiempo</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0d1f4e', marginBottom: 4 }}>Duración ET</div>
            <input type="number" value={datos.et_min} onChange={e => set('et_min')(e.target.value)}
              placeholder="0"
              style={{ width: 72, height: 44, border: '1.5px solid #b8c8e8', borderRadius: 8, textAlign: 'center', fontSize: 20, fontWeight: 700, color: '#0d1f4e', background: '#e8edf8', outline: 'none' }} />
            <div style={{ fontSize: 10, color: '#0d1f4e', textAlign: 'center', marginTop: 2, fontWeight: 600 }}>minutos</div>
          </div>
          <div style={{ flex: 1 }}>
            <div onClick={() => set('excedido')(!datos.excedido)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: datos.excedido ? '#fff0f0' : '#fff8f8',
              border: `1.5px solid ${datos.excedido ? '#e03030' : '#f5a0a0'}`,
              borderRadius: 8, padding: '13px 10px', cursor: 'pointer',
            }}>
              <div style={{ width: 22, height: 22, borderRadius: 4, background: datos.excedido ? '#e03030' : '#ffd0d0', border: `2px solid ${datos.excedido ? '#e03030' : '#f5a0a0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {datos.excedido && <span style={{ color: '#fff', fontSize: 14 }}>✓</span>}
              </div>
              <span style={{ fontSize: 13, color: datos.excedido ? '#e03030' : '#c05050', fontWeight: datos.excedido ? 700 : 600 }}>ET excedido</span>
            </div>
          </div>
        </div>

        {datos.excedido && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#e03030', marginBottom: 6 }}>Motivo de demora en entretiempo</div>
            <select style={selectStyle} value={datos.motivo_et} onChange={e => set('motivo_et')(e.target.value)}>
              {MOTIVOS_ET.map(o => <option key={o} value={o}>{o || '— Sin motivo —'}</option>)}
            </select>
          </div>
        )}

        <Divider />

        <HoraInput label="Final del partido" value={datos.final_partido} onChange={set('final_partido')} />

        <Divider />

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
