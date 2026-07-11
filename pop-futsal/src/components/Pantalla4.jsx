import { Header, SeccionHeader, CheckRojo, LVRojo, Textarea, BtnNext, BtnBack } from './UI';

const BORDO = '#7a1030';
const ROSA = '#fbdbe1';

export default function Pantalla4({ datos, setDatos, onNext, onBack }) {
  const set = (campo) => (valor) => setDatos(d => ({ ...d, [campo]: valor }));

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <Header paso={4} />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

        <SeccionHeader rojo>4. Observaciones durante el partido</SeccionHeader>
        <div style={{ background: '#e03030', color: '#fff', fontWeight: 700, fontSize: 12, padding: '8px 12px', borderRadius: 6, textAlign: 'center', textTransform: 'uppercase', letterSpacing: .5 }}>
          Marcar si hay incumplimiento o problema
        </div>

        {/* Mesa cronometraje */}
        <div style={{ fontSize: 12, fontWeight: 700, color: BORDO, letterSpacing: .5, textTransform: 'uppercase' }}>
          Mesa de cronometraje y servicios
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <CheckRojo label="Tablero con fallas" checked={datos.tablero_fallas} onChange={set('tablero_fallas')} />
          <CheckRojo label="Sin balón de back-up" checked={datos.sin_balon} onChange={set('sin_balon')} />
          <CheckRojo label="Sin Médico" checked={datos.medico_obs} onChange={set('medico_obs')} />
          <CheckRojo label="Sin Policía" checked={datos.policia} onChange={set('policia')} />
        </div>

        {/* Calentamiento suplentes - checkbox maestro que despliega el detalle */}
        <div style={{ fontSize: 12, fontWeight: 700, color: BORDO, letterSpacing: .5, textTransform: 'uppercase' }}>
          Calentamiento suplentes
        </div>
        <CheckRojo label="Hubo incumplimiento en el calentamiento de suplentes" checked={datos.calent_supl} onChange={set('calent_supl')} />

        {datos.calent_supl && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              ['fuera_zona_l', 'fuera_zona_v', 'Fuera de Zona'],
              ['sin_chalecos_l', 'sin_chalecos_v', 'Sin Chalecos'],
              ['con_balones_l', 'con_balones_v', 'Con Balones'],
              ['mas5_l', 'mas5_v', 'Más de 5 jugadores'],
            ].map(([cl, cv, label]) => (
              <div key={label} style={{ background: ROSA, border: `1.5px solid ${BORDO}`, borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: BORDO, marginBottom: 8, textTransform: 'uppercase' }}>{label}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <LVRojo label="L" checked={datos[cl]} onChange={set(cl)} />
                  <LVRojo label="V" checked={datos[cv]} onChange={set(cv)} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Campo de juego */}
        <div style={{ fontSize: 12, fontWeight: 700, color: BORDO, letterSpacing: .5, textTransform: 'uppercase' }}>
          Campo de juego
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[['arcos_obs', 'Arcos/Redes'], ['ilum_obs', 'Iluminación']].map(([c, l]) => (
            <CheckRojo key={c} label={l} checked={datos[c]} onChange={set(c)} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[['goteras', 'Goteras'], ['humedad', 'Humedad'], ['tribunas', 'Tribunas']].map(([c, l]) => (
            <CheckRojo key={c} label={l} checked={datos[c]} onChange={set(c)} />
          ))}
        </div>

        {/* Incidentes */}
        <div style={{ fontSize: 12, fontWeight: 700, color: BORDO, letterSpacing: .5, textTransform: 'uppercase' }}>
          Incidentes
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[['invasion', 'Invasión de Campo'], ['incidentes', 'Incidentes'], ['agresiones', 'Agresiones'], ['gresca', 'Gresca generalizada']].map(([c, l]) => (
            <CheckRojo key={c} label={l} checked={datos[c]} onChange={set(c)} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <CheckRojo label="Público Local" checked={datos.publico_l} onChange={set('publico_l')} />
          <CheckRojo label="Público Visita" checked={datos.publico_v} onChange={set('publico_v')} />
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: BORDO, letterSpacing: .5, textTransform: 'uppercase' }}>
          Observaciones
        </div>
        <Textarea variant="rosa" value={datos.obs_partido} onChange={set('obs_partido')} placeholder="Describí incidentes u observaciones del partido..." minHeight={100} />

      </div>
      <div style={{ padding: '8px 16px 24px', display: 'flex', gap: 10 }}>
        <BtnBack onClick={onBack} />
        <BtnNext onClick={onNext}>Siguiente: Acta Final</BtnNext>
      </div>
    </div>
  );
}
