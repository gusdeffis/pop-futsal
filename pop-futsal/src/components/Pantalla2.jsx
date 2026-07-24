import { useEffect, useState } from 'react';
import { Header, SeccionHeader, CheckAzul, HoraInput, Textarea, PanelCompletarObs, BtnNext, BtnBack } from './UI';

// Minutos de demora = diferencia entre la hora programada del partido y la
// hora real de llegada. Si llegó a horario o antes, la demora es 0.
function calcularDemora(horaProgramada, horaLlegada) {
  if (!horaProgramada || !horaLlegada || !horaProgramada.includes(':') || !horaLlegada.includes(':')) return '';
  const [h1, m1] = horaProgramada.split(':').map(Number);
  const [h2, m2] = horaLlegada.split(':').map(Number);
  if ([h1, m1, h2, m2].some(Number.isNaN)) return '';
  let mins = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (mins < 0) mins = 0;
  return String(mins);
}

// Bloque de 3 columnas: Hora Local | Hora Visita | Demora (calculada), mismo
// ancho/alto que Formación Local/Visita/Ingreso de la Pantalla 3.
function BloqueControlHorario({ titulo, horaLKey, horaVKey, demLKey, demVKey, okKey, datos, set }) {
  useEffect(() => {
    const demL = calcularDemora(datos.hora, datos[horaLKey]);
    const demV = calcularDemora(datos.hora, datos[horaVKey]);
    if (demL !== datos[demLKey]) set(demLKey)(demL);
    if (demV !== datos[demVKey]) set(demVKey)(demV);
    const ok = Number(demL) <= 1 && Number(demV) <= 1 && datos[horaLKey] && datos[horaVKey];
    if (!!ok !== datos[okKey]) set(okKey)(!!ok);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos[horaLKey], datos[horaVKey], datos.hora]);

  const demL = datos[demLKey];
  const demV = datos[demVKey];

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#0d1f4e', textTransform: 'uppercase', letterSpacing: .3, marginBottom: 6 }}>{titulo}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <HoraInput label={`${titulo.split(' ')[0]} Local`} value={datos[horaLKey]} onChange={set(horaLKey)} />
        <HoraInput label={`${titulo.split(' ')[0]} Visita`} value={datos[horaVKey]} onChange={set(horaVKey)} />
        <div style={{ background: '#c6dbf5', border: '1.5px solid #0d1f4e', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
          <span style={{ fontSize: 10, background: '#e03030', color: '#fff', fontWeight: 700, padding: '3px 7px', borderRadius: 5, letterSpacing: .3, textTransform: 'uppercase', alignSelf: 'flex-start' }}>Demora</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#0d1f4e' }}>LOCAL</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: Number(demL) > 1 ? '#e03030' : '#0d1f4e' }}>{demL || '—'}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#0d1f4e' }}>min.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#0d1f4e' }}>VISITA</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: Number(demV) > 1 ? '#e03030' : '#0d1f4e' }}>{demV || '—'}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#0d1f4e' }}>min.</span>
          </div>
        </div>
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

// Todos los ítems de instalaciones/servicios de esta pantalla, para armar el
// texto de observaciones a partir de lo que falta marcar.
const TODOS_LOS_ITEMS = [
  ...INSTALACIONES_1, ...INSTALACIONES_2, ...INSTALACIONES_3,
  ['vest_l', 'Vestuario Local'], ['vest_v', 'Vestuario Visita'], ['vest_arb', 'Vestuario Árbitro'],
  ['del_veedor_l', 'Del. Veedor Local'], ['del_veedor_v', 'Del. Veedor Visita'],
  ['seguridad', 'Seguridad / Policía'], ['medico', 'Médico'],
];

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
  const [panelAbierto, setPanelAbierto] = useState(false);

  const faltantes = TODOS_LOS_ITEMS.filter(([campo]) => !datos[campo]);

  const handleSiguiente = () => {
    if (faltantes.length > 0) {
      const ok = window.confirm(`Hay ${faltantes.length} instalación(es) sin marcar. ¿Querés revisarlas ahora, o continuar igual?\n\nOK = revisar ahora\nCancelar = continuar igual`);
      if (ok) { setPanelAbierto(true); return; }
    }
    onNext();
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <Header paso={2} />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

        <SeccionHeader>2. Control previo al partido</SeccionHeader>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <BloqueControlHorario titulo="Planillas y Credenciales" horaLKey="plan_cred_hora_l" horaVKey="plan_cred_hora_v" demLKey="plan_cred_dem_l" demVKey="plan_cred_dem_v" okKey="plan_cred_ok" datos={datos} set={set} />
          <BloqueControlHorario titulo="Formación Inicial" horaLKey="form_ini_hora_l" horaVKey="form_ini_hora_v" demLKey="form_ini_dem_l" demVKey="form_ini_dem_v" okKey="form_ini_ok" datos={datos} set={set} />
        </div>

        <SeccionHeader>Instalaciones y Seguridad</SeccionHeader>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#0d1f4e', letterSpacing: .5, textTransform: 'uppercase' }}>
          Marcar si está en condiciones
        </div>

        {/* Fila 1-2: instalaciones básicas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {INSTALACIONES_1.map(([campo, label]) => (
            <CheckAzul key={campo} label={label} checked={datos[campo]} onChange={set(campo)} />
          ))}
        </div>

        {/* Vestuarios: entre Pared con Protecciones y Baños Públicos */}
        <div style={{ display: 'flex', gap: 8 }}>
          <CheckVest label="Vest. Local" campo="vest_l" datos={datos} set={set} />
          <CheckVest label="Vest. Visita" campo="vest_v" datos={datos} set={set} />
          <CheckVest label="Vest. Árb." campo="vest_arb" datos={datos} set={set} />
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

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0d1f4e', letterSpacing: .5, textTransform: 'uppercase' }}>Observaciones</div>
          {!panelAbierto && (
            <button onClick={() => setPanelAbierto(true)} style={{ background: '#fff', color: '#0d1f4e', border: '1.5px solid #0d1f4e', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              Observación por Control
            </button>
          )}
        </div>
        {panelAbierto && (
          <PanelCompletarObs items={faltantes} datos={datos} set={set} obsField="obs_previo" onCerrar={() => setPanelAbierto(false)} />
        )}
        <Textarea value={datos.obs_previo} onChange={set('obs_previo')} placeholder="Observaciones sobre el control previo..." />

      </div>
      <div style={{ padding: '8px 16px 24px', display: 'flex', gap: 10 }}>
        <BtnBack onClick={onBack} />
        <BtnNext onClick={handleSiguiente}>Siguiente: Horarios</BtnNext>
      </div>
    </div>
  );
}
