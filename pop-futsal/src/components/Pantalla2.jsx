import { Header, SeccionHeader, CheckAzul, Textarea, BtnNext, BtnBack } from './UI';

function CampoDemora({ label, okKey, demLKey, demVKey, datos, set }) {
  const checked = datos[okKey];
  const txtColor = checked ? '#fff' : '#0d1f4e';
  return (
    <div style={{
      background: checked ? '#0d1f4e' : '#c6dbf5',
      border: '1.5px solid #0d1f4e',
      borderRadius: 8, padding: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 10 }}
        onClick={() => set(okKey)(!checked)}>
        <div style={{ width: 22, height: 22, borderRadius: 4, flexShrink: 0, background: checked ? '#c6dbf5' : '#fff', border: `2px solid ${checked ? '#c6dbf5' : '#0d1f4e'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {checked && <span style={{ color: '#0d1f4e', fontSize: 14, fontWeight: 700 }}>✓</span>}
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: txtColor, textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, background: '#e03030', color: '#fff', fontWeight: 700, padding: '3px 7px', borderRadius: 5, letterSpacing: .3, textTransform: 'uppercase' }}>Demora</span>
        <span style={{ fontSize: 11, color: txtColor, fontWeight: 700 }}>LOCAL</span>
        <input type="number" value={datos[demLKey]} onChange={e => set(demLKey)(e.target.value)}
          placeholder="0" style={{ width: 46, height: 34, border: '1.5px solid #0d1f4e', borderRadius: 6, textAlign: 'center', fontSize: 14, background: '#c6dbf5', color: '#0d1f4e', fontWeight: 600, outline: 'none' }} />
        <span style={{ fontSize: 11, color: txtColor, fontWeight: 600 }}>min.</span>
        <span style={{ fontSize: 11, color: txtColor, fontWeight: 700, marginLeft: 4 }}>VISITA</span>
        <input type="number" value={datos[demVKey]} onChange={e => set(demVKey)(e.target.value)}
          placeholder="0" style={{ width: 46, height: 34, border: '1.5px solid #0d1f4e', borderRadius: 6, textAlign: 'center', fontSize: 14, background: '#c6dbf5', color: '#0d1f4e', fontWeight: 600, outline: 'none' }} />
        <span style={{ fontSize: 11, color: txtColor, fontWeight: 600 }}>min.</span>
      </div>
    </div>
  );
}

const INSTALACIONES_1 = [
  ['buen_estado', 'Campo en buen estado'], ['ilum', 'Iluminación'],
  ['mesa_crono', 'Mesa Crono'], ['tablero', 'Tablero'],
  ['redes_per', 'Redes Perimetrales'], ['altura', 'Altura min. 5 mts'],
  ['pared_prot', 'Pared con Protecciones'], ['meta_anclada', 'Meta Sin Anclar'],
];
const INSTALACIONES_2 = [['banios', 'Baños Públicos'], ['limpieza', 'Limpieza']];
const INSTALACIONES_3 = [['camiseta', 'Camiseta c/Apellido'], ['balon_nuevo', 'Balón Nuevo']];

// Fila de checkbox tipo "Vestuarios: LOCAL / VISITA / ÁRBITRO" o "Del. Veedor: LOCAL / VISITA"
function CheckVest({ label, campo, datos, set }) {
  const checked = datos[campo];
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: checked ? '#0d1f4e' : '#c6dbf5', border: '1.5px solid #0d1f4e', borderRadius: 8, padding: '12px 10px', cursor: 'pointer' }}
      onClick={() => set(campo)(!checked)}>
      <div style={{ width: 22, height: 22, borderRadius: 4, background: checked ? '#c6dbf5' : '#fff', border: `2px solid ${checked ? '#c6dbf5' : '#0d1f4e'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {checked && <span style={{ color: '#0d1f4e', fontSize: 14, fontWeight: 700 }}>✓</span>}
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: checked ? '#fff' : '#0d1f4e', textTransform: 'uppercase' }}>{label}</span>
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

        <div style={{ fontSize: 11, fontWeight: 700, color: '#0d1f4e', letterSpacing: .5, textTransform: 'uppercase' }}>
          Instalaciones y seguridad — marcar si está en condiciones
        </div>

        {/* Fila 1-2: instalaciones básicas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {INSTALACIONES_1.map(([campo, label]) => (
            <CheckAzul key={campo} label={label} checked={datos[campo]} onChange={set(campo)} />
          ))}
        </div>

        {/* Vestuarios: entre Pared con Protecciones y Baños Públicos */}
        <div style={{ display: 'flex', gap: 8 }}>
          <CheckVest label="Vestuario Local" campo="vest_l" datos={datos} set={set} />
          <CheckVest label="Vestuario Visita" campo="vest_v" datos={datos} set={set} />
          <CheckVest label="Vestuario Árbitro" campo="vest_arb" datos={datos} set={set} />
        </div>

        {/* Baños Públicos + Limpieza */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {INSTALACIONES_2.map(([campo, label]) => (
            <CheckAzul key={campo} label={label} checked={datos[campo]} onChange={set(campo)} />
          ))}
        </div>

        {/* Del. Veedor: entre Baños Públicos y Camiseta c/Apellido */}
        <div style={{ display: 'flex', gap: 8 }}>
          <CheckVest label="Del. Veedor Local" campo="del_veedor_l" datos={datos} set={set} />
          <CheckVest label="Del. Veedor Visita" campo="del_veedor_v" datos={datos} set={set} />
        </div>

        {/* Camiseta + Balón Nuevo */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {INSTALACIONES_3.map(([campo, label]) => (
            <CheckAzul key={campo} label={label} checked={datos[campo]} onChange={set(campo)} />
          ))}
        </div>

        {/* Seguridad y Médico */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <CheckAzul label="Seguridad / Policía" checked={datos.seguridad} onChange={set('seguridad')} />
          <CheckAzul label="Médico" checked={datos.medico} onChange={set('medico')} />
        </div>

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
