import { Header, SeccionHeader, SeccionSub, HoraInput, CheckItem, Textarea, Divider, BtnNext, BtnBack } from './UI';
import { MOTIVOS_INICIO, MOTIVOS_ET } from '../data';

const selectStyle = {
  width: '100%', height: 46, border: '1.5px solid #dde1ec', borderRadius: 8,
  padding: '0 12px', fontSize: 14, color: '#222', background: '#f8f9fc',
  appearance: 'none', outline: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
};

export default function Pantalla3({ datos, setDatos, onNext, onBack }) {
  const set = (campo) => (valor) => setDatos(d => ({ ...d, [campo]: valor }));

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <Header paso={3} />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SeccionHeader>3. Control de horarios</SeccionHeader>

        <div>
          <SeccionSub>Ingreso al campo</SeccionSub>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <HoraInput label="Ingreso" value={datos.ingreso} onChange={set('ingreso')} />
            <HoraInput label="Hora Real inicio" value={datos.hora_real} onChange={set('hora_real')} />
          </div>
        </div>

        <Divider />

        <div>
          <SeccionSub>Protocolo de inicio</SeccionSub>
          <CheckItem label="Protocolo de inicio cumplido" checked={datos.protocolo} onChange={set('protocolo')} />
        </div>

        <div>
          <SeccionSub>¿Comenzó en hora?</SeccionSub>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['si', 'SI', '#1a7a3a'], ['no', 'NO', '#e03030']].map(([val, label, color]) => (
              <button key={val}
                onClick={() => set('comenzo_si')(datos.comenzo_si === val ? null : val)}
                style={{
                  flex: 1, height: 52, borderRadius: 8,
                  border: `2px solid ${datos.comenzo_si === val ? color : '#dde1ec'}`,
                  background: datos.comenzo_si === val ? color : '#f8f9fc',
                  color: datos.comenzo_si === val ? '#fff' : '#666',
                  fontSize: 16, fontWeight: 700, cursor: 'pointer',
                }}
              >{label}</button>
            ))}
          </div>
          {datos.comenzo_si === 'no' && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, color: '#666', fontWeight: 500, marginBottom: 4 }}>Motivo de demora de inicio</div>
              <select style={selectStyle} value={datos.motivo_inicio} onChange={e => set('motivo_inicio')(e.target.value)}>
                {MOTIVOS_INICIO.map(o => <option key={o} value={o}>{o || '— Sin motivo —'}</option>)}
              </select>
            </div>
          )}
        </div>

        <Divider />

        <div>
          <SeccionSub>Primer tiempo</SeccionSub>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <HoraInput label="Final 1° T" value={datos.final_1t} onChange={set('final_1t')} />
            <HoraInput label="Inicio 2° T" value={datos.inicio_2t} onChange={set('inicio_2t')} />
          </div>
        </div>

        <Divider />

        <div>
          <SeccionSub>Entretiempo</SeccionSub>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: '#666', fontWeight: 500, marginBottom: 4 }}>Duración ET</div>
              <input type="number" value={datos.et_min} onChange={e => set('et_min')(e.target.value)}
                placeholder="0"
                style={{ width: 72, height: 46, border: '1.5px solid #dde1ec', borderRadius: 8, textAlign: 'center', fontSize: 20, fontWeight: 600, color: '#222', background: '#f8f9fc', outline: 'none' }} />
              <div style={{ fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 2 }}>minutos</div>
            </div>
            <div style={{ flex: 1 }}>
              <CheckItem label="ET excedido" checked={datos.excedido} onChange={set('excedido')} rojo />
            </div>
          </div>
          {datos.excedido && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, color: '#666', fontWeight: 500, marginBottom: 4 }}>Motivo de demora en entretiempo</div>
              <select style={selectStyle} value={datos.motivo_et} onChange={e => set('motivo_et')(e.target.value)}>
                {MOTIVOS_ET.map(o => <option key={o} value={o}>{o || '— Sin motivo —'}</option>)}
              </select>
            </div>
          )}
        </div>

        <Divider />

        <div>
          <SeccionSub>Cierre del partido</SeccionSub>
          <HoraInput label="Final del partido" value={datos.final_partido} onChange={set('final_partido')} />
        </div>

        <Divider />

        <div>
          <SeccionSub>Observaciones de horarios</SeccionSub>
          <Textarea value={datos.obs_horarios} onChange={set('obs_horarios')} placeholder="Observaciones sobre horarios..." />
        </div>
      </div>

      <div style={{ padding: '8px 16px 24px', display: 'flex', gap: 10 }}>
        <BtnBack onClick={onBack} />
        <BtnNext onClick={onNext}>Siguiente: Acta final</BtnNext>
      </div>
    </div>
  );
}
