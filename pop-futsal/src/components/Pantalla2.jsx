import { Header, SeccionHeader, CheckAzul, Textarea, Divider, BtnNext, BtnBack } from './UI';

const INSTALACIONES = [
  ['buen_estado', 'Campo en buen estado'], ['ilum', 'Iluminación'],
  ['mesa_crono', 'Mesa Crono'], ['tablero', 'Tablero'],
  ['redes_per', 'Redes Perimetrales'], ['altura', 'Altura min. 5 mts'],
  ['pared_prot', 'Pared con Protecciones'], ['meta_anclada', 'Meta Sin Anclar'],
  ['banios', 'Baños Públicos'], ['limpieza', 'Limpieza'],
  ['camiseta', 'Camiseta c/Apellido'], ['balon_nuevo', 'Balón Nuevo'],
];

function CampoDemora({ label, okKey, demLKey, demVKey, datos, set }) {
  const checked = datos[okKey];
  return (
    <div style={{
      background: checked ? '#e8edf8' : '#fff',
      border: `1.5px solid ${checked ? '#0d1f4e' : '#b8c8e8'}`,
      borderRadius: 8, padding: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 10 }}
        onClick={() => set(okKey)(!checked)}>
        <div style={{ width: 22, height: 22, borderRadius: 4, flexShrink: 0, background: checked ? '#0d1f4e' : '#e8edf8', border: `2px solid ${checked ? '#0d1f4e' : '#b8c8e8'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {checked && <span style={{ color: '#fff', fontSize: 14 }}>✓</span>}
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#0d1f4e' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10, color: '#e03030', fontWeight: 700 }}>DEMORA</span>
        <span style={{ fontSize: 12, color: '#0d1f4e', fontWeight: 600 }}>L</span>
        <input type="number" value={datos[demLKey]} onChange={e => set(demLKey)(e.target.value)}
          placeholder="min" style={{ width: 54, height: 36, border: '1.5px solid #b8c8e8', borderRadius: 6, textAlign: 'center', fontSize: 14, background: '#e8edf8', color: '#0d1f4e', fontWeight: 600, outline: 'none' }} />
        <span style={{ fontSize: 12, color: '#0d1f4e', fontWeight: 600 }}>V</span>
        <input type="number" value={datos[demVKey]} onChange={e => set(demVKey)(e.target.value)}
          placeholder="min" style={{ width: 54, height: 36, border: '1.5px solid #b8c8e8', borderRadius: 6, textAlign: 'center', fontSize: 14, background: '#e8edf8', color: '#0d1f4e', fontWeight: 600, outline: 'none' }} />
      </div>
    </div>
  );
}

function CheckVest({ label, campo, datos, set }) {
  const checked = datos[campo];
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: checked ? '#e8edf8' : '#fff', border: `1.5px solid ${checked ? '#0d1f4e' : '#b8c8e8'}`, borderRadius: 8, padding: '12px 10px', cursor: 'pointer' }}
      onClick={() => set(campo)(!checked)}>
      <div style={{ width: 22, height: 22, borderRadius: 4, background: checked ? '#0d1f4e' : '#e8edf8', border: `2px solid ${checked ? '#0d1f4e' : '#b8c8e8'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {checked && <span style={{ color: '#fff', fontSize: 14 }}>✓</span>}
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#0d1f4e' }}>{label}</span>
    </div>
  );
}

export default function Pantalla2({ datos, setDatos, onNext, onBack }) {
  const set = (campo) => (valor) => setDatos(d => ({ ...d, [campo]: valor }));

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <Header paso={2} />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

        <SeccionHeader>2. Control previo al partido</SeccionHeader>

        <div style={{ fontSize: 11, fontWeight: 700, color: '#0d1f4e', letterSpacing: .5, textTransform: 'uppercase' }}>
          Documentación y planillas en término
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <CampoDemora label="Planillas y Credenciales" okKey="plan_cred_ok" demLKey="plan_cred_dem_l" demVKey="plan_cred_dem_v" datos={datos} set={set} />
          <CampoDemora label="Formación Inicial (Planilla TV)" okKey="form_ini_ok" demLKey="form_ini_dem_l" demVKey="form_ini_dem_v" datos={datos} set={set} />
        </div>

        <Divider />

        <div style={{ fontSize: 11, fontWeight: 700, color: '#0d1f4e', letterSpacing: .5, textTransform: 'uppercase' }}>
          Instalaciones y seguridad — marcar si está en condiciones
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {INSTALACIONES.map(([campo, label]) => (
            <CheckAzul key={campo} label={label} checked={datos[campo]} onChange={set(campo)} />
          ))}
        </div>

        <Divider />

        <div style={{ fontSize: 11, fontWeight: 700, color: '#0d1f4e', letterSpacing: .5, textTransform: 'uppercase' }}>Vestuarios</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <CheckVest label="Vestuario Local" campo="vest_l" datos={datos} set={set} />
          <CheckVest label="Vestuario Visita" campo="vest_v" datos={datos} set={set} />
          <CheckVest label="Vestuario Árbitro" campo="vest_arb" datos={datos} set={set} />
        </div>

        <Divider />

        <div style={{ fontSize: 11, fontWeight: 700, color: '#0d1f4e', letterSpacing: .5, textTransform: 'uppercase' }}>Del. Veedor y servicios</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <CheckAzul label="Del. Veedor Local" checked={datos.del_veedor_l} onChange={set('del_veedor_l')} />
          <CheckAzul label="Del. Veedor Visita" checked={datos.del_veedor_v} onChange={set('del_veedor_v')} />
          <CheckAzul label="Seguridad / Policía" checked={datos.seguridad} onChange={set('seguridad')} />
          <CheckAzul label="Médico" checked={datos.medico} onChange={set('medico')} />
        </div>

        <Divider />

        <div style={{ fontSize: 11, fontWeight: 700, color: '#0d1f4e', letterSpacing: .5, textTransform: 'uppercase' }}>Observaciones</div>
        <Textarea value={datos.obs_previo} onChange={set('obs_previo')} placeholder="Observaciones sobre el control previo..." />

      </div>
      <div style={{ padding: '8px 16px 24px', display: 'flex', gap: 10 }}>
        <BtnBack onClick={onBack} />
        <BtnNext onClick={onNext}>Siguiente: Horarios</BtnNext>
      </div>
    </div>
  );
}
