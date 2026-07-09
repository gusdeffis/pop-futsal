import { Header, SeccionHeader, SeccionSub, CheckItem, LVChip, Textarea, Divider, BtnBack } from './UI';
import { generarActaTexto } from '../utils/acta';

const CONCL = [
  { id: 'normal', label: 'Partido Normal', color: '#0d1f4e' },
  { id: 'obs', label: 'Con Observaciones', color: '#0d1f4e' },
  { id: 'tdd', label: 'Informe al TDD', color: '#0d1f4e' },
  { id: 'susp', label: 'Suspensión', color: '#e03030' },
];

export default function Pantalla4({ datos, setDatos, onBack }) {
  const set = (campo) => (valor) => setDatos(d => ({ ...d, [campo]: valor }));
  const actaTexto = generarActaTexto(datos);

  const handleWhatsApp = () => {
    const texto =
      `*POP - Planilla Oficial de Partido Futsal*\n` +
      `Torneo: ${datos.torneo} | Fecha: ${datos.fecha_nro}\n` +
      `${datos.local} ${datos.res_local} - ${datos.res_visitante} ${datos.visitante}\n` +
      `Árbitro: ${datos.arbitro}\n` +
      `Oficial AFA: ${datos.oficial_afa}\n\n` +
      `*ACTA FINAL:* ${actaTexto}` +
      (datos.acta_extra ? `\n${datos.acta_extra}` : '');
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`);
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <Header paso={4} />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SeccionHeader>4. Observaciones durante el partido</SeccionHeader>

        <div>
          <SeccionSub>Mesa de cronometraje y servicios</SeccionSub>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[['tablero_fallas', 'Tablero con fallas'], ['sin_balon', 'Sin balón de back-up'], ['medico_obs', 'Médico'], ['policia', 'Policía']].map(([c, l]) => (
              <CheckItem key={c} label={l} checked={datos[c]} onChange={set(c)} rojo />
            ))}
          </div>
        </div>

        <Divider />

        <div>
          <SeccionSub>Calentamiento suplentes</SeccionSub>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['fuera_zona_l', 'fuera_zona_v', 'Fuera de Zona'],
              ['sin_chalecos_l', 'sin_chalecos_v', 'Sin Chalecos'],
              ['con_balones_l', 'con_balones_v', 'Con Balones'],
              ['mas5_l', 'mas5_v', 'Más de 5 jugadores'],
            ].map(([cl, cv, label]) => (
              <div key={label} style={{ background: '#f8f9fc', border: '1.5px solid #dde1ec', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#222', marginBottom: 8 }}>{label}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <LVChip label="Local" checked={datos[cl]} onChange={set(cl)} />
                  <LVChip label="Visita" checked={datos[cv]} onChange={set(cv)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <Divider />

        <div>
          <SeccionSub>Campo de juego</SeccionSub>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[['ilum_obs', 'Iluminación'], ['humedad', 'Humedad'], ['goteras', 'Goteras'], ['arcos_obs', 'Arcos/Redes'], ['tribunas', 'Tribunas']].map(([c, l]) => (
              <CheckItem key={c} label={l} checked={datos[c]} onChange={set(c)} rojo />
            ))}
          </div>
        </div>

        <Divider />

        <div>
          <SeccionSub>Incidentes</SeccionSub>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[['invasion', 'Invasión de Campo'], ['incidentes', 'Incidentes'], ['agresiones', 'Agresiones'], ['gresca', 'Gresca generalizada']].map(([c, l]) => (
              <CheckItem key={c} label={l} checked={datos[c]} onChange={set(c)} rojo />
            ))}
          </div>
          <div style={{ marginTop: 8, background: '#f8f9fc', border: '1.5px solid #dde1ec', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#222', marginBottom: 8 }}>Público</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <LVChip label="Local" checked={datos.publico_l} onChange={set('publico_l')} />
              <LVChip label="Visita" checked={datos.publico_v} onChange={set('publico_v')} />
            </div>
          </div>
        </div>

        <div>
          <SeccionSub>Observaciones sección 4</SeccionSub>
          <Textarea value={datos.obs_partido} onChange={set('obs_partido')} placeholder="Describí incidentes u observaciones del partido..." minHeight={100} />
        </div>

        <Divider />

        <div>
          <SeccionHeader>5. Conclusión general</SeccionHeader>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
            {CONCL.map(({ id, label, color }) => (
              <button key={id}
                onClick={() => set('conclusion')(datos.conclusion === id ? '' : id)}
                style={{
                  padding: '16px 10px', border: '2px solid',
                  borderColor: datos.conclusion === id ? color : '#dde1ec',
                  borderRadius: 8,
                  background: datos.conclusion === id ? color : '#f8f9fc',
                  color: datos.conclusion === id ? '#fff' : '#666',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', lineHeight: 1.3,
                  transition: 'all .15s',
                }}
              >{label}</button>
            ))}
          </div>
        </div>

        <Divider />

        <div>
          <SeccionHeader rojo>Acta Final</SeccionHeader>
          <div style={{ background: '#f5f7ff', border: '2px solid #0d1f4e', borderRadius: 10, padding: 16, marginTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#0d1f4e', letterSpacing: .8, textTransform: 'uppercase', marginBottom: 10 }}>
              Texto generado automáticamente
            </div>
            <div style={{ fontSize: 14, color: '#333', lineHeight: 1.6, minHeight: 50 }}>
              {actaTexto}
            </div>
            <textarea
              value={datos.acta_extra}
              onChange={e => set('acta_extra')(e.target.value)}
              placeholder="Agregá texto adicional si es necesario..."
              style={{ width: '100%', minHeight: 60, border: '1.5px solid #b8c4e8', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#222', background: '#fff', resize: 'vertical', fontFamily: 'inherit', outline: 'none', marginTop: 10, boxSizing: 'border-box' }}
            />
          </div>
        </div>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <BtnBack onClick={onBack} />
          <button onClick={() => alert('Generación de PDF próximamente')} style={{ flex: 1, height: 52, background: '#0d1f4e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            Generar PDF oficial
          </button>
        </div>
        <button onClick={handleWhatsApp} style={{ width: '100%', height: 52, background: '#25d366', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          Compartir por WhatsApp
        </button>
      </div>
    </div>
  );
}
