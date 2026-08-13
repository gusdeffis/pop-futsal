import { useEffect } from 'react';
import { Header, SeccionHeader, HoraInput, CheckAzul, Textarea, BtnNext, BtnBack } from './UI';
import { generarBloqueDesvios } from '../utils/desviosHorarios';

const selectStyle = {
  width: '100%', height: 44, border: '1.5px solid #c96a1c', borderRadius: 8,
  padding: '0 12px', fontSize: 14, color: '#0d1f4e', fontWeight: 600,
  background: '#fadfba', appearance: 'none', outline: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%230d1f4e' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
};

// Recuadro compartido para "Demora Inicio/Partido" y "Entretiempo" — mismo
// criterio de color en los dos: celeste mientras no hay dato, verde pastel
// si está en horario/dentro del límite, naranja pastel + número en blanco
// con píldora roja si está excedido/con demora, e igual placa "Excedido"
// abajo en ese caso. `textoEnHora`, si se pasa, reemplaza el número por ese
// texto cuando está OK (ej. "en hora"); si no, se muestra el número tal cual.
function RecuadroDemora({ titulo, valor, excedido, textoEnHora, sufijo = 'min.', minHeight }) {
  const vacio = valor === '' || valor == null;
  return (
    <div style={{
      background: vacio ? '#c6dbf5' : (excedido ? '#fadfba' : '#c8ecd4'),
      border: `1.5px solid ${vacio ? '#0d1f4e' : (excedido ? '#c96a1c' : '#1a7a3a')}`, borderRadius: 10, padding: 12,
      display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', justifyContent: 'center',
      minHeight, boxSizing: 'border-box',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#0d1f4e', textTransform: 'uppercase', letterSpacing: .5, textAlign: 'center' }}>{titulo}</div>
      {!vacio && !excedido && textoEnHora ? (
        <span style={{ fontSize: 20, fontWeight: 700, color: '#0d1f4e' }}>{textoEnHora}</span>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          borderRadius: 8, padding: '4px 12px',
          background: vacio ? 'transparent' : (excedido ? '#e03030' : '#1a7a3a'),
        }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: vacio ? '#0d1f4e' : '#fff' }}>{vacio ? '—' : valor}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: vacio ? '#0d1f4e' : '#fff' }}>{sufijo}</span>
        </div>
      )}
      {excedido && (
        <div style={{ background: '#e03030', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5, textTransform: 'uppercase', letterSpacing: .3 }}>
          Excedido
        </div>
      )}
    </div>
  );
}

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

// Altura pareja para los 9 recuadros de horario de esta pantalla (Inicio
// Real, Desvío Inicio Partido, Final 1°T, Regreso Local/Visita, Inicio 2°T,
// Entretiempo, Final del Partido, Duración) — algunos tienen botón "Ahora"
// y otros no, así que sin un alto fijo común quedaban desparejos.
const ALTO_RECUADRO_HORARIO = 112;

