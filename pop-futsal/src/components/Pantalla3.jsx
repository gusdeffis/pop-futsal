import { useEffect } from 'react';
import { Header, SeccionHeader, HoraInput, CheckAzul, Textarea, BtnNext, BtnBack } from './UI';

const selectStyle = {
  width: '100%', height: 44, border: '1.5px solid #c96a1c', borderRadius: 8,
  padding: '0 12px', fontSize: 14, color: '#0d1f4e', fontWeight: 600,
  background: '#fadfba', appearance: 'none', outline: 'none',
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

// Suma (o resta, con minutos negativos) minutos a una hora "HH:MM".
function sumarMinutos(hora, minutos) {
  if (!hora || !hora.includes(':')) return '';
  const [h, m] = hora.split(':').map(Number);
  if ([h, m].some(Number.isNaN)) return '';
  let total = (h * 60 + m + minutos + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// Minutos de demora contra una hora de referencia (nunca negativo: si llegó
// antes o justo, la demora es 0).
function calcularDemoraContra(horaReferencia, horaReal) {
  if (!horaReferencia || !horaReal || !horaReferencia.includes(':') || !horaReal.includes(':')) return '';
  const [h1, m1] = horaReferencia.split(':').map(Number);
  const [h2, m2] = horaReal.split(':').map(Number);
  if ([h1, m1, h2, m2].some(Number.isNaN)) return '';
  const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
  return String(Math.max(0, mins));
}

export default function Pantalla3({ datos, setDatos, onNext, onBack, listas }) {
  const set = (campo) => (valor) => setDatos(d => ({ ...d, [campo]: valor }));

  // ET = Inicio 2°T - Final 1°T, se recalcula solo. Excedido = ET > 11 min,
  // ya no es un check manual, se resalta solo.
  useEffect(() => {
    const calculado = calcularMinutos(datos.final_1t, datos.inicio_2t);
    if (calculado !== datos.et_min) set('et_min')(calculado);
    const excedidoCalc = calculado !== '' && Number(calculado) > 11;
    if (excedidoCalc !== datos.excedido) set('excedido')(excedidoCalc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos.final_1t, datos.inicio_2t]);

  // Demora de Formación (ingreso al campo antes de arrancar): se espera 5
  // minutos antes de la Hora establecida del partido (no la hora real).
  useEffect(() => {
    const refFormacion = sumarMinutos(datos.hora, -5);
    const demL = calcularDemoraContra(refFormacion, datos.ingreso_local);
    const demV = calcularDemoraContra(refFormacion, datos.ingreso_visita);
    if (demL !== datos.ingreso_local_dem) set('ingreso_local_dem')(demL);
    if (demV !== datos.ingreso_visita_dem) set('ingreso_visita_dem')(demV);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos.hora, datos.ingreso_local, datos.ingreso_visita]);

  // Demora de Regreso post-entretiempo: se espera que vuelvan a los 10
  // minutos del Final del 1er Tiempo (tolerancia para empezar el 2°T).
  useEffect(() => {
    const refRegreso = sumarMinutos(datos.final_1t, 10);
    const demL = calcularDemoraContra(refRegreso, datos.regreso_local);
    const demV = calcularDemoraContra(refRegreso, datos.regreso_visita);
    if (demL !== datos.regreso_local_dem) set('regreso_local_dem')(demL);
    if (demV !== datos.regreso_visita_dem) set('regreso_visita_dem')(demV);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos.final_1t, datos.regreso_local, datos.regreso_visita]);

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

        <div style={{ fontSize: 12, fontWeight: 700, color: '#0d1f4e', letterSpacing: .5, textTransform: 'uppercase' }}>
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
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0d1f4e', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 }}>Motivo de demora de inicio de partido</div>
            <select style={selectStyle} value={datos.motivo_inicio} onChange={e => {
              set('motivo_inicio')(e.target.value);
              set('motivo_inicio_pdf')(listas.motivosInicioMapa?.[e.target.value] || e.target.value);
            }}>
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

        {/* Regreso de cada equipo para el 2do tiempo + Entretiempo calculado */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <HoraInput label="Regreso Local" value={datos.regreso_local} onChange={set('regreso_local')} />
          <HoraInput label="Regreso Visita" value={datos.regreso_visita} onChange={set('regreso_visita')} />
          <div style={{ background: '#c6dbf5', border: '1.5px solid #0d1f4e', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0d1f4e', textTransform: 'uppercase', letterSpacing: .5 }}>Entretiempo</div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              borderRadius: 8, padding: '4px 12px',
              background: datos.et_min === '' ? 'transparent' : (Number(datos.et_min) <= 11 ? '#1a7a3a' : '#e03030'),
            }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: datos.et_min === '' ? '#0d1f4e' : '#fff' }}>{datos.et_min || '—'}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: datos.et_min === '' ? '#0d1f4e' : '#fff' }}>min.</span>
            </div>
            {datos.excedido && (
              <div style={{ background: '#e03030', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5, textTransform: 'uppercase', letterSpacing: .3 }}>
                Excedido
              </div>
            )}
          </div>
        </div>

        {datos.excedido && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0d1f4e', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 }}>Motivo de demora del entretiempo</div>
            <select style={selectStyle} value={datos.motivo_et} onChange={e => {
              set('motivo_et')(e.target.value);
              set('motivo_et_pdf')(listas.motivosETMapa?.[e.target.value] || e.target.value);
            }}>
              {listas.motivosET.map(o => <option key={o} value={o}>{o || '— Sin motivo —'}</option>)}
            </select>
          </div>
        )}

        <HoraInput label="Final del partido" value={datos.final_partido} onChange={set('final_partido')} />

        <div style={{ fontSize: 12, fontWeight: 700, color: '#0d1f4e', letterSpacing: .5, textTransform: 'uppercase' }}>Observaciones de horarios</div>
        <Textarea value={datos.obs_horarios} onChange={set('obs_horarios')} placeholder="Observaciones sobre horarios..." />

      </div>
      <div style={{ padding: '8px 16px 24px', display: 'flex', gap: 10 }}>
        <BtnBack onClick={onBack} />
        <BtnNext onClick={onNext}>Siguiente: Observaciones</BtnNext>
      </div>
    </div>
  );
}
