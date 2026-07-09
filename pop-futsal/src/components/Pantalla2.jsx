import { Header, SeccionHeader, SeccionSub, CheckItem, Textarea, Divider, BtnNext, BtnBack } from './UI';

const INSTALACIONES = [
  ['buen_estado', 'Campo en buen estado'], ['ilum', 'Iluminación'],
  ['mesa_crono', 'Mesa Crono'], ['tablero', 'Tablero'],
  ['redes_per', 'Redes Perimetrales'], ['altura', 'Altura min. 5 mts'],
  ['pared_prot', 'Pared con Protecciones'], ['meta_anclada', 'Meta Sin Anclar'],
  ['banios', 'Baños Públicos'], ['limpieza', 'Limpieza'],
  ['camiseta', 'Camiseta c/Apellido'], ['balon_nuevo', 'Balón Nuevo'],
];

function CampoDemora({ label, okKey, demLKey, demVKey, datos, set }) {
  return (
    <div style={{ background: '#f8f9fc', border: `1.5px solid ${datos[okKey] ? '#0d1f4e' : '#dde1ec'}`, borderRadius: 8, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 10 }}
        onClick={() => set(okKey)(!datos[okKey])}>
        <div style={{ width: 22, height: 22, borderRadius: 4, flexShrink: 0, background: datos[okKey] ? '#0d1f4e' : 'transparent', border: `2px solid ${datos[okKey] ? '#0d1f4e' : '#bbb'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {datos[okKey] && <span style={{ color: '#fff', fontSize: 14 }}>✓</span>}
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#222' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10, color: '#e03030', fontWeight: 700 }}>DEMORA</span>
        <span style={{ fontSize: 12, color: '#666' }}>L</span>
        <input type="number" value={datos[demLKey]} onChange={e => set(demLKey)(e.target.value)}
          placeholder="min" style={{ width: 54, height: 36, border: '1.5px solid #dde1ec', borderRadius: 6, textAlign: 'center', fontSize: 14, background: '#fff', outline: 'none' }} />
        <span style={{ fontSize: 12, color: '#666' }}>V</span>
        <input type="number" value={datos[demVKey]} onChange={e => set(demVKey)(e.target.value)}
          placeholder="min" style={{ width: 54, height: 36, border: '1.5px solid #dde1ec', borderRadius: 6, textAlign: 'center', fontSize: 14, background: '#fff', outline: 'none' }} />
      </div>
    </div>
  );
}

export default function Pantalla2({ datos, setDatos, onNext, onBack }) {
  const set = (campo) => (valor) => setDatos(d => ({ ...d, [campo]: valor }));

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <Header paso={2} />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SeccionHeader>2. Control previo al partido</SeccionHeader>

        <div>
          <SeccionSub>Documentación y planillas en término</SeccionSub>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <CampoDemora label="Planillas y Credenciales" okKey="plan_cred_ok" demLKey="plan_cred_dem_l" demVKey="plan_cred_dem_v" datos={datos} set={set} />
            <CampoDemora label="Formación Inicial (Planilla TV)" okKey="form_ini_ok" demLKey="form_ini_dem_l" demVKey="form_ini_dem_v" datos={datos} set={set} />
          </div>
        </div>

        <Divider />

        <div>
          <SeccionSub>Instalaciones y seguridad — marcar si está en condiciones</SeccionSub>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {INSTALACIONES.map(([campo, label]) => (
              <CheckItem key={campo} label={label} checked={datos[campo]} onChange={set(campo)} />
            ))}
          </div>
        </div>

        <Divider />

        <div>
          <SeccionSub>Vestuarios</SeccionSub>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['vest_l', 'Local'], ['vest_v', 'Visita'], ['vest_arb', 'Árbitros']].map(([campo, label]) => (
              <div key={campo} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: datos[campo] ? '#eef1fa' : '#f8f9fc', border: `1.5px solid ${datos[campo] ? '#0d1f4e' : '#dde1ec'}`, borderRadius: 8, padding: '12px 10px', cursor: 'pointer' }}
                onClick={() => set(campo)(!datos[campo])}>
                <div style={{ width: 22, height: 22, borderRadius: 4, background: datos[campo] ? '#0d1f4e' : 'transparent', border: `2px solid ${datos[campo] ? '#0d1f4e' : '#bbb'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {datos[campo] && <span style={{ color: '#fff', fontSize: 14 }}>✓</span>}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: datos[campo] ? '#0d1f4e' : '#666' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <Divider />

        <div>
          <SeccionSub>Del. Veedor y servicios</SeccionSub>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <CheckItem label="Del. Veedor L" checked={datos.del_veedor_l} onChange={set('del_veedor_l')} />
            <CheckItem label="Del. Veedor V" checked={datos.del_veedor_v} onChange={set('del_veedor_v')} />
            <CheckItem label="Seguridad / Policía" checked={datos.seguridad} onChange={set('seguridad')} />
            <CheckItem label="Médico" checked={datos.medico} onChange={set('medico')} />
          </div>
        </div>

        <Divider />

        <div>
          <SeccionSub>Observaciones</SeccionSub>
          <Textarea value={datos.obs_previo} onChange={set('obs_previo')} placeholder="Observaciones sobre el control previo..." />
        </div>
      </div>

      <div style={{ padding: '8px 16px 24px', display: 'flex', gap: 10 }}>
        <BtnBack onClick={onBack} />
        <BtnNext onClick={onNext}>Siguiente: Horarios</BtnNext>
      </div>
    </div>
  );
}