export default function Pantalla3({ datos, setDatos, onNext, onBack, listas, onIrA }) {
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

  // Desvío de Inicio de Partido: Hora establecida vs Hora Real de inicio.
  useEffect(() => {
    const calculado = calcularDemoraContra(datos.hora, datos.hora_real);
    if (calculado !== datos.desvio_inicio) set('desvio_inicio')(calculado);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos.hora, datos.hora_real]);

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

  // Demora de Regreso post-entretiempo: se espera que vuelvan a los 11
  // minutos del Final del 1er Tiempo (mismo criterio de tolerancia que usa
  // "Entretiempo Excedido" en el resto de la app).
  useEffect(() => {
    const refRegreso = sumarMinutos(datos.final_1t, 11);
    const demL = calcularDemoraContra(refRegreso, datos.regreso_local);
    const demV = calcularDemoraContra(refRegreso, datos.regreso_visita);
    if (demL !== datos.regreso_local_dem) set('regreso_local_dem')(demL);
    if (demV !== datos.regreso_visita_dem) set('regreso_visita_dem')(demV);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos.final_1t, datos.regreso_local, datos.regreso_visita]);

  // Duración del partido: Final del partido - Inicio Real, formato "H:MM hs"
  useEffect(() => {
    if (!datos.hora_real?.includes(':') || !datos.final_partido?.includes(':')) {
      if (datos.duracion_partido !== '') set('duracion_partido')('');
      return;
    }
    const [h1, m1] = datos.hora_real.split(':').map(Number);
    const [h2, m2] = datos.final_partido.split(':').map(Number);
    if ([h1, m1, h2, m2].some(Number.isNaN)) return;
    let mins = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (mins < 0) mins += 24 * 60;
    const texto = `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')} hs`;
    if (texto !== datos.duracion_partido) set('duracion_partido')(texto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos.hora_real, datos.final_partido]);

  // Los desvíos automáticos (planillas, formación, entretiempo excedido) ya
  // no se escriben acá adentro del campo de Observaciones — se calculan
  // aparte y se muestran como vista previa (más abajo), y recién se
  // combinan con lo que el Oficial escriba a mano al generar el Acta/PDF.
  const desviosDetectados = generarBloqueDesvios(datos);

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <Header paso={3} onIrA={onIrA} />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

        <SeccionHeader>3. Control de horarios</SeccionHeader>

        {/* Ingreso al campo */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <HoraInput label="Formación Local" value={datos.ingreso_local || ''} onChange={v => setDatos(d => ({ ...d, ingreso_local: v }))}
            variant={Number(datos.ingreso_local_dem) > 0 ? 'naranja' : 'celeste'} />
          <HoraInput label="Formación Visita" value={datos.ingreso_visita || ''} onChange={v => setDatos(d => ({ ...d, ingreso_visita: v }))}
            variant={Number(datos.ingreso_visita_dem) > 0 ? 'naranja' : 'celeste'} />
          <HoraInput label="Ingreso al Campo" value={datos.ingreso} onChange={set('ingreso')} />
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

        {/* Fila 1: Inicio Real | Desvío Inicio Partido | Final 1° T */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <HoraInput label={['Inicio', 'Real']} value={datos.hora_real} onChange={set('hora_real')} minHeight={ALTO_RECUADRO_HORARIO} />
          <RecuadroDemora
            titulo="Demora Inicio/Partido"
            valor={datos.desvio_inicio}
            excedido={datos.desvio_inicio !== '' && Number(datos.desvio_inicio) > 1}
            textoEnHora="en hora"
            minHeight={ALTO_RECUADRO_HORARIO}
          />
          <HoraInput label={['Final', '1°T']} value={datos.final_1t} onChange={set('final_1t')} minHeight={ALTO_RECUADRO_HORARIO} />
        </div>

        {/* Fila 2: Regreso Local | Regreso Visita | Inicio 2° T */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <HoraInput label="Regreso Local" value={datos.regreso_local} onChange={set('regreso_local')} minHeight={ALTO_RECUADRO_HORARIO}
            variant={Number(datos.regreso_local_dem) > 0 ? 'naranja' : 'celeste'} />
          <HoraInput label="Regreso Visita" value={datos.regreso_visita} onChange={set('regreso_visita')} minHeight={ALTO_RECUADRO_HORARIO}
            variant={Number(datos.regreso_visita_dem) > 0 ? 'naranja' : 'celeste'} />
          <HoraInput label={['Inicio', '2°T']} value={datos.inicio_2t} onChange={set('inicio_2t')} minHeight={ALTO_RECUADRO_HORARIO} />
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

        {/* Fila 3: Entretiempo | Final del Partido | Duración */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <RecuadroDemora
            titulo="Entretiempo"
            valor={datos.et_min}
            excedido={datos.excedido}
            minHeight={ALTO_RECUADRO_HORARIO}
          />
          <HoraInput label="Final del partido" value={datos.final_partido} onChange={set('final_partido')} minHeight={ALTO_RECUADRO_HORARIO} />
          <div style={{ background: '#c6dbf5', border: '1.5px solid #0d1f4e', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', justifyContent: 'center', minHeight: ALTO_RECUADRO_HORARIO, boxSizing: 'border-box' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0d1f4e', textTransform: 'uppercase', letterSpacing: .5, lineHeight: 1.2, textAlign: 'center' }}>
              <div>Duración</div><div>del Partido</div>
            </div>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#0d1f4e' }}>{datos.duracion_partido || '—'}</span>
          </div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: '#0d1f4e', letterSpacing: .5, textTransform: 'uppercase' }}>Observaciones de horarios</div>
        {desviosDetectados.length > 0 && (
          <div style={{ background: '#fff3cd', border: '1.5px solid #e0b84a', borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#8a5a10', textTransform: 'uppercase', marginBottom: 4 }}>
              ⚠️ Detectado automáticamente (se suma solo al Acta y al PDF, no hace falta escribirlo acá)
            </div>
            {desviosDetectados.map((linea, i) => (
              <div key={i} style={{ fontSize: 12, fontWeight: 600, color: '#8a5a10' }}>{linea}</div>
            ))}
          </div>
        )}
        <Textarea value={datos.obs_horarios} onChange={set('obs_horarios')} placeholder="Observaciones sobre horarios..." />

      </div>
      <div style={{ padding: '8px 16px 24px', display: 'flex', gap: 10 }}>
        <BtnBack onClick={onBack} />
        <BtnNext onClick={onNext}>Siguiente: Observaciones</BtnNext>
      </div>
    </div>
  );
}
